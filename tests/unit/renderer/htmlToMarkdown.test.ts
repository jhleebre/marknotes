import { describe, it, expect } from 'vitest'
import { turndownService } from '../../../src/renderer/src/components/Editor/markdown/htmlToMarkdown'

// 헬퍼: HTML → Markdown 변환
function toMd(html: string): string {
  return turndownService.turndown(html).trim()
}

// ─────────────────────────────────────────────
describe('제목 변환', () => {
  it('H1을 # 로 변환한다', () => {
    expect(toMd('<h1>Hello</h1>')).toBe('# Hello')
  })
  it('H2를 ## 로 변환한다', () => {
    expect(toMd('<h2>World</h2>')).toBe('## World')
  })
  it('H3를 ### 로 변환한다', () => {
    expect(toMd('<h3>Section</h3>')).toBe('### Section')
  })
  it('H4를 #### 로 변환한다', () => {
    expect(toMd('<h4>Sub</h4>')).toBe('#### Sub')
  })
  it('H5를 ##### 로 변환한다', () => {
    expect(toMd('<h5>Mini</h5>')).toBe('##### Mini')
  })
  it('H6을 ###### 로 변환한다', () => {
    expect(toMd('<h6>Tiny</h6>')).toBe('###### Tiny')
  })
})

// ─────────────────────────────────────────────
describe('인라인 서식 변환', () => {
  it('<strong>을 **로 변환한다', () => {
    expect(toMd('<strong>bold text</strong>')).toBe('**bold text**')
  })

  it('<em>을 *로 변환한다', () => {
    expect(toMd('<em>italic text</em>')).toBe('*italic text*')
  })

  it('<s>를 ~~로 변환한다 (strikethrough)', () => {
    expect(toMd('<s>strikethrough</s>')).toBe('~~strikethrough~~')
  })

  it('<del>을 ~~로 변환한다', () => {
    expect(toMd('<del>deleted</del>')).toBe('~~deleted~~')
  })

  it('<strike>를 ~~로 변환한다', () => {
    expect(toMd('<strike>struck</strike>')).toBe('~~struck~~')
  })

  it('pre 외부의 <code>를 `로 변환한다', () => {
    const result = toMd('<p>Use <code>npm install</code> to install</p>')
    expect(result).toContain('`npm install`')
  })

  it('<a>를 [text](url) 링크로 변환한다', () => {
    expect(toMd('<a href="https://example.com">Example</a>')).toBe(
      '[Example](https://example.com)'
    )
  })

  it('앵커 링크 (#heading)를 [text](#id) 로 변환한다', () => {
    expect(toMd('<a href="#my-heading">Go to heading</a>')).toBe('[Go to heading](#my-heading)')
  })
})

// ─────────────────────────────────────────────
describe('코드 블록 변환', () => {
  it('<pre><code>를 ``` 펜스 코드 블록으로 변환한다', () => {
    const html = '<pre><code>const x = 1</code></pre>'
    const md = toMd(html)
    expect(md).toContain('```')
    expect(md).toContain('const x = 1')
  })

  it('언어 클래스를 코드 펜스에 포함한다', () => {
    const html = '<pre><code class="language-javascript">const x = 1</code></pre>'
    const md = toMd(html)
    expect(md).toContain('```javascript')
  })

  it('typescript 언어를 인식한다', () => {
    const html = '<pre><code class="language-typescript">interface Foo {}</code></pre>'
    const md = toMd(html)
    expect(md).toContain('```typescript')
  })

  it('코드 블록 끝 개행을 제거한다 (불필요한 빈 줄 누적 방지)', () => {
    const html = '<pre><code>code here\n\n\n</code></pre>'
    const md = toMd(html)
    // 코드 내용 끝에 개행이 쌓이지 않아야 함
    // (백틱 3개 직전에 3개 이상 연속 개행이 없어야 함)
    const parts = md.split('```')
    // 코드 블록 내용에서 끝부분 개행이 제거됐는지 확인
    expect(parts[1]).not.toMatch(/\n{3,}$/)
  })
})

