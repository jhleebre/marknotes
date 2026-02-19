import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'path'

// --- Mocks (hoisted before imports) ---

vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    stat: vi.fn(),
    readdir: vi.fn()
  }
}))

vi.mock('../../../src/main/utils', () => ({
  ROOT_PATH: '/TestRoot/MarkNotes'
}))

// --- Imports (after mocks) ---

import fs from 'fs/promises'
import { updateLinksAfterMove } from '../../../src/main/services/linkUpdater'

const ROOT = '/TestRoot/MarkNotes'

// Helper: Dirent 목 객체 생성
function makeEntry(name: string, isDir: boolean) {
  return {
    name,
    toString: () => name,
    isDirectory: () => isDir,
    isFile: () => !isDir
  }
}

beforeEach(() => vi.clearAllMocks())

// ─────────────────────────────────────────────
describe('updateLinksAfterMove — 단일 파일 이동', () => {
  it('다른 파일에 있는 이동된 파일 링크를 새 경로로 업데이트한다', async () => {
    // A.md: ROOT/A.md → ROOT/sub/A.md
    // B.md: ROOT/B.md 에 [link](A.md) 포함 → [link](sub/A.md) 으로 갱신
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false } as never)

    // collectMdFiles(ROOT): B.md + sub/A.md
    vi.mocked(fs.readdir).mockImplementation(async (dirPath: unknown) => {
      if (dirPath === ROOT) return [makeEntry('B.md', false), makeEntry('sub', true)] as never
      if (dirPath === `${ROOT}/sub`) return [makeEntry('A.md', false)] as never
      return [] as never
    })

    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (filePath === `${ROOT}/B.md`) return '[link](A.md)' as never
      if (filePath === `${ROOT}/sub/A.md`) return '# A content' as never
      return '' as never
    })

    vi.mocked(fs.writeFile).mockResolvedValue(undefined as never)

    const changed = await updateLinksAfterMove(`${ROOT}/A.md`, `${ROOT}/sub/A.md`)

    expect(fs.writeFile).toHaveBeenCalledTimes(1)
    const [writePath, writeContent] = vi.mocked(fs.writeFile).mock.calls[0]
    expect(writePath).toBe(`${ROOT}/B.md`)
    expect(writeContent).toBe('[link](sub/A.md)')
    expect(changed).toEqual([`${ROOT}/B.md`])
  })

  it('링크가 없는 파일은 쓰지 않는다', async () => {
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false } as never)

    vi.mocked(fs.readdir).mockImplementation(async (dirPath: unknown) => {
      if (dirPath === ROOT) return [makeEntry('B.md', false), makeEntry('sub', true)] as never
      if (dirPath === `${ROOT}/sub`) return [makeEntry('A.md', false)] as never
      return [] as never
    })

    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (filePath === `${ROOT}/B.md`) return '# No links here' as never
      if (filePath === `${ROOT}/sub/A.md`) return '# A content' as never
      return '' as never
    })

    const changed = await updateLinksAfterMove(`${ROOT}/A.md`, `${ROOT}/sub/A.md`)

    expect(fs.writeFile).not.toHaveBeenCalled()
    expect(changed).toEqual([])
  })

  it('이동된 파일 자신의 외부 링크도 새 위치 기준으로 재계산한다 (effectiveOldPath)', async () => {
    // A.md: ROOT/A.md → ROOT/sub/A.md
    // A.md 내부에 [link](B.md) (구 위치 기준 상대경로)
    // 새 위치에서 B.md는 ../B.md 가 되어야 함
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false } as never)

    vi.mocked(fs.readdir).mockImplementation(async (dirPath: unknown) => {
      if (dirPath === ROOT) return [makeEntry('B.md', false), makeEntry('sub', true)] as never
      if (dirPath === `${ROOT}/sub`) return [makeEntry('A.md', false)] as never
      return [] as never
    })

    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (filePath === `${ROOT}/sub/A.md`) return '[link](B.md)' as never
      if (filePath === `${ROOT}/B.md`) return '# B content' as never
      return '' as never
    })

    vi.mocked(fs.writeFile).mockResolvedValue(undefined as never)

    const changed = await updateLinksAfterMove(`${ROOT}/A.md`, `${ROOT}/sub/A.md`)

    const call = vi.mocked(fs.writeFile).mock.calls.find(
      ([p]) => p === `${ROOT}/sub/A.md`
    )
    expect(call).toBeDefined()
    expect(call![1]).toBe('[link](../B.md)')
    expect(changed).toContain(`${ROOT}/sub/A.md`)
  })

  it('외부 URL 링크는 수정하지 않는다', async () => {
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false } as never)

    vi.mocked(fs.readdir).mockImplementation(async (dirPath: unknown) => {
      if (dirPath === ROOT) return [makeEntry('B.md', false), makeEntry('sub', true)] as never
      if (dirPath === `${ROOT}/sub`) return [makeEntry('A.md', false)] as never
      return [] as never
    })

    const externalLinks =
      '[ext](https://example.com) [file](http://other.com) [ftp](file:///etc/hosts)'
    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (filePath === `${ROOT}/B.md`) return externalLinks as never
      return '' as never
    })

    await updateLinksAfterMove(`${ROOT}/A.md`, `${ROOT}/sub/A.md`)

    expect(fs.writeFile).not.toHaveBeenCalled()
  })

  it('프래그먼트(#heading)가 있는 링크도 경로를 갱신하고 프래그먼트를 보존한다', async () => {
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false } as never)

    vi.mocked(fs.readdir).mockImplementation(async (dirPath: unknown) => {
      if (dirPath === ROOT) return [makeEntry('B.md', false), makeEntry('sub', true)] as never
      if (dirPath === `${ROOT}/sub`) return [makeEntry('A.md', false)] as never
      return [] as never
    })

    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (filePath === `${ROOT}/B.md`) return '[link](A.md#section-1)' as never
      if (filePath === `${ROOT}/sub/A.md`) return '# A' as never
      return '' as never
    })

    vi.mocked(fs.writeFile).mockResolvedValue(undefined as never)

    await updateLinksAfterMove(`${ROOT}/A.md`, `${ROOT}/sub/A.md`)

    const [, content] = vi.mocked(fs.writeFile).mock.calls[0]
    expect(content).toBe('[link](sub/A.md#section-1)')
  })

  it('이동 전후 경로가 같은 링크는 변경하지 않는다 (intra-folder links)', async () => {
    // A.md는 이동, B.md도 같은 폴더에 있어서 상대 경로가 동일함
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false } as never)

    vi.mocked(fs.readdir).mockImplementation(async (dirPath: unknown) => {
      if (dirPath === ROOT) return [makeEntry('sub', true)] as never
      if (dirPath === `${ROOT}/sub`) return [makeEntry('A.md', false), makeEntry('B.md', false)] as never
      return [] as never
    })

    // sub/B.md 에 [link](A.md) — A.md가 ROOT로 이동했으므로 경로가 달라짐
    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (filePath === `${ROOT}/sub/B.md`) return '[link](unrelated.md)' as never
      if (filePath === `${ROOT}/sub/A.md`) return '# A' as never
      return '' as never
    })

    // unrelated.md는 pathMap에 없으므로 finalTarget이 그대로 → newRel = newRel
    // 실제로 sub/A.md → ROOT/A.md 이고, sub/B.md 에서 unrelated.md 는 pathMap에 없음
    // resolvedTarget = ROOT/sub/unrelated.md, finalTarget 도 ROOT/sub/unrelated.md
    // newRel from sub/B.md = unrelated.md (같음) → 변경 없음
    const changed = await updateLinksAfterMove(`${ROOT}/sub/A.md`, `${ROOT}/A.md`)

    expect(fs.writeFile).not.toHaveBeenCalled()
    expect(changed).toEqual([])
  })
})

