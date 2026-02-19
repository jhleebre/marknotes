import { describe, it, expect } from 'vitest'
import path from 'path'
import { validatePath, ROOT_PATH } from '../../../src/main/utils'

describe('ROOT_PATH', () => {
  it('Documents/MarkNotes 경로를 포함한다', () => {
    expect(ROOT_PATH).toContain('Documents')
    expect(ROOT_PATH).toContain('MarkNotes')
  })
})

describe('validatePath', () => {
  it('ROOT_PATH 내부 파일 경로를 허용한다', () => {
    expect(validatePath(path.join(ROOT_PATH, 'note.md'))).toBe(true)
  })

  it('중첩 폴더 내 경로를 허용한다', () => {
    expect(validatePath(path.join(ROOT_PATH, 'folder', 'sub', 'note.md'))).toBe(true)
  })

  it('ROOT_PATH 자체를 허용한다', () => {
    expect(validatePath(ROOT_PATH)).toBe(true)
  })

  it('/etc/passwd 같은 시스템 경로를 거부한다', () => {
    expect(validatePath('/etc/passwd')).toBe(false)
  })

  it('홈 디렉토리 다른 위치를 거부한다', () => {
    // ROOT_PATH 상위 Documents 경로
    const outsidePath = path.dirname(ROOT_PATH) // ~/Documents
    expect(validatePath(outsidePath)).toBe(false)
  })

  it('경로 순회 공격 (../..) 을 거부한다', () => {
    expect(validatePath(path.join(ROOT_PATH, '..', '..', 'etc', 'passwd'))).toBe(false)
  })

  it('ROOT_PATH 를 포함한 다른 경로를 거부한다 (prefix 공격)', () => {
    // e.g. ~/Documents/MarkNotesEvil 은 startsWith(ROOT_PATH) 를 우회할 수 있음
    const evilPath = ROOT_PATH + 'Evil/note.md'
    expect(validatePath(evilPath)).toBe(false)
  })

  it('상대 경로 순회를 거부한다', () => {
    expect(validatePath(path.join(ROOT_PATH, '..', 'OtherFolder'))).toBe(false)
  })
})
