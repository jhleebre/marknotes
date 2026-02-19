import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'path'

// --- Mocks (hoisted before imports) ---

vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    access: vi.fn(),
    stat: vi.fn(),
    readdir: vi.fn(),
    unlink: vi.fn(),
    rename: vi.fn(),
    copyFile: vi.fn(),
    rm: vi.fn()
  }
}))

vi.mock('../../../src/main/services/imageManager', () => ({
  updateDocumentImageReferences: vi.fn().mockResolvedValue(undefined),
  cleanupDocumentImages: vi.fn().mockResolvedValue(undefined),
  cleanupDirectoryImages: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('../../../src/main/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/main/utils')>()
  return {
    ...actual,
    ensureRootDirectory: vi.fn().mockResolvedValue(undefined)
  }
})

// --- Imports (after mocks) ---

import fs from 'fs/promises'
import { ROOT_PATH } from '../../../src/main/utils'
import {
  readFile,
  writeFile,
  createFile,
  createFolder,
  deleteFile,
  renameFile,
  moveFile,
  duplicateFile,
  fileExists,
  buildFileTree
} from '../../../src/main/services/fileOperations'

// Helper: DirEntry 목 객체 생성
function makeEntry(name: string, isDir: boolean) {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir
  }
}

beforeEach(() => vi.clearAllMocks())

// ─────────────────────────────────────────────
describe('readFile', () => {
  it('유효한 파일을 성공적으로 읽는다', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('# Hello World' as never)
    const result = await readFile(path.join(ROOT_PATH, 'test.md'))
    expect(result.success).toBe(true)
    expect(result.content).toBe('# Hello World')
  })

  it('ROOT_PATH 외부 경로는 Access denied를 반환한다', async () => {
    const result = await readFile('/etc/passwd')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Access denied')
  })

  it('경로 순회 공격을 거부한다', async () => {
    const result = await readFile(path.join(ROOT_PATH, '../../etc/passwd'))
    expect(result.success).toBe(false)
    expect(result.error).toContain('Access denied')
  })

  it('파일 읽기 실패 시 에러를 반환한다', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT: no such file') as never)
    const result = await readFile(path.join(ROOT_PATH, 'nonexistent.md'))
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

// ─────────────────────────────────────────────
describe('writeFile', () => {
  beforeEach(() => {
    vi.mocked(fs.mkdir).mockResolvedValue(undefined as never)
    vi.mocked(fs.writeFile).mockResolvedValue(undefined as never)
  })

  it('파일을 성공적으로 저장한다', async () => {
    const result = await writeFile(path.join(ROOT_PATH, 'test.md'), '# Content')
    expect(result.success).toBe(true)
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('test.md'),
      '# Content',
      'utf-8'
    )
  })

  it('디렉토리를 자동으로 생성한다', async () => {
    await writeFile(path.join(ROOT_PATH, 'newdir', 'note.md'), '# Note')
    expect(fs.mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true })
  })

  it('ROOT_PATH 외부 쓰기를 거부한다', async () => {
    const result = await writeFile('/tmp/evil.md', 'malicious content')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Access denied')
    expect(fs.writeFile).not.toHaveBeenCalled()
  })

  it('.md 파일 저장 시 이미지 레퍼런스를 업데이트한다', async () => {
    const { updateDocumentImageReferences } = await import(
      '../../../src/main/services/imageManager'
    )
    await writeFile(path.join(ROOT_PATH, 'note.md'), '# With image\n![img](.assets/img.png)')
    expect(updateDocumentImageReferences).toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────
describe('createFile', () => {
  it('.md 확장자를 자동으로 추가한다', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT') as never) // 파일 없음
    vi.mocked(fs.writeFile).mockResolvedValue(undefined as never)

    const result = await createFile('mynote', ROOT_PATH)
    expect(result.success).toBe(true)
    expect(result.content).toMatch(/mynote\.md$/)
  })

  it('확장자가 이미 있으면 추가하지 않는다', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT') as never)
    vi.mocked(fs.writeFile).mockResolvedValue(undefined as never)

    const result = await createFile('mynote.md', ROOT_PATH)
    expect(result.success).toBe(true)
    // .md.md 가 되면 안 됨
    expect(result.content).not.toMatch(/\.md\.md$/)
  })

  it('이미 존재하는 파일명이면 에러를 반환한다', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined as never) // 파일 존재
    const result = await createFile('existing', ROOT_PATH)
    expect(result.success).toBe(false)
    expect(result.error).toBe('File already exists')
  })

  it('ROOT_PATH 외부 경로를 거부한다', async () => {
    const result = await createFile('note', '/tmp')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Access denied')
  })

  it('dirPath를 생략하면 ROOT_PATH에 생성한다', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT') as never)
    vi.mocked(fs.writeFile).mockResolvedValue(undefined as never)

    const result = await createFile('defaultdir')
    expect(result.success).toBe(true)
    expect(result.content).toContain(ROOT_PATH)
  })
})