// ─────────────────────────────────────────────
describe('목록 변환', () => {
  it('<ul>을 - 목록으로 변환한다', () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul>'
    const md = toMd(html)
    expect(md).toContain('- Item 1')
    expect(md).toContain('- Item 2')
  })

  it('<ol>을 번호 목록으로 변환한다', () => {
    const html = '<ol><li>First</li><li>Second</li><li>Third</li></ol>'
    const md = toMd(html)
    expect(md).toContain('1. First')
    expect(md).toContain('2. Second')
    expect(md).toContain('3. Third')
  })

  it('체크박스 미완료: data-checked="false"를 - [ ] 로 변환한다', () => {
    const html =
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><input type="checkbox">Task A</li></ul>'
    const md = toMd(html)
    expect(md).toContain('- [ ] Task A')
  })

  it('체크박스 완료: data-checked="true"를 - [x] 로 변환한다', () => {
    const html =
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><input type="checkbox" checked>Done B</li></ul>'
    const md = toMd(html)
    expect(md).toContain('- [x] Done B')
  })
})

// ─────────────────────────────────────────────
describe('인용구 변환', () => {
  it('<blockquote>를 > 로 변환한다', () => {
    const html = '<blockquote><p>Quote text here</p></blockquote>'
    const md = toMd(html)
    expect(md).toContain('> Quote text here')
  })
})

// ─────────────────────────────────────────────
describe('표 변환 (GFM)', () => {
  it('기본 테이블을 GFM 형식으로 변환한다', () => {
    const html = `
      <table>
        <tr><th>Name</th><th>Age</th></tr>
        <tr><td>Alice</td><td>30</td></tr>
        <tr><td>Bob</td><td>25</td></tr>
      </table>
    `
    const md = toMd(html)
    expect(md).toContain('| Name | Age |')
    expect(md).toContain('| Alice | 30 |')
    expect(md).toContain('| Bob | 25 |')
  })

  it('헤더 행 다음에 구분자 행이 있다', () => {
    const html = `
      <table>
        <tr><th>Col1</th><th>Col2</th></tr>
        <tr><td>a</td><td>b</td></tr>
      </table>
    `
    const md = toMd(html)
    // 구분자 행 확인 (:--- 또는 --- 패턴)
    expect(md).toMatch(/\|[\s:]+[-]+[\s:]*\|/)
  })

  it('파이프(|) 문자가 포함된 셀 내용을 이스케이프한다', () => {
    const html = `
      <table>
        <tr><th>Code</th></tr>
        <tr><td>a | b</td></tr>
      </table>
    `
    const md = toMd(html)
    expect(md).toContain('\\|')
  })
})

// ─────────────────────────────────────────────
describe('이미지 변환', () => {
  it('<img>를 ![alt](src) 형식으로 변환한다', () => {
    // jsdom은 상대 URL을 http://localhost:3000/... 로 절대화하므로 절대 URL 사용
    const html = '<img src="https://example.com/photo.jpg" alt="A photo">'
    const md = toMd(html)
    expect(md).toContain('![A photo](https://example.com/photo.jpg)')
  })

  it('이미지 크기가 original이면 주석을 추가하지 않는다', () => {
    const html =
      '<div class="image-wrapper image-size-original" data-size="original"><img src="https://example.com/img.png" alt="test"></div>'
    const md = toMd(html)
    expect(md).not.toContain('<!-- size:')
  })

  it('이미지 크기가 small이면 <!-- size:small --> 주석을 추가한다', () => {
    const html =
      '<div class="image-wrapper image-size-small" data-size="small"><img src="https://example.com/img.png" alt="test"></div>'
    const md = toMd(html)
    expect(md).toContain('<!-- size:small -->')
  })

  it('data-asset-path가 있으면 src 대신 그 경로를 사용한다', () => {
    // alt="photo"가 있으므로 결과는 ![photo](.assets/photo.png)
    const html =
      '<img src="data:image/png;base64,abc" data-asset-path=".assets/photo.png" alt="photo">'
    const md = toMd(html)
    expect(md).toContain('![photo](.assets/photo.png)')
  })

  it('alt가 없는 이미지는 ![]() 형식으로 변환한다', () => {
    const html =
      '<img src="data:image/png;base64,abc" data-asset-path=".assets/no-alt.png">'
    const md = toMd(html)
    expect(md).toContain('![](.assets/no-alt.png)')
  })
})