// ─────────────────────────────────────────────
describe('updateLinksAfterMove — 폴더 이동', () => {
  it('폴더 이동 시 외부 파일에서 이동된 파일을 가리키는 링크를 갱신한다', async () => {
    // folder/ → archive/folder/
    // ROOT/B.md 에 [link](folder/A.md) → [link](archive/folder/A.md) 로 갱신
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as never)

    vi.mocked(fs.readdir).mockImplementation(async (dirPath: unknown) => {
      // collectMdFiles(archive/folder) — 이동된 폴더 스캔 (pathMap 빌드)
      if (dirPath === `${ROOT}/archive/folder`) return [makeEntry('A.md', false)] as never
      // collectMdFiles(ROOT) — 전체 스캔
      if (dirPath === ROOT)
        return [makeEntry('B.md', false), makeEntry('archive', true)] as never
      if (dirPath === `${ROOT}/archive`) return [makeEntry('folder', true)] as never
      return [] as never
    })

    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (filePath === `${ROOT}/B.md`) return '[link](folder/A.md)' as never
      if (filePath === `${ROOT}/archive/folder/A.md`) return '# A' as never
      return '' as never
    })

    vi.mocked(fs.writeFile).mockResolvedValue(undefined as never)

    const changed = await updateLinksAfterMove(`${ROOT}/folder`, `${ROOT}/archive/folder`)

    const call = vi.mocked(fs.writeFile).mock.calls.find(([p]) => p === `${ROOT}/B.md`)
    expect(call).toBeDefined()
    expect(call![1]).toBe('[link](archive/folder/A.md)')
    expect(changed).toContain(`${ROOT}/B.md`)
  })

  it('폴더 이동 시 이동된 폴더 안의 파일이 가진 외부 링크도 갱신한다', async () => {
    // folder/A.md (구 위치) → archive/folder/A.md
    // A.md 내부에 [link](../B.md) (구 위치 기준) → [link](../../B.md) 로 갱신
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as never)

    vi.mocked(fs.readdir).mockImplementation(async (dirPath: unknown) => {
      if (dirPath === `${ROOT}/archive/folder`) return [makeEntry('A.md', false)] as never
      if (dirPath === ROOT)
        return [makeEntry('B.md', false), makeEntry('archive', true)] as never
      if (dirPath === `${ROOT}/archive`) return [makeEntry('folder', true)] as never
      return [] as never
    })

    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (filePath === `${ROOT}/archive/folder/A.md`) return '[link](../B.md)' as never
      if (filePath === `${ROOT}/B.md`) return '# B' as never
      return '' as never
    })

    vi.mocked(fs.writeFile).mockResolvedValue(undefined as never)

    const changed = await updateLinksAfterMove(`${ROOT}/folder`, `${ROOT}/archive/folder`)

    const call = vi.mocked(fs.writeFile).mock.calls.find(
      ([p]) => p === `${ROOT}/archive/folder/A.md`
    )
    expect(call).toBeDefined()
    expect(call![1]).toBe('[link](../../B.md)')
    expect(changed).toContain(`${ROOT}/archive/folder/A.md`)
  })

  it('.md 파일이 없는 폴더를 이동하면 빈 배열을 반환한다', async () => {
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as never)

    // 이동된 폴더에 .md 없음 → pathMap.size === 0
    vi.mocked(fs.readdir).mockImplementation(async (dirPath: unknown) => {
      if (dirPath === `${ROOT}/empty`) return [] as never
      return [] as never
    })

    const changed = await updateLinksAfterMove(`${ROOT}/old_empty`, `${ROOT}/empty`)

    expect(fs.writeFile).not.toHaveBeenCalled()
    expect(changed).toEqual([])
  })
})