// ─────────────────────────────────────────────
describe('createFolder', () => {
  it('폴더를 성공적으로 생성한다', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT') as never)
    vi.mocked(fs.mkdir).mockResolvedValue(undefined as never)

    const result = await createFolder('newFolder', ROOT_PATH)
    expect(result.success).toBe(true)
    expect(result.content).toContain('newFolder')
  })

  it('이미 존재하는 폴더명이면 에러를 반환한다', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined as never) // 폴더 존재
    const result = await createFolder('existing', ROOT_PATH)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Folder already exists')
  })

  it('ROOT_PATH 외부에는 폴더를 생성하지 않는다', async () => {
    const result = await createFolder('evil', '/tmp')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Access denied')
  })
})

// ─────────────────────────────────────────────
describe('deleteFile', () => {
  it('일반 파일을 삭제한다', async () => {
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false } as never)
    vi.mocked(fs.unlink).mockResolvedValue(undefined as never)

    const result = await deleteFile(path.join(ROOT_PATH, 'note.md'))
    expect(result.success).toBe(true)
    expect(fs.unlink).toHaveBeenCalled()
  })

  it('디렉토리를 재귀적으로 삭제한다', async () => {
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as never)
    vi.mocked(fs.rm).mockResolvedValue(undefined as never)

    const result = await deleteFile(path.join(ROOT_PATH, 'myFolder'))
    expect(result.success).toBe(true)
    expect(fs.rm).toHaveBeenCalledWith(expect.any(String), { recursive: true })
  })

  it('ROOT_PATH 외부 경로를 거부한다', async () => {
    const result = await deleteFile('/etc/important')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Access denied')
  })
})

// ─────────────────────────────────────────────
describe('renameFile', () => {
  it('파일 이름을 변경한다', async () => {
    vi.mocked(fs.rename).mockResolvedValue(undefined as never)
    const oldPath = path.join(ROOT_PATH, 'old.md')
    const result = await renameFile(oldPath, 'new.md')
    expect(result.success).toBe(true)
    expect(result.content).toContain('new.md')
  })

  it('ROOT_PATH 외부 경로를 거부한다', async () => {
    const result = await renameFile('/etc/hosts', 'evil')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Access denied')
  })
})

// ─────────────────────────────────────────────
describe('moveFile', () => {
  it('파일을 대상 디렉토리로 이동한다', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT') as never) // target doesn't exist
    vi.mocked(fs.rename).mockResolvedValue(undefined as never)

    const src = path.join(ROOT_PATH, 'note.md')
    const dst = path.join(ROOT_PATH, 'folder')
    const result = await moveFile(src, dst)
    expect(result.success).toBe(true)
    expect(result.content).toContain(path.join('folder', 'note.md'))
  })

  it('폴더를 자기 자신 안으로 이동하는 것을 거부한다', async () => {
    const src = path.join(ROOT_PATH, 'myFolder')
    const dst = path.join(ROOT_PATH, 'myFolder', 'sub')
    const result = await moveFile(src, dst)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Cannot move a folder into itself')
  })

  it('소스 경로가 ROOT_PATH 외부면 거부한다', async () => {
    const result = await moveFile('/etc/hosts', ROOT_PATH)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Access denied')
  })

  it('대상 경로가 ROOT_PATH 외부면 거부한다', async () => {
    const result = await moveFile(path.join(ROOT_PATH, 'note.md'), '/tmp')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Access denied')
  })

  it('같은 이름의 파일이 대상에 이미 존재하면 에러를 반환한다', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined as never) // target exists
    const result = await moveFile(
      path.join(ROOT_PATH, 'note.md'),
      path.join(ROOT_PATH, 'folder')
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('already exists')
  })
})

