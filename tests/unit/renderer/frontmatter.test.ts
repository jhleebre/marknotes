import { describe, it, expect } from 'vitest'
import {
  parseFrontmatter,
  extractBody,
  buildContent,
  updateTags,
  updateField,
  removeField,
  ensureDefaults,
  stampUpdated,
  AUTO_FIELDS,
  STATUS_OPTIONS
} from '../../../src/renderer/src/utils/frontmatter'

// ─────────────────────────────────────────────
describe('parseFrontmatter', () => {
  it('frontmatter가 없는 파일은 빈 data를 반환한다', () => {
    const result = parseFrontmatter('# Hello\n\nBody content')
    expect(result.data).toEqual({})
    expect(result.body).toBe('# Hello\n\nBody content')
  })

  it('frontmatter를 올바르게 파싱한다', () => {
    const content = '---\ntitle: My Note\ncreated: 2024-01-01\n---\n# Body'
    const result = parseFrontmatter(content)
    expect(result.data.title).toBe('My Note')
    expect(result.data.created).toBe('2024-01-01')
    expect(result.body).toBe('# Body')
  })

  it('태그 배열을 파싱한다', () => {
    const content = '---\ntags:\n  - javascript\n  - react\n---\nBody'
    const result = parseFrontmatter(content)
    expect(result.data.tags).toEqual(['javascript', 'react'])
  })

  it('인라인 태그 배열을 파싱한다', () => {
    const content = '---\ntags: [a, b, c]\n---\nBody'
    const result = parseFrontmatter(content)
    expect(result.data.tags).toEqual(['a', 'b', 'c'])
  })

  it('잘못된 YAML이면 빈 data와 원본 content를 반환한다', () => {
    const invalid = '---\n: invalid: yaml: syntax\n---\nBody'
    const result = parseFrontmatter(invalid)
    // 파싱 실패해도 빈 data 반환
    expect(result.data).toEqual({})
  })

  it('body가 frontmatter 구분자 이후 내용임을 확인한다', () => {
    const content = '---\ntitle: Test\n---\nLine 1\nLine 2'
    const result = parseFrontmatter(content)
    expect(result.body).toBe('Line 1\nLine 2')
  })
})

// ─────────────────────────────────────────────
describe('extractBody', () => {
  it('frontmatter를 제거하고 body만 반환한다', () => {
    const content = '---\ntitle: Note\n---\n# Heading\n\nContent'
    expect(extractBody(content)).toBe('# Heading\n\nContent')
  })

  it('frontmatter가 없으면 원본을 그대로 반환한다', () => {
    const content = '# Just a heading\n\nSome text'
    expect(extractBody(content)).toBe(content)
  })
})

