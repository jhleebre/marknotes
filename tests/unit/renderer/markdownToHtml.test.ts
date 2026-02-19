import { describe, it, expect } from 'vitest'
import { marked, postProcessImageSizes } from '../../../src/renderer/src/components/Editor/markdown/markdownToHtml'
import { processTaskListsForEditor } from '../../../src/renderer/src/components/Editor/markdown/taskListProcessor'

// marked.parse()만 사용 (기본 HTML)
function toHtml(md: string): string {
  return String(marked.parse(md))
}

// 체크박스 처리까지 포함한 전체 파이프라인
// (Editor에서 실제로 사용하는 방식: marked.parse → processTaskListsForEditor)
function toHtmlFull(md: string): string {
  const html = String(marked.parse(md))
  return processTaskListsForEditor(html)
}

// ─────────────────────────────────────────────
describe('기본 블록 요소 변환', () => {
  it('# H1을 <h1>으로 변환한다', () => {
    expect(toHtml('# Hello')).toContain('<h1')
    expect(toHtml('# Hello')).toContain('Hello')
  })

  it('## H2를 <h2>로 변환한다', () => {
    expect(toHtml('## Sub')).toContain('<h2')
  })

  it('H6까지 변환된다', () => {
    expect(toHtml('###### Deep')).toContain('<h6')
  })

  it('단락은 <p>로 감싼다', () => {
    const html = toHtml('Just a paragraph.')
    expect(html).toContain('<p>Just a paragraph.</p>')
  })

  it('> 인용구를 <blockquote>로 변환한다', () => {
    expect(toHtml('> Quote')).toContain('<blockquote>')
  })

  it('--- 수평선을 <hr>로 변환한다', () => {
    expect(toHtml('---')).toContain('<hr')
  })
})

// ─────────────────────────────────────────────
describe('인라인 서식 변환', () => {
  it('**bold**를 <strong>으로 변환한다', () => {
    const html = toHtml('**bold text**')
    expect(html).toContain('<strong>bold text</strong>')
  })

  it('*italic*을 <em>으로 변환한다', () => {
    const html = toHtml('*italic text*')
    expect(html).toContain('<em>italic text</em>')
  })

  it('~~strike~~를 <del>로 변환한다', () => {
    const html = toHtml('~~strikethrough~~')
    expect(html).toContain('<del>strikethrough</del>')
  })

  it('`code`를 <code>로 변환한다', () => {
    const html = toHtml('Use `npm install`')
    expect(html).toContain('<code>npm install</code>')
  })

  it('[text](url) 링크를 <a>로 변환한다', () => {
    const html = toHtml('[Example](https://example.com)')
    expect(html).toContain('<a href="https://example.com">')
    expect(html).toContain('Example')
  })
})

// ─────────────────────────────────────────────
describe('목록 변환', () => {
  it('- 목록을 <ul>로 변환한다', () => {
    const html = toHtml('- Item 1\n- Item 2')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>Item 1</li>')
    expect(html).toContain('<li>Item 2</li>')
  })

  it('1. 번호 목록을 <ol>로 변환한다', () => {
    const html = toHtml('1. First\n2. Second')
    expect(html).toContain('<ol>')
    expect(html).toContain('<li>First</li>')
  })

  it('- [ ] 체크박스를 data-checked="false"로 변환한다 (processTaskListsForEditor 포함)', () => {
    // marked.parse() 단독으로는 <input type="checkbox"> 생성
    // processTaskListsForEditor()가 data-checked 속성을 추가하는 후처리 단계
    const html = toHtmlFull('- [ ] Todo item')
    expect(html).toContain('data-checked="false"')
    expect(html).toContain('data-type="taskItem"')
  })

  it('- [x] 체크박스를 data-checked="true"로 변환한다 (processTaskListsForEditor 포함)', () => {
    const html = toHtmlFull('- [x] Done item')
    expect(html).toContain('data-checked="true"')
  })

  it('- [X] (대문자)도 완료로 처리한다 (processTaskListsForEditor 포함)', () => {
    const html = toHtmlFull('- [X] Also done')
    expect(html).toContain('data-checked="true"')
  })

  it('marked.parse() 단독 결과에는 <input type="checkbox">가 포함된다', () => {
    // marked는 GFM 체크박스를 HTML checkbox input으로 변환
    const html = toHtml('- [ ] Todo')
    expect(html).toContain('<input')
    expect(html).toContain('type="checkbox"')
  })
})

// ─────────────────────────────────────────────
describe('코드 블록 변환', () => {
  it('``` 코드 블록을 <pre><code>로 변환한다', () => {
    const md = '```\nconst x = 1\n```'
    const html = toHtml(md)
    expect(html).toContain('<pre>')
    expect(html).toContain('<code>')
    expect(html).toContain('const x = 1')
  })

  it('언어 힌트를 class="language-js"로 포함한다', () => {
    const md = '```javascript\nconst x = 1\n```'
    const html = toHtml(md)
    expect(html).toContain('class="language-javascript"')
  })

  it('< > 기호를 HTML 엔티티로 이스케이프한다', () => {
    const md = '```\n<div>test</div>\n```'
    const html = toHtml(md)
    expect(html).toContain('&lt;div&gt;')
  })
})

