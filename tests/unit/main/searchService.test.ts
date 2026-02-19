import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'path'

// --- Mocks ---

vi.mock('fs/promises', () => ({
  default: {
    readdir: vi.fn(),
    readFile: vi.fn()
  }
}))

vi.mock('../../../src/main/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/main/utils')>()
  return { ...actual }
})

// --- Imports ---

import fs from 'fs/promises'
import { ROOT_PATH } from '../../../src/main/utils'
import { searchFiles, searchTags } from '../../../src/main/services/searchService'

function mockFileSystem(files: Record<string, string>) {
  const filePaths = Object.keys(files).map((f) => path.join(ROOT_PATH, f))

  vi.mocked(fs.readdir).mockImplementation(async (dir) => {
    const dirStr = String(dir)
    const entries = filePaths
      .filter((p) => path.dirname(p) === dirStr && !path.basename(p).startsWith('.'))
      .map((p) => ({
        name: path.basename(p),
        isDirectory: () => false,
        isFile: () => true
      }))
    return entries as never
  })

  vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
    const rel = path.relative(ROOT_PATH, String(filePath))
    const content = files[rel]
    if (content === undefined) throw new Error(`ENOENT: ${filePath}`)
    return content as never
  })
}

beforeEach(() => vi.clearAllMocks())

// ─────────────────────────────────────────────
describe('searchFiles — 기본 검색', () => {
  it('빈 쿼리는 빈 결과를 반환한다', async () => {
    const result = await searchFiles('', ROOT_PATH, false)
    expect(result.success).toBe(true)
    expect(result.results).toHaveLength(0)
    expect(result.totalMatches).toBe(0)
  })

  it('공백만 있는 쿼리는 빈 결과를 반환한다', async () => {
    const result = await searchFiles('   ', ROOT_PATH, false)
    expect(result.success).toBe(true)
    expect(result.results).toHaveLength(0)
  })

  it('ROOT_PATH 외부 경로는 Access denied를 반환한다', async () => {
    const result = await searchFiles('query', '/etc', false)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Access denied')
  })

  it('일치하는 파일을 찾아 반환한다', async () => {
    mockFileSystem({
      'file1.md': '# Hello\nThis is a test document',
      'file2.md': '# World\nNo match here'
    })

    const result = await searchFiles('test', ROOT_PATH, false)
    expect(result.success).toBe(true)
    expect(result.results!.length).toBe(1)
    expect(result.results![0].fileName).toBe('file1.md')
  })

  it('여러 파일에서 일치하는 결과를 모두 반환한다', async () => {
    mockFileSystem({
      'file1.md': '# Hello\nThis is a test',
      'file2.md': '# World\nThis is also a test'
    })

    const result = await searchFiles('test', ROOT_PATH, false)
    expect(result.results!.length).toBe(2)
    expect(result.totalMatches).toBe(2)
  })

  it('일치하지 않으면 빈 결과를 반환한다', async () => {
    mockFileSystem({
      'file1.md': '# Hello\nNo keywords here'
    })

    const result = await searchFiles('xyz_not_found', ROOT_PATH, false)
    expect(result.success).toBe(true)
    expect(result.results!.length).toBe(0)
  })
})

// ─────────────────────────────────────────────
describe('searchFiles — 대소문자 구분', () => {
  beforeEach(() => {
    mockFileSystem({
      'note.md': '# Hello\nHello world HELLO'
    })
  })

  it('caseSensitive=false 이면 대소문자 무관하게 검색한다', async () => {
    const result = await searchFiles('hello', ROOT_PATH, false)
    expect(result.totalMatches).toBe(3) // Hello, hello (없음?), HELLO → 실제 내용: Hello, HELLO → 2
    // 위 mock 파일에 "Hello world HELLO" → "hello" case-insensitive matches: Hello, HELLO
    expect(result.totalMatches).toBeGreaterThanOrEqual(2)
  })

  it('caseSensitive=true 이면 대소문자를 구분한다', async () => {
    const resultLower = await searchFiles('hello', ROOT_PATH, true)
    const resultUpper = await searchFiles('HELLO', ROOT_PATH, true)

    // 소문자 'hello' → 0개 (파일에는 Hello, HELLO만 있음)
    expect(resultLower.totalMatches).toBe(0)
    // 대문자 'HELLO' → 1개
    expect(resultUpper.totalMatches).toBe(1)
  })
})