// ─────────────────────────────────────────────
describe('buildContent', () => {
  it('data가 없으면 body만 반환한다', () => {
    const result = buildContent({}, '# Body')
    expect(result).toBe('# Body')
  })

  it('frontmatter를 올바른 형식으로 생성한다', () => {
    const result = buildContent({ title: 'My Note' }, '# Body')
    expect(result).toMatch(/^---\n/)
    expect(result).toContain('title: My Note')
    expect(result).toMatch(/---\n# Body$/)
  })

  it('정규 필드 순서를 유지한다 (id → title → created → updated → source → tags → status)', () => {
    const data = {
      status: 'draft',
      title: 'Test',
      id: '123',
      created: '2024-01-01'
    }
    const result = buildContent(data, 'body')
    const lines = result.split('\n')
    const idIdx = lines.findIndex((l) => l.startsWith('id:'))
    const titleIdx = lines.findIndex((l) => l.startsWith('title:'))
    const statusIdx = lines.findIndex((l) => l.startsWith('status:'))
    expect(idIdx).toBeLessThan(titleIdx)
    expect(titleIdx).toBeLessThan(statusIdx)
  })

  it('사용자 정의 필드는 정규 필드 뒤에 추가된다', () => {
    const data = { title: 'Test', myCustomField: 'value' }
    const result = buildContent(data, 'body')
    const lines = result.split('\n')
    const titleIdx = lines.findIndex((l) => l.startsWith('title:'))
    const customIdx = lines.findIndex((l) => l.startsWith('myCustomField:'))
    expect(titleIdx).toBeLessThan(customIdx)
  })
})

// ─────────────────────────────────────────────
describe('updateTags', () => {
  it('태그 목록을 업데이트한다', () => {
    const content = '---\ntitle: Test\ntags: [a, b]\n---\nBody'
    const result = updateTags(content, ['x', 'y', 'z'])
    const parsed = parseFrontmatter(result)
    expect(parsed.data.tags).toEqual(['x', 'y', 'z'])
  })

  it('빈 태그 배열이면 tags 필드를 제거한다', () => {
    const content = '---\ntitle: Test\ntags: [a, b]\n---\nBody'
    const result = updateTags(content, [])
    const parsed = parseFrontmatter(result)
    expect(parsed.data.tags).toBeUndefined()
  })

  it('body를 변경하지 않는다', () => {
    const content = '---\ntitle: Test\n---\n# Heading\n\nParagraph'
    const result = updateTags(content, ['new'])
    expect(parseFrontmatter(result).body).toBe('# Heading\n\nParagraph')
  })

  it('frontmatter가 없는 파일에 태그를 추가한다', () => {
    const content = '# No frontmatter\nBody text'
    const result = updateTags(content, ['tag1'])
    const parsed = parseFrontmatter(result)
    expect(parsed.data.tags).toEqual(['tag1'])
  })
})

// ─────────────────────────────────────────────
describe('updateField', () => {
  it('기존 필드를 업데이트한다', () => {
    const content = '---\nstatus: draft\n---\nBody'
    const result = updateField(content, 'status', 'in-progress')
    expect(parseFrontmatter(result).data.status).toBe('in-progress')
  })

  it('존재하지 않는 필드를 추가한다', () => {
    const content = '---\ntitle: Test\n---\nBody'
    const result = updateField(content, 'source', 'https://example.com')
    expect(parseFrontmatter(result).data.source).toBe('https://example.com')
  })

  it('body를 변경하지 않는다', () => {
    const content = '---\ntitle: Test\n---\n# My Note\nContent'
    const result = updateField(content, 'title', 'Updated')
    expect(parseFrontmatter(result).body).toBe('# My Note\nContent')
  })
})

// ─────────────────────────────────────────────
describe('removeField', () => {
  it('필드를 frontmatter에서 제거한다', () => {
    const content = '---\ntitle: Test\nsource: https://example.com\n---\nBody'
    const result = removeField(content, 'source')
    expect(parseFrontmatter(result).data.source).toBeUndefined()
  })

  it('존재하지 않는 필드 제거 시 에러 없이 반환한다', () => {
    const content = '---\ntitle: Test\n---\nBody'
    expect(() => removeField(content, 'nonexistent')).not.toThrow()
  })

  it('다른 필드는 유지된다', () => {
    const content = '---\ntitle: Test\nstatus: draft\nsource: url\n---\nBody'
    const result = removeField(content, 'source')
    const data = parseFrontmatter(result).data
    expect(data.title).toBe('Test')
    expect(data.status).toBe('draft')
  })
})

// ─────────────────────────────────────────────
describe('ensureDefaults', () => {
  const fixedDate = '2024-01-15T10:30:00.000Z'

  it('기본 필드를 자동으로 추가한다', () => {
    const content = '# Just a note'
    const result = ensureDefaults(content, 'my-note.md', fixedDate)
    const data = parseFrontmatter(result).data

    expect(data.id).toBeDefined()
    expect(data.title).toBe('my-note') // .md 제거
    expect(data.created).toBeDefined()
    expect(data.updated).toBeDefined()
    expect(data.tags).toEqual([])
    expect(data.status).toBe(STATUS_OPTIONS[0])
  })

  it('이미 존재하는 필드는 덮어쓰지 않는다', () => {
    const content = '---\ntitle: Custom Title\nstatus: stable\n---\nBody'
    const result = ensureDefaults(content, 'note.md', fixedDate)
    const data = parseFrontmatter(result).data

    expect(data.title).toBe('Custom Title')
    expect(data.status).toBe('stable')
  })

  it('모든 필드가 이미 있으면 content를 변경하지 않는다', () => {
    const content =
      '---\nid: 20240115-103000\ntitle: My Note\ncreated: 2024-01-15\nupdated: 2024-01-15\nsource: \ntags: []\nstatus: draft\n---\nBody'
    const result = ensureDefaults(content, 'my-note.md', fixedDate)
    // 변경 없음 (모든 필드 존재)
    expect(parseFrontmatter(result).data.title).toBe('My Note')
  })

  it('파일명에서 .md 확장자를 제거해 title을 생성한다', () => {
    const result = ensureDefaults('# Body', 'my-awesome-note.md', fixedDate)
    expect(parseFrontmatter(result).data.title).toBe('my-awesome-note')
  })

  it('id가 날짜 기반 형식으로 생성된다 (YYYYmmdd-HHmmss)', () => {
    const result = ensureDefaults('# Body', 'note.md', fixedDate)
    const id = parseFrontmatter(result).data.id as string
    expect(id).toMatch(/^\d{8}-\d{6}$/)
  })
})

// ─────────────────────────────────────────────
describe('stampUpdated', () => {
  it('frontmatter가 있는 파일의 updated 필드를 오늘 날짜로 업데이트한다', () => {
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const content = '---\ntitle: Test\nupdated: 2020-01-01\n---\nBody'
    const result = stampUpdated(content)
    expect(parseFrontmatter(result).data.updated).toBe(dateStr)
  })

  it('updated가 이미 오늘 날짜이면 변경하지 않는다', () => {
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const content = `---\ntitle: Test\nupdated: ${dateStr}\n---\nBody`
    const result = stampUpdated(content)
    expect(result).toBe(content) // 변경 없음
  })

  it('frontmatter가 없는 파일은 그대로 반환한다', () => {
    const content = '# No frontmatter\nBody'
    const result = stampUpdated(content)
    expect(result).toBe(content)
  })
})

// ─────────────────────────────────────────────
describe('AUTO_FIELDS 상수', () => {
  it('id, title, created, updated를 포함한다', () => {
    expect(AUTO_FIELDS.has('id')).toBe(true)
    expect(AUTO_FIELDS.has('title')).toBe(true)
    expect(AUTO_FIELDS.has('created')).toBe(true)
    expect(AUTO_FIELDS.has('updated')).toBe(true)
  })
})

describe('STATUS_OPTIONS 상수', () => {
  it('draft, in-progress, stable을 포함한다', () => {
    expect(STATUS_OPTIONS).toContain('draft')
    expect(STATUS_OPTIONS).toContain('in-progress')
    expect(STATUS_OPTIONS).toContain('stable')
  })
})
