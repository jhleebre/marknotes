import fs from 'fs/promises'
import path from 'path'
import { marked } from 'marked'
import { ASSETS_PATH } from '../utils'
import { getImageMimeType } from './imageManager'

// Configure marked for GFM and heading IDs
marked.setOptions({
  gfm: true,
  breaks: false
})

// Add custom renderer for headings with IDs and images with wrappers
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

renderer.image = function ({ href, title, text }) {
  const alt = text || ''
  const src = href || ''
  const titleAttr = title ? ` title="${title}"` : ''

  return `<img src="${src}" alt="${alt}"${titleAttr}>`
}

renderer.tablecell = function (token) {
  const text = token.text
  let parsedText = marked.parse(text) as string

  parsedText = processTaskListsForExport(parsedText)

  parsedText = parsedText.replace(/<\/?p>/g, '')
  parsedText = parsedText.replace(/>\s+</g, '><')
  parsedText = parsedText.trim()

  const type = token.header ? 'th' : 'td'
  const align = token.align
  const style = align ? ` style="text-align: ${align}"` : ''
  return `<${type}${style}>${parsedText}</${type}>\n`
}

marked.use({ renderer })

export { marked }

export function postProcessImageSizes(html: string): string {
  const pattern = /<img([^>]*)><!--\s*size:(\w+)\s*-->/g

  return html.replace(pattern, (_match, imgAttrs, size) => {
    return `<div class="image-wrapper image-size-${size}" data-size="${size}"><img${imgAttrs}></div>`
  })
}

export function processTaskListsForExport(html: string): string {
  html = html.replace(
    /<ul>(\s*<li>.*?<input[^>]*type=["']checkbox["'][^>]*>)/gi,
    '<ul class="task-list">$1'
  )

  html = html.replace(
    /<li>(\s*<input[^>]*type=["']checkbox["'][^>]*>)/gi,
    '<li class="task-list-item">$1'
  )

  let changed = true
  while (changed) {
    const before = html
    html = html.replace(
      /(<ul class="task-list"[\s\S]*?)<ul>(\s*<li>.*?<input[^>]*type=["']checkbox["'][^>]*>)/gi,
      '$1<ul class="task-list">$2'
    )
    changed = html !== before
  }

  return html
}

export async function embedImagesInHtml(html: string): Promise<string> {
  const imgPattern = /<img([^>]*?)src=["']\.assets\/([^"']+)["']([^>]*?)>/g
  const matches = [...html.matchAll(imgPattern)]

  let result = html
  for (const match of matches) {
    const [fullMatch, beforeSrc, filename, afterSrc] = match
    const imagePath = path.join(ASSETS_PATH, filename)

    try {
      await fs.access(imagePath)

      const buffer = await fs.readFile(imagePath)
      const ext = path.extname(imagePath)
      const mimeType = getImageMimeType(ext)
      const base64 = buffer.toString('base64')
      const dataUrl = `data:${mimeType};base64,${base64}`

      const newImg = `<img${beforeSrc}src="${dataUrl}"${afterSrc}>`
      result = result.replace(fullMatch, newImg)
    } catch (error) {
      console.error(`Failed to embed image: ${filename}`, error)
    }
  }

  return result
}