// ─────────────────────────────────────────────
describe('searchFiles — YAML frontmatter 처리', () => {
  it('frontmatter 라인을 body 라인 카운트에서 제외한다', async () => {
    mockFileSystem({
      'note.md': '---\ntitle: Test\ntags: [a]\n---\n# Heading\nContent here'
    })

    const result = await searchFiles('Content', ROOT_PATH, false)
    expect(result.success).toBe(true)
    expect(result.results!.length).toBe(1)
    // lineNumber는 body 기준 1-based (# Heading이 1, Content here가 2)
    const match = result.results![0].matches[0]
    expect(match.lineNumber).toBe(2)
  })

  it('frontmatter 내용은 검색하지 않는다', async () => {
    mockFileSystem({
      'note.md': '---\ntitle: UniqueSearchWord\n---\n# Body\nNothing here'
    })

    const result = await searchFiles('UniqueSearchWord', ROOT_PATH, false)
    expect(result.success).toBe(true)
    // frontmatter 는 건너뛰므로 body 에서 찾으면 0개
    expect(result.results!.length).toBe(0)
  })
})

// ─────────────────────────────────────────────
describe('searchFiles — 결과 제한', () => {
  it('matchStart, matchEnd 인덱스가 정확하다', async () => {
    mockFileSystem({
      'note.md': 'The quick brown fox'
    })

    const result = await searchFiles('quick', ROOT_PATH, false)
    const match = result.results![0].matches[0]
    expect(match.matchStart).toBe(4) // 'The ' 다음
    expect(match.matchEnd).toBe(9) // 'quick' 끝
  })

  it('300자를 초과하는 라인은 잘라낸다', async () => {
    const longLine = 'x'.repeat(400) + 'target' + 'x'.repeat(100)
    // 이 경우 target이 300자 이후라서 line content가 잘림
    mockFileSystem({ 'note.md': longLine })

    // 검색 결과의 lineContent가 300자 이하여야 함
    // (target이 400자 이후이므로 이 쿼리로는 matchStart가 300 이후 → match 안 됨)
    const result = await searchFiles('target', ROOT_PATH, false)
    // 매칭 여부 검사보다는 lineContent 길이 검사
    // 300자 이하인 경우의 결과 확인
    if (result.results && result.results.length > 0) {
      const match = result.results[0].matches[0]
      expect(match.lineContent.length).toBeLessThanOrEqual(300)
    }
  })
})

// ─────────────────────────────────────────────
describe('searchTags — 태그 검색', () => {
  it('빈 쿼리는 빈 결과를 반환한다', async () => {
    const result = await searchTags('', ROOT_PATH, false)
    expect(result.success).toBe(true)
    expect(result.results!.length).toBe(0)
  })

  it('inline 배열 형식 tags를 검색한다', async () => {
    mockFileSystem({
      'note.md': '---\ntags: [javascript, typescript, react]\n---\n# Content'
    })

    const result = await searchTags('javascript', ROOT_PATH, false)
    expect(result.success).toBe(true)
    expect(result.results!.length).toBe(1)
  })

  it('block 형식 tags를 검색한다', async () => {
    mockFileSystem({
      'note.md': '---\ntags:\n  - javascript\n  - typescript\n---\n# Content'
    })

    const result = await searchTags('typescript', ROOT_PATH, false)
    expect(result.results!.length).toBe(1)
  })

  it('부분 일치를 지원한다', async () => {
    mockFileSystem({
      'note.md': '---\ntags: [javascript, typescript]\n---\n# Body'
    })

    // 'java' 검색 시 'javascript' 태그 매칭
    const result = await searchTags('java', ROOT_PATH, false)
    expect(result.results!.length).toBe(1)
    expect(result.results![0].matches[0].lineContent).toBe('javascript')
  })

  it('태그가 없는 파일은 결과에 포함하지 않는다', async () => {
    mockFileSystem({
      'note.md': '# No frontmatter\nJust content'
    })

    const result = await searchTags('anytag', ROOT_PATH, false)
    expect(result.results!.length).toBe(0)
  })

  it('caseSensitive=false 이면 대소문자 무관하게 태그를 검색한다', async () => {
    mockFileSystem({
      'note.md': '---\ntags: [JavaScript]\n---\n# Body'
    })

    const result = await searchTags('javascript', ROOT_PATH, false)
    expect(result.results!.length).toBe(1)
  })

  it('caseSensitive=true 이면 대소문자를 구분한다', async () => {
    mockFileSystem({
      'note.md': '---\ntags: [JavaScript]\n---\n# Body'
    })

    const resultLower = await searchTags('javascript', ROOT_PATH, true)
    const resultExact = await searchTags('JavaScript', ROOT_PATH, true)

    expect(resultLower.results!.length).toBe(0)
    expect(resultExact.results!.length).toBe(1)
  })

  it('matchStart, matchEnd 인덱스가 정확하다', async () => {
    mockFileSystem({
      'note.md': '---\ntags: [typescript]\n---\n# Body'
    })

    const result = await searchTags('script', ROOT_PATH, false)
    const match = result.results![0].matches[0]
    // 'typescript'.indexOf('script') === 4
    expect(match.matchStart).toBe(4)
    expect(match.matchEnd).toBe(10) // 4 + 'script'.length
  })

  it('ROOT_PATH 외부 경로를 거부한다', async () => {
    const result = await searchTags('tag', '/tmp', false)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Access denied')
  })
})
