import { marked } from 'marked'
import { processTaskListsForEditor } from './taskListProcessor'

// Configure marked for GFM table support, heading IDs, and task lists
marked.setOptions({
  gfm: true,
  breaks: false
})

// Add custom renderer for headings with IDs and tables with alignment
const renderer = new marked.Renderer()
renderer.heading = function ({ text, depth, tokens }) {
  const raw = tokens ? tokens.map((t) => t.raw || '').join('') : text

  const id = raw
    .toLowerCase()
    .trim()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `<h${depth} id="${id}">${text}</h${depth}>\n`
}

// Custom table cell renderer to apply alignment from markdown and parse both inline and block markdown
renderer.tablecell = function (token) {
  const text = token.text
  let parsedText = marked.parse(text) as string
  parsedText = processTaskListsForEditor(parsedText)

  parsedText = parsedText.replace(/<\/?p>/g, '')
  parsedText = parsedText.replace(/>\s+</g, '><')
  parsedText = parsedText.trim()

  const type = token.header ? 'th' : 'td'
  const align = token.align
  const style = align ? ` style="text-align: ${align}"` : ''
  return `<${type}${style}>${parsedText}</${type}>\n`
}

// Strip trailing newline from code blocks to prevent extra empty line in editor
renderer.code = function ({ text, lang }) {
  const language = lang || ''
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const classAttr = language ? ` class="language-${language}"` : ''
  return `<pre><code${classAttr}>${escaped}</code></pre>\n`
}

// Custom image renderer to support size classes
renderer.image = function ({ href, title, text }) {
  const alt = text || ''
  const src = href || ''
  const titleAttr = title ? ` title="${title}"` : ''

  return `<div class="image-wrapper image-size-original" data-size="original"><img src="${src}" alt="${alt}"${titleAttr} /></div>`
}

marked.use({ renderer })

export { marked }

// Post-process HTML to apply size classes from comments
export function postProcessImageSizes(html: string): string {
  const pattern = /<div class="image-wrapper[^"]*"[^>]*><img([^>]*)><\/div><!--\s*size:(\w+)\s*-->/g

  return html.replace(pattern, (_match, imgAttrs, size) => {
    return `<div class="image-wrapper image-size-${size}" data-size="${size}"><img${imgAttrs}></div>`
  })
}

// Post-process HTML to resolve .assets image paths to data URLs
export async function resolveAssetImages(html: string): Promise<string> {
  const imgPattern = /<img([^>]*?)src=["']\.assets\/([^"']+)["']([^>]*?)>/g
  const matches = [...html.matchAll(imgPattern)]

  let result = html
  for (const match of matches) {
    const [fullMatch, beforeSrc, filename, afterSrc] = match
    const assetPath = `.assets/${filename}`

    try {
      const resolveResult = await window.api.image.resolveAssetPath(assetPath)
      if (resolveResult.success && resolveResult.content) {
        const newImg = `<img${beforeSrc}src="${resolveResult.content}"${afterSrc} data-asset-path="${assetPath}">`
        result = result.replace(fullMatch, newImg)
      }
    } catch (error) {
      console.error(`Failed to resolve image: ${assetPath}`, error)
    }
  }

  return result
}
