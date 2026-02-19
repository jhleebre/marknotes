import { describe, it, expect } from 'vitest'
import { computeRelativePath } from '../../../src/renderer/src/utils/pathUtils'

// computeRelativePath(fromFile, toFile)
// fromFile: 링크를 포함하는 파일의 절대 경로
// toFile:   링크 대상 파일의 절대 경로
// 반환값:   fromFile 기준의 toFile 상대 경로

describe('computeRelativePath', () => {
  // ─── 같은 디렉토리 ────────────────────────────────
  describe('같은 디렉토리 내 파일', () => {
    it('같은 폴더의 다른 파일 → 파일명만 반환', () => {
      const result = computeRelativePath('/root/notes/A.md', '/root/notes/B.md')
      expect(result).toBe('B.md')
    })

    it('깊은 폴더에서 같은 폴더 파일', () => {
      const result = computeRelativePath('/a/b/c/from.md', '/a/b/c/to.md')
      expect(result).toBe('to.md')
    })
  })

  // ─── 하위 디렉토리 ────────────────────────────────
  describe('대상이 하위 디렉토리에 있는 경우', () => {
    it('from과 같은 레벨에서 한 단계 아래 폴더로', () => {
      const result = computeRelativePath('/root/A.md', '/root/sub/B.md')
      expect(result).toBe('sub/B.md')
    })

    it('두 단계 아래 폴더로', () => {
      const result = computeRelativePath('/root/A.md', '/root/sub/deep/B.md')
      expect(result).toBe('sub/deep/B.md')
    })

    it('from이 하위 폴더에서 더 깊은 하위 폴더의 파일로', () => {
      const result = computeRelativePath('/root/folder/A.md', '/root/folder/sub/B.md')
      expect(result).toBe('sub/B.md')
    })
  })

  // ─── 상위 디렉토리 ────────────────────────────────
  describe('대상이 상위 디렉토리에 있는 경우', () => {
    it('한 단계 위 폴더의 파일로', () => {
      const result = computeRelativePath('/root/sub/A.md', '/root/B.md')
      expect(result).toBe('../B.md')
    })

    it('두 단계 위 폴더의 파일로', () => {
      const result = computeRelativePath('/root/a/b/A.md', '/root/B.md')
      expect(result).toBe('../../B.md')
    })

    it('세 단계 위 폴더의 파일로', () => {
      const result = computeRelativePath('/root/a/b/c/A.md', '/root/B.md')
      expect(result).toBe('../../../B.md')
    })
  })

  // ─── 형제 디렉토리 ────────────────────────────────
  describe('형제(sibling) 디렉토리에 있는 경우', () => {
    it('형제 폴더의 파일로', () => {
      const result = computeRelativePath('/root/folder1/A.md', '/root/folder2/B.md')
      expect(result).toBe('../folder2/B.md')
    })

    it('두 단계 위 공통 조상에서 다른 경로로', () => {
      const result = computeRelativePath('/root/a/x/A.md', '/root/b/y/B.md')
      expect(result).toBe('../../b/y/B.md')
    })

    it('한 단계 위 형제 폴더의 하위 파일로', () => {
      const result = computeRelativePath('/root/src/A.md', '/root/docs/guide/B.md')
      expect(result).toBe('../docs/guide/B.md')
    })
  })

  // ─── 실전 시나리오 ────────────────────────────────
  describe('실전 MarkNotes 경로 시나리오', () => {
    const ROOT = '/Users/user/Documents/MarkNotes'

    it('루트 파일 → 하위 폴더 파일', () => {
      const result = computeRelativePath(`${ROOT}/index.md`, `${ROOT}/projects/todo.md`)
      expect(result).toBe('projects/todo.md')
    })

    it('하위 폴더 파일 → 루트 파일', () => {
      const result = computeRelativePath(`${ROOT}/projects/todo.md`, `${ROOT}/index.md`)
      expect(result).toBe('../index.md')
    })

    it('폴더 A → 폴더 B (형제)', () => {
      const result = computeRelativePath(
        `${ROOT}/work/meeting.md`,
        `${ROOT}/personal/diary.md`
      )
      expect(result).toBe('../personal/diary.md')
    })

    it('깊은 중첩 → 다른 깊은 중첩', () => {
      const result = computeRelativePath(
        `${ROOT}/a/b/c/from.md`,
        `${ROOT}/x/y/z/to.md`
      )
      expect(result).toBe('../../../x/y/z/to.md')
    })

    it('같은 폴더 내 이름 변경 시나리오', () => {
      // LinkModal에서 파일 선택 후 상대경로 계산
      const result = computeRelativePath(
        `${ROOT}/folder/note-a.md`,
        `${ROOT}/folder/note-b.md`
      )
      expect(result).toBe('note-b.md')
    })
  })

  // ─── 엣지 케이스 ────────────────────────────────
  describe('엣지 케이스', () => {
    it('루트 바로 아래 두 파일', () => {
      const result = computeRelativePath('/root/A.md', '/root/B.md')
      expect(result).toBe('B.md')
    })

    it('공통 조상이 없는 완전히 다른 경로', () => {
      // 실제로는 ROOT_PATH 보안 제약으로 발생 안 하지만 함수 자체는 처리 가능
      const result = computeRelativePath('/a/x/from.md', '/b/y/to.md')
      expect(result).toBe('../../b/y/to.md')
    })

    it('반환 경로에 / 가 포함되어 slashes가 올바르다', () => {
      const result = computeRelativePath('/root/a/from.md', '/root/b/c/to.md')
      expect(result).not.toContain('\\')
      expect(result).toBe('../b/c/to.md')
    })

    it('결과가 항상 .md 확장자로 끝난다', () => {
      const cases = [
        ['/root/A.md', '/root/B.md'],
        ['/root/a/A.md', '/root/b/B.md'],
        ['/root/A.md', '/root/sub/B.md']
      ] as const
      for (const [from, to] of cases) {
        expect(computeRelativePath(from, to)).toMatch(/\.md$/)
      }
    })
  })
})