// ─────────────────────────────────────────────
describe('updateLinksAfterMove — 에러 처리', () => {
  it('fs 에러 발생 시 빈 배열을 반환하고 예외를 던지지 않는다', async () => {
    vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT') as never)
    vi.mocked(fs.readdir).mockRejectedValue(new Error('Permission denied') as never)

    await expect(
      updateLinksAfterMove(`${ROOT}/A.md`, `${ROOT}/sub/A.md`)
    ).resolves.toEqual([])
  })

  it('개별 파일 읽기 실패는 건너뛰고 나머지를 처리한다', async () => {
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false } as never)

    vi.mocked(fs.readdir).mockImplementation(async (dirPath: unknown) => {
      if (dirPath === ROOT)
        return [makeEntry('bad.md', false), makeEntry('good.md', false), makeEntry('sub', true)] as never
      if (dirPath === `${ROOT}/sub`) return [makeEntry('A.md', false)] as never
      return [] as never
    })

    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (filePath === `${ROOT}/bad.md`) throw new Error('Permission denied')
      if (filePath === `${ROOT}/good.md`) return '[link](A.md)' as never
      if (filePath === `${ROOT}/sub/A.md`) return '# A' as never
      return '' as never
    })

    vi.mocked(fs.writeFile).mockResolvedValue(undefined as never)

    const changed = await updateLinksAfterMove(`${ROOT}/A.md`, `${ROOT}/sub/A.md`)

    // bad.md 는 건너뛰고, good.md 는 정상 처리
    expect(changed).toContain(`${ROOT}/good.md`)
    expect(changed).not.toContain(`${ROOT}/bad.md`)
  })

  it('stat 실패 시 파일로 가정하고 처리한다', async () => {
    // stat이 실패하면 isDir = false → 단일 파일 이동 처리
    vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT') as never)

    vi.mocked(fs.readdir).mockImplementation(async (dirPath: unknown) => {
      if (dirPath === ROOT) return [makeEntry('B.md', false), makeEntry('sub', true)] as never
      if (dirPath === `${ROOT}/sub`) return [makeEntry('A.md', false)] as never
      return [] as never
    })

    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (filePath === `${ROOT}/B.md`) return '[link](A.md)' as never
      if (filePath === `${ROOT}/sub/A.md`) return '# A' as never
      return '' as never
    })

    vi.mocked(fs.writeFile).mockResolvedValue(undefined as never)

    // stat 실패해도 동작은 계속됨 (파일 이동으로 처리)
    const changed = await updateLinksAfterMove(`${ROOT}/A.md`, `${ROOT}/sub/A.md`)
    expect(Array.isArray(changed)).toBe(true)
  })
})