// ─────────────────────────────────────────────
describe('GFM 테이블 변환', () => {
  const tableMd = '| Name | Age |\n| --- | --- |\n| Alice | 30 |\n| Bob | 25 |'

  it('테이블을 <table>로 변환한다', () => {
    expect(toHtml(tableMd)).toContain('<table>')
  })

  it('헤더를 <th>로 변환한다', () => {
    const html = toHtml(tableMd)
    expect(html).toContain('<th')
    expect(html).toContain('Name')
    expect(html).toContain('Age')
  })

  it('데이터를 <td>로 변환한다', () => {
    const html = toHtml(tableMd)
    expect(html).toContain('<td')
    expect(html).toContain('Alice')
    expect(html).toContain('30')
  })

  it('정렬 속성이 style에 포함된다', () => {
    const md = '| Left | Center | Right |\n| :--- | :---: | ---: |\n| a | b | c |'
    const html = toHtml(md)
    expect(html).toContain('text-align: center')
    expect(html).toContain('text-align: right')
  })
})

// ─────────────────────────────────────────────
describe('제목 ID 생성 (커스텀 렌더러)', () => {
  it('제목에 id 속성을 생성한다', () => {
    const html = toHtml('# Hello World')
    expect(html).toContain('id="hello-world"')
  })

  it('공백을 하이픈으로 변환해 id를 만든다', () => {
    const html = toHtml('## My Section Title')
    expect(html).toContain('id="my-section-title"')
  })

  it('특수문자를 제거해 id를 만든다', () => {
    const html = toHtml('# Hello, World!')
    // 특수문자 제거 후 소문자화
    expect(html).toMatch(/id="hello[-\s]?world"/)
  })
})

// ─────────────────────────────────────────────
describe('이미지 변환 (커스텀 렌더러)', () => {
  it('![alt](src)를 image-wrapper div로 감싼다', () => {
    const html = toHtml('![My Photo](photo.jpg)')
    expect(html).toContain('class="image-wrapper')
    expect(html).toContain('<img')
    expect(html).toContain('alt="My Photo"')
    expect(html).toContain('src="photo.jpg"')
  })

  it('기본 data-size가 original이다', () => {
    const html = toHtml('![Alt](img.png)')
    expect(html).toContain('data-size="original"')
  })
})

// ─────────────────────────────────────────────
describe('postProcessImageSizes', () => {
  it('<!-- size:small --> 주석을 image-size-small 클래스로 변환한다', () => {
    const html =
      '<div class="image-wrapper image-size-original" data-size="original"><img src="img.png" alt=""></div><!-- size:small -->'
    const result = postProcessImageSizes(html)
    expect(result).toContain('image-size-small')
    expect(result).toContain('data-size="small"')
    expect(result).not.toContain('<!-- size:small -->')
  })

  it('<!-- size:medium --> 주석을 image-size-medium 클래스로 변환한다', () => {
    const html =
      '<div class="image-wrapper image-size-original" data-size="original"><img src="img.png" alt="x"></div><!-- size:medium -->'
    const result = postProcessImageSizes(html)
    expect(result).toContain('image-size-medium')
  })

  it('<!-- size:large --> 주석을 image-size-large 클래스로 변환한다', () => {
    const html =
      '<div class="image-wrapper image-size-original" data-size="original"><img src="img.png" alt="x"></div><!-- size:large -->'
    const result = postProcessImageSizes(html)
    expect(result).toContain('image-size-large')
  })

  it('size 주석이 없는 HTML은 변경하지 않는다', () => {
    const html = '<p>No images here</p>'
    expect(postProcessImageSizes(html)).toBe(html)
  })
})

// ─────────────────────────────────────────────
describe('마크다운 왕복 변환 (Roundtrip)', () => {
  // MD → HTML (marked.parse + processTaskListsForEditor) → MD (turndownService) 왕복 변환
  // Editor에서 실제로 사용하는 전체 파이프라인 시뮬레이션
  const toMdRoundtrip = async (md: string): Promise<string> => {
    const { turndownService: ts } = await import(
      '../../../src/renderer/src/components/Editor/markdown/htmlToMarkdown'
    )
    const html = toHtmlFull(md) // marked.parse + processTaskListsForEditor
    return ts.turndown(html).trim()
  }

  it('제목이 왕복 변환 후 유지된다', async () => {
    const result = await toMdRoundtrip('# Hello World')
    expect(result).toContain('# Hello World')
  })

  it('굵게+기울임이 왕복 변환 후 유지된다', async () => {
    const result = await toMdRoundtrip('**bold** and *italic*')
    expect(result).toContain('**bold**')
    expect(result).toContain('*italic*')
  })

  it('순서 없는 목록이 왕복 변환 후 유지된다', async () => {
    const result = await toMdRoundtrip('- Item 1\n- Item 2\n- Item 3')
    expect(result).toContain('- Item 1')
    expect(result).toContain('- Item 2')
  })

  it('체크박스 목록이 왕복 변환 후 유지된다', async () => {
    const result = await toMdRoundtrip('- [ ] Todo\n- [x] Done')
    // 체크박스 마커와 내용이 보존되는지 확인 (공백 수는 구현에 따라 다를 수 있음)
    expect(result).toContain('- [ ]')
    expect(result).toContain('Todo')
    expect(result).toContain('- [x]')
    expect(result).toContain('Done')
  })

  it('코드 블록이 왕복 변환 후 언어 힌트와 함께 유지된다', async () => {
    const result = await toMdRoundtrip('```javascript\nconst x = 1\n```')
    expect(result).toContain('```javascript')
    expect(result).toContain('const x = 1')
  })

  it('GFM 테이블이 왕복 변환 후 구조가 유지된다', async () => {
    const md = '| Name | Age |\n| --- | --- |\n| Alice | 30 |'
    const result = await toMdRoundtrip(md)
    expect(result).toContain('| Name | Age |')
    expect(result).toContain('| Alice | 30 |')
  })
})