// ─────────────────────────────────────────────
describe('duplicateFile', () => {
  it('_copy 접미사로 복사본을 생성한다', async () => {
    // 원본 존재, _copy는 없음
    vi.mocked(fs.access)
      .mockResolvedValueOnce(undefined as never) // source exists
      .mockRejectedValueOnce(new Error('ENOENT') as never) // _copy does not exist
    vi.mocked(fs.copyFile).mockResolvedValue(undefined as never)

    const result = await duplicateFile(path.join(ROOT_PATH, 'note.md'))
    expect(result.success).toBe(true)
    expect(result.content).toContain('note_copy.md')
  })

  it('_copy가 이미 있으면 _copy_2를 생성한다', async () => {
    vi.mocked(fs.access)
      .mockResolvedValueOnce(undefined as never) // source exists
      .mockResolvedValueOnce(undefined as never) // note_copy.md exists
      .mockRejectedValueOnce(new Error('ENOENT') as never) // note_copy_2.md does not exist
    vi.mocked(fs.copyFile).mockResolvedValue(undefined as never)

    const result = await duplicateFile(path.join(ROOT_PATH, 'note.md'))
    expect(result.success).toBe(true)
    expect(result.content).toContain('note_copy_2.md')
  })

  it('원본 파일이 없으면 에러를 반환한다', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT') as never)
    const result = await duplicateFile(path.join(ROOT_PATH, 'nonexistent.md'))
    expect(result.success).toBe(false)
    expect(result.error).toBe('Source file not found')
  })

  it('ROOT_PATH 외부 경로를 거부한다', async () => {
    const result = await duplicateFile('/etc/passwd')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Access denied')
  })
})

// ─────────────────────────────────────────────
describe('fileExists', () => {
  it('파일이 존재하면 true를 반환한다', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined as never)
    expect(await fileExists(path.join(ROOT_PATH, 'note.md'))).toBe(true)
  })

  it('파일이 없으면 false를 반환한다', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT') as never)
    expect(await fileExists(path.join(ROOT_PATH, 'missing.md'))).toBe(false)
  })
})

// ─────────────────────────────────────────────
describe('buildFileTree', () => {
  it('숨김 파일(.으로 시작)을 제외한다', async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      makeEntry('.hidden', false),
      makeEntry('visible.md', false)
    ] as never)

    const result = await buildFileTree(ROOT_PATH)
    const names = result.map((e) => e.name)
    expect(names).not.toContain('.hidden')
    expect(names).toContain('visible.md')
  })

  it('.md 파일만 포함한다', async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      makeEntry('note.md', false),
      makeEntry('image.png', false),
      makeEntry('data.txt', false)
    ] as never)

    const result = await buildFileTree(ROOT_PATH)
    const names = result.map((e) => e.name)
    expect(names).toContain('note.md')
    expect(names).not.toContain('image.png')
    expect(names).not.toContain('data.txt')
  })

  it('폴더를 파일보다 먼저 정렬한다', async () => {
    vi.mocked(fs.readdir)
      .mockResolvedValueOnce([
        makeEntry('zzz.md', false),
        makeEntry('aaa', true),
        makeEntry('bbb.md', false)
      ] as never)
      .mockResolvedValue([] as never) // 재귀 호출용

    const result = await buildFileTree(ROOT_PATH)
    expect(result[0].isDirectory).toBe(true) // 폴더가 먼저
    expect(result[0].name).toBe('aaa')
  })

  it('동일 타입 내에서 알파벳 순으로 정렬한다', async () => {
    vi.mocked(fs.readdir)
      .mockResolvedValueOnce([
        makeEntry('zebra.md', false),
        makeEntry('apple.md', false),
        makeEntry('mango.md', false)
      ] as never)
      .mockResolvedValue([] as never)

    const result = await buildFileTree(ROOT_PATH)
    const names = result.map((e) => e.name)
    expect(names).toEqual(['apple.md', 'mango.md', 'zebra.md'])
  })

  it('폴더를 재귀적으로 탐색한다', async () => {
    vi.mocked(fs.readdir)
      .mockResolvedValueOnce([makeEntry('folder', true)] as never)
      .mockResolvedValueOnce([makeEntry('child.md', false)] as never)

    const result = await buildFileTree(ROOT_PATH)
    expect(result[0].children).toBeDefined()
    expect(result[0].children![0].name).toBe('child.md')
  })
})