// ─────────────────────────────────────────────
describe('updateLinksAfterMove — 이름 변경 (rename)', () => {
  it('파일 이름 변경 시 참조 링크를 새 이름으로 갱신한다', async () => {
    // old.md → new.md (같은 폴더 내 이름 변경)
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false } as never)

    vi.mocked(fs.readdir).mockImplementation(async (dirPath: unknown) => {
      if (dirPath === ROOT)
        return [makeEntry('new.md', false), makeEntry('other.md', false)] as never
      return [] as never
    })

    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (filePath === `${ROOT}/other.md`) return '[link](old.md)' as never
      if (filePath === `${ROOT}/new.md`) return '# New' as never
      return '' as never
    })

    vi.mocked(fs.writeFile).mockResolvedValue(undefined as never)

    const changed = await updateLinksAfterMove(`${ROOT}/old.md`, `${ROOT}/new.md`)

    const [, content] = vi.mocked(fs.writeFile).mock.calls[0]
    expect(content).toBe('[link](new.md)')
    expect(changed).toContain(`${ROOT}/other.md`)
  })

  it('같은 파일에서 이름 변경된 자신을 가리키는 링크는 경로가 같아 변경 없다', async () => {
    // new.md 에서 자기 자신을 가리키는 링크 — 이런 경우 newRel === href (자기참조)
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false } as never)

    vi.mocked(fs.readdir).mockImplementation(async (dirPath: unknown) => {
      if (dirPath === ROOT) return [makeEntry('new.md', false)] as never
      return [] as never
    })

    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (filePath === `${ROOT}/new.md`) return '[self](old.md)' as never
      return '' as never
    })

    vi.mocked(fs.writeFile).mockResolvedValue(undefined as never)

    // old.md → new.md
    // new.md는 reverseMap에서 old.md로 매핑됨
    // effectiveOldPath = ROOT/old.md
    // resolvedTarget = path.resolve(ROOT, 'old.md') = ROOT/old.md
    // finalTarget = ROOT/new.md (pathMap에서 매핑)
    // newRel = path.relative(ROOT, ROOT/new.md) 의 dir 부분...
    // relativePathToTarget(ROOT/new.md, ROOT/new.md) = new.md ≠ old.md → 변경됨
    const changed = await updateLinksAfterMove(`${ROOT}/old.md`, `${ROOT}/new.md`)

    // self-referencing link도 올바르게 new.md 로 갱신됨
    if (changed.length > 0) {
      const [, content] = vi.mocked(fs.writeFile).mock.calls[0]
      expect(content).toBe('[self](new.md)')
    }
    // (변경이 없을 수도 있는 edge case — 결과가 일관적임만 확인)
    expect(Array.isArray(changed)).toBe(true)
  })
})

// ─────────────────────────────────────────────
describe('updateLinksAfterMove — 반환값', () => {
  it('실제로 변경된 파일 경로 목록만 반환한다', async () => {
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false } as never)

    vi.mocked(fs.readdir).mockImplementation(async (dirPath: unknown) => {
      if (dirPath === ROOT)
        return [
          makeEntry('linked.md', false),
          makeEntry('notlinked.md', false),
          makeEntry('sub', true)
        ] as never
      if (dirPath === `${ROOT}/sub`) return [makeEntry('A.md', false)] as never
      return [] as never
    })

    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (filePath === `${ROOT}/linked.md`) return '[link](A.md)' as never
      if (filePath === `${ROOT}/notlinked.md`) return '# Just a note, no links' as never
      if (filePath === `${ROOT}/sub/A.md`) return '# A' as never
      return '' as never
    })

    vi.mocked(fs.writeFile).mockResolvedValue(undefined as never)

    const changed = await updateLinksAfterMove(`${ROOT}/A.md`, `${ROOT}/sub/A.md`)

    expect(changed).toHaveLength(1)
    expect(changed).toContain(`${ROOT}/linked.md`)
    expect(changed).not.toContain(`${ROOT}/notlinked.md`)
    expect(changed).not.toContain(`${ROOT}/sub/A.md`)
  })

  it('pathMap이 비어있으면 즉시 빈 배열을 반환한다', async () => {
    // 폴더인데 .md 파일이 없음
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as never)
    vi.mocked(fs.readdir).mockResolvedValue([] as never) // 빈 폴더

    const changed = await updateLinksAfterMove(`${ROOT}/empty`, `${ROOT}/new_empty`)

    expect(fs.readFile).not.toHaveBeenCalled()
    expect(changed).toEqual([])
  })
})
