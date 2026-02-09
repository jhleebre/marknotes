import { useEffect, useCallback, useRef, useState } from 'react'
import { useEditor, EditorContent, Editor as TipTapEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Heading from '@tiptap/extension-heading'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Link from '@tiptap/extension-link'
import Strike from '@tiptap/extension-strike'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Code from '@tiptap/extension-code'
import Blockquote from '@tiptap/extension-blockquote'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import TipTapImage from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { DOMSerializer } from '@tiptap/pm/model'
import { InputRule } from '@tiptap/core'
import { common, createLowlight } from 'lowlight'
import { marked } from 'marked'
import TurndownService from 'turndown'
import { useDocumentStore } from '../store/useDocumentStore'
import { LinkModal } from './LinkModal'
import { ImageModal } from './ImageModal'
import { AltTextModal } from './AltTextModal'
import { ContextMenu, type ContextMenuItem } from './ContextMenu'
import {
  CutIcon,
  CopyIcon,
  PasteIcon,
  SelectAllIcon,
  BoldIcon,
  ItalicIcon,
  StrikeIcon,
  CodeIcon,
  LinkIcon,
  BulletListIcon,
  OrderedListIcon,
  QuoteIcon,
  CodeBlockIcon,
  IndentIcon,
  OutdentIcon,
  HRIcon,
  TableIcon,
  ImageIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  EditIcon,
  ResizeIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  TaskListIcon
} from '../utils/icons'
import './Editor.css'
import { Extension } from '@tiptap/core'

const lowlight = createLowlight(common)

// Custom extension for Tab/Shift+Tab handling
const TabHandling = Extension.create({
  name: 'tabHandling',

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        const { state } = this.editor
        const { selection } = state
        const { $from } = selection

        // Check if we're in a list FIRST (higher priority than table navigation)
        const isInList =
          this.editor.isActive('bulletList') ||
          this.editor.isActive('orderedList') ||
          this.editor.isActive('taskList')
        if (isInList) {
          // Try to sink list item (indent)
          if (this.editor.isActive('taskList')) {
            this.editor.commands.sinkListItem('taskItem')
          } else {
            this.editor.commands.sinkListItem('listItem')
          }
          // Always return true to prevent table navigation
          return true
        }

        // Check if we're inside a table
        const isInTable =
          $from.node(-1)?.type.name === 'tableCell' || $from.node(-1)?.type.name === 'tableHeader'
        if (isInTable) {
          // Let table extension handle it (go to next cell)
          return false
        }

        // For regular text, insert tab character
        return this.editor.commands.insertContent('\t')
      },
      'Shift-Tab': () => {
        const { state } = this.editor
        const { selection } = state
        const { $from } = selection

        // Check if we're in a list FIRST (higher priority than table navigation)
        const isInList =
          this.editor.isActive('bulletList') ||
          this.editor.isActive('orderedList') ||
          this.editor.isActive('taskList')
        if (isInList) {
          // Try to lift list item (outdent)
          if (this.editor.isActive('taskList')) {
            this.editor.commands.liftListItem('taskItem')
          } else {
            this.editor.commands.liftListItem('listItem')
          }
          // Always return true to prevent table navigation
          return true
        }

        // Check if we're inside a table
        const isInTable =
          $from.node(-1)?.type.name === 'tableCell' || $from.node(-1)?.type.name === 'tableHeader'
        if (isInTable) {
          // Let table extension handle it (go to previous cell)
          return false
        }

        // For regular text, try to remove leading tab/spaces
        const { $anchor } = selection
        const textBefore = $anchor.parent.textContent.slice(0, $anchor.parentOffset)

        if (textBefore.match(/[\t ]$/)) {
          // Remove one tab or up to 4 spaces before cursor
          const match = textBefore.match(/([\t]| {1,4})$/)
          if (match) {
            const deleteCount = match[1].length
            return this.editor.commands.deleteRange({
              from: $anchor.pos - deleteCount,
              to: $anchor.pos
            })
          }
        }

        // Important: always return true to prevent browser default focus behavior
        return true
      }
    }
  }
})

// Configure marked for GFM table support, heading IDs, and task lists
marked.setOptions({
  gfm: true,
  breaks: false
})

// Add custom renderer for headings with IDs and tables with alignment
const renderer = new marked.Renderer()
renderer.heading = function ({ text, depth, tokens }) {
  // Extract plain text from tokens for ID generation
  const raw = tokens ? tokens.map((t) => t.raw || '').join('') : text

  // Generate ID manually (slugger approach)
  const id = raw
    .toLowerCase()
    .trim()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w\s가-힣-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `<h${depth} id="${id}">${text}</h${depth}>\n`
}

// Custom table cell renderer to apply alignment from markdown and parse both inline and block markdown
renderer.tablecell = function (token) {
  const text = token.text
  // Parse both inline and block-level markdown (lists, blockquotes, code blocks, etc.)
  let parsedText = marked.parse(text) as string
  parsedText = processTaskListsForEditor(parsedText)

  // Remove ALL <p> tags (not just outer ones) to prevent extra spacing
  parsedText = parsedText.replace(/<\/?p>/g, '')

  // Remove excessive whitespace between HTML tags
  parsedText = parsedText.replace(/>\s+</g, '><')

  // Clean up and trim
  parsedText = parsedText.trim()

  const type = token.header ? 'th' : 'td'
  const align = token.align
  const style = align ? ` style="text-align: ${align}"` : ''
  return `<${type}${style}>${parsedText}</${type}>\n`
}

// Custom image renderer to support size classes
renderer.image = function ({ href, title, text }) {
  const alt = text || ''
  const src = href || ''
  const titleAttr = title ? ` title="${title}"` : ''

  return `<div class="image-wrapper image-size-original" data-size="original"><img src="${src}" alt="${alt}"${titleAttr} /></div>`
}

marked.use({ renderer })

// Post-process HTML to apply size classes from comments
function postProcessImageSizes(html: string): string {
  // Find images followed by size comments
  const pattern = /<div class="image-wrapper[^"]*"[^>]*><img([^>]*)><\/div><!--\s*size:(\w+)\s*-->/g

  return html.replace(pattern, (_match, imgAttrs, size) => {
    return `<div class="image-wrapper image-size-${size}" data-size="${size}"><img${imgAttrs}></div>`
  })
}

// Post-process HTML to resolve .assets image paths to data URLs
async function resolveAssetImages(html: string): Promise<string> {
  // Find all img tags with .assets/ src
  const imgPattern = /<img([^>]*?)src=["']\.assets\/([^"']+)["']([^>]*?)>/g
  const matches = [...html.matchAll(imgPattern)]

  let result = html
  for (const match of matches) {
    const [fullMatch, beforeSrc, filename, afterSrc] = match
    const assetPath = `.assets/${filename}`

    try {
      const resolveResult = await window.api.image.resolveAssetPath(assetPath)
      if (resolveResult.success && resolveResult.content) {
        // Replace with data URL and add data-asset-path attribute
        const newImg = `<img${beforeSrc}src="${resolveResult.content}"${afterSrc} data-asset-path="${assetPath}">`
        result = result.replace(fullMatch, newImg)
      }
    } catch (error) {
      console.error(`Failed to resolve image: ${assetPath}`, error)
    }
  }

  return result
}

// Post-process HTML to convert marked checkboxes to TipTap task lists (for editor)
function processTaskListsForEditor(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  doc.querySelectorAll('ul').forEach((ul) => {
    const firstLi = ul.querySelector('li')
    if (firstLi && firstLi.querySelector('input[type="checkbox"]')) {
      ul.setAttribute('data-type', 'taskList')

      ul.querySelectorAll('li').forEach((li) => {
        const checkbox = li.querySelector('input[type="checkbox"]') as HTMLInputElement | null
        if (checkbox) {
          li.setAttribute('data-type', 'taskItem')
          li.setAttribute('data-checked', checkbox.checked ? 'true' : 'false')
          checkbox.removeAttribute('disabled')
        }
      })
    }
  })

  return doc.body.innerHTML
}

// Post-process HTML to convert marked checkboxes for preview mode (wraps content in div)
function processTaskListsForPreview(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Process from innermost to outermost to handle nested lists correctly
  const processTaskList = (ul: Element): void => {
    const firstLi = ul.querySelector('li')
    if (!firstLi || !firstLi.querySelector('input[type="checkbox"]')) {
      return
    }

    ul.setAttribute('data-type', 'taskList')

    // Only process direct children li elements
    Array.from(ul.children).forEach((child) => {
      if (child.nodeName !== 'LI') return
      const li = child as HTMLElement

      const checkbox = li.querySelector('input[type="checkbox"]') as HTMLInputElement | null
      if (!checkbox) return

      li.setAttribute('data-type', 'taskItem')
      li.setAttribute('data-checked', checkbox.checked ? 'true' : 'false')
      checkbox.removeAttribute('disabled')

      // First, recursively process any nested task lists
      const nestedUls = Array.from(li.children).filter((el) => el.nodeName === 'UL')
      nestedUls.forEach((nestedUl) => processTaskList(nestedUl))

      // Wrap text content and nested lists in a div for proper flex layout
      const contentWrapper = doc.createElement('div')
      const nodes = Array.from(li.childNodes)

      nodes.forEach((node) => {
        // Skip the checkbox - it stays as direct child
        if (node === checkbox) return

        // Move all other content to the wrapper
        contentWrapper.appendChild(node)
      })

      // Clear li and rebuild structure: checkbox first, then wrapped content
      li.innerHTML = ''
      li.appendChild(checkbox)
      if (contentWrapper.childNodes.length > 0) {
        li.appendChild(contentWrapper)
      }
    })
  }

  // Find all top-level ul elements and process them
  doc.querySelectorAll('ul').forEach((ul) => {
    processTaskList(ul)
  })

  return doc.body.innerHTML
}

// Function to generate ID from text content
function generateIdFromText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w\s가-힣-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Extend Heading to preserve and auto-generate ID attributes
const HeadingWithId = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('id'),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {}
          }
          return {
            id: attributes.id
          }
        }
      }
    }
  },

  addProseMirrorPlugins() {
    let composing = false
    const updateTimeout: NodeJS.Timeout | null = null

    return [
      new Plugin({
        key: new PluginKey('autoHeadingId'),
        props: {
          // Track composition state for IME (Korean, Japanese, Chinese input)
          handleDOMEvents: {
            compositionstart: () => {
              composing = true
              return false
            },
            compositionend: () => {
              composing = false
              return false
            }
          }
        },
        appendTransaction: (transactions, _oldState, newState) => {
          // Skip during composition to avoid breaking Korean/Chinese/Japanese input
          if (composing) {
            return null
          }

          // Debounce ID updates to avoid interfering with typing
          if (updateTimeout) {
            clearTimeout(updateTimeout)
          }

          const tr = newState.tr
          let modified = false

          // Check if document content changed
          if (transactions.some((transaction) => transaction.docChanged)) {
            newState.doc.descendants((node, pos) => {
              if (node.type.name === 'heading') {
                const textContent = node.textContent
                const currentId = node.attrs.id

                if (textContent) {
                  const newId = generateIdFromText(textContent)

                  // Only update if ID changed or doesn't exist
                  if (newId && newId !== currentId) {
                    tr.setNodeMarkup(pos, undefined, {
                      ...node.attrs,
                      id: newId
                    })
                    modified = true
                  }
                }
              }
            })
          }

          return modified ? tr : null
        }
      })
    ]
  }
})

// Extend formatting extensions to block when heading is active
const BoldExtended = Bold.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-b': () => {
        if (this.editor.isActive('heading')) {
          return true // Block the command
        }
        return this.editor.commands.toggleBold()
      }
    }
  }
})

const ItalicExtended = Italic.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-i': () => {
        if (this.editor.isActive('heading')) {
          return true // Block the command
        }
        return this.editor.commands.toggleItalic()
      }
    }
  }
})

const CodeExtended = Code.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-e': () => {
        if (this.editor.isActive('heading')) {
          return true // Block the command
        }
        return this.editor.commands.toggleCode()
      }
    }
  },

  addInputRules() {
    return [
      new InputRule({
        find: /(?:^|\s)(`([^`]+)`)$/,
        handler: ({ state, range, match }) => {
          const { $from } = state.selection

          // Block if we're in a heading
          if ($from.parent.type.name === 'heading') {
            return
          }

          // Apply the code mark (default behavior)
          const attributes = {}
          const { tr } = state
          const captureGroup = match[2] // The content inside backticks
          const fullMatch = match[0]

          if (captureGroup) {
            const startSpaces = fullMatch.search(/\S/)
            const textStart = range.from + fullMatch.indexOf(captureGroup)
            const textEnd = textStart + captureGroup.length

            // Delete the backticks
            if (textEnd < range.to) {
              tr.delete(textEnd, range.to)
            }
            if (textStart > range.from) {
              tr.delete(range.from + startSpaces, textStart)
            }

            const markStart = range.from + startSpaces
            const markEnd = markStart + captureGroup.length

            tr.addMark(markStart, markEnd, this.type.create(attributes))
            tr.removeStoredMark(this.type)
          }
        }
      })
    ]
  }
})

const BlockquoteExtended = Blockquote.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-b': () => {
        if (this.editor.isActive('heading')) {
          return true // Block the command
        }
        return this.editor.commands.toggleBlockquote()
      }
    }
  }
})

const BulletListExtended = BulletList.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-8': () => {
        if (this.editor.isActive('heading')) {
          return true // Block the command
        }
        return this.editor.commands.toggleBulletList()
      }
    }
  }
})

const OrderedListExtended = OrderedList.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-7': () => {
        if (this.editor.isActive('heading')) {
          return true // Block the command
        }
        return this.editor.commands.toggleOrderedList()
      }
    }
  }
})

const TaskListExtended = TaskList.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-9': () => {
        if (this.editor.isActive('heading')) {
          return true // Block the command
        }
        return this.editor.commands.toggleTaskList()
      }
    }
  }
})

const CodeBlockLowlightExtended = CodeBlockLowlight.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-Alt-c': () => {
        if (this.editor.isActive('heading')) {
          return true // Block the command
        }
        return this.editor.commands.toggleCodeBlock()
      }
    }
  }
})

// Extend Image to support size classes
const CustomImage = TipTapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute('src'),
        renderHTML: (attributes) => {
          if (!attributes.src) return {}
          return { src: attributes.src }
        }
      },
      alt: {
        default: null,
        parseHTML: (element) => element.getAttribute('alt'),
        renderHTML: (attributes) => {
          if (!attributes.alt) return {}
          return { alt: attributes.alt }
        }
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('title'),
        renderHTML: (attributes) => {
          if (!attributes.title) return {}
          return { title: attributes.title }
        }
      },
      sizeClass: {
        default: 'original',
        parseHTML: (element) => {
          const wrapper = element.closest('.image-wrapper')
          if (wrapper) {
            const classList = Array.from(wrapper.classList)
            const sizeClass = classList.find((c) => c.startsWith('image-size-'))
            if (sizeClass) {
              return sizeClass.replace('image-size-', '')
            }
          }
          return 'original'
        },
        renderHTML: () => {
          return {}
        }
      },
      assetPath: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-asset-path'),
        renderHTML: (attributes) => {
          if (!attributes.assetPath) return {}
          return { 'data-asset-path': attributes.assetPath }
        }
      }
    }
  },

  renderHTML({ HTMLAttributes, node }) {
    const sizeClass = node.attrs.sizeClass || 'original'
    return [
      'div',
      { class: `image-wrapper image-size-${sizeClass}`, 'data-size': sizeClass },
      ['img', HTMLAttributes]
    ]
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (element) => {
          if (typeof element === 'string') return false
          const el = element as HTMLElement
          return {
            src: el.getAttribute('src'),
            alt: el.getAttribute('alt'),
            title: el.getAttribute('title')
          }
        }
      }
    ]
  }
})

// Configure turndown for better markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**'
})

// Add strikethrough conversion rule
turndownService.addRule('strikethrough', {
  filter: function (node) {
    return node.nodeName === 'S' || node.nodeName === 'STRIKE' || node.nodeName === 'DEL'
  },
  replacement: function (content) {
    return '~~' + content + '~~'
  }
})

// Keep heading IDs when converting HTML to markdown
turndownService.addRule('headingWithId', {
  filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  replacement: function (_content, node) {
    const level = Number(node.nodeName.charAt(1))
    const hashes = '#'.repeat(level)
    // Use textContent directly to avoid unwanted escaping (e.g., "1." -> "1\.")
    const text = node.textContent || ''
    return '\n\n' + hashes + ' ' + text + '\n\n'
  }
})

// Add table to markdown conversion rules
turndownService.addRule('table', {
  filter: 'table',
  replacement: function (_content, node) {
    const table = node as HTMLTableElement
    const rows = Array.from(table.querySelectorAll('tr'))

    if (rows.length === 0) return ''

    const markdownRows: string[] = []

    rows.forEach((row, index) => {
      const cells = Array.from(row.querySelectorAll('th, td'))
      const cellContents = cells.map((cell) => {
        const cellHtml = (cell as HTMLElement).innerHTML

        // Check if cell contains block-level elements (lists, code blocks, blockquotes, etc.)
        // Note: <p> tags are NOT considered block elements here, they're used for normal line breaks
        const hasBlockElements = /<(ul|ol|pre|blockquote|h[1-6]|div)[\s>]/i.test(cellHtml)

        let cellContent: string

        if (hasBlockElements) {
          // Keep as HTML if block elements are present
          // Convert newlines to HTML entities to prevent breaking table structure
          cellContent = cellHtml
            .trim()
            .replace(/\n/g, '&#10;') // Convert newlines to HTML entity
            .replace(/\r/g, '') // Remove carriage returns
        } else {
          // Process HTML before converting to markdown
          let processedHtml = cellHtml

          // Replace paragraph breaks with <br> tags to preserve line breaks
          // </p><p> becomes <br> (paragraph break)
          processedHtml = processedHtml.replace(/<\/p>\s*<p>/gi, '<br>')
          // Remove opening and closing <p> tags
          processedHtml = processedHtml.replace(/<\/?p>/gi, '')

          // Convert to markdown for inline elements only (bold, italic, code, links, images)
          cellContent = turndownService.turndown(processedHtml).trim()

          // Replace remaining newlines with <br> tags
          cellContent = cellContent.replace(/\n/g, '<br>')
        }

        // Escape pipe characters
        cellContent = cellContent.split('\\|').join('<!ESCAPED_PIPE!>')
        cellContent = cellContent.split('|').join('\\|')
        cellContent = cellContent.split('<!ESCAPED_PIPE!>').join('\\|')

        return cellContent
      })

      markdownRows.push('| ' + cellContents.join(' | ') + ' |')

      // Add separator after first row (header) with alignment info
      if (index === 0) {
        const separator =
          '| ' +
          cells
            .map((cell) => {
              const align = (cell as HTMLElement).style.textAlign || 'left'
              if (align === 'center') {
                return ':---:'
              } else if (align === 'right') {
                return '---:'
              } else {
                return ':---'
              }
            })
            .join(' | ') +
          ' |'
        markdownRows.push(separator)
      }
    })

    return '\n\n' + markdownRows.join('\n') + '\n\n'
  }
})

turndownService.addRule('tableSection', {
  filter: ['thead', 'tbody', 'tfoot'],
  replacement: function () {
    return ''
  }
})

turndownService.addRule('tableRow', {
  filter: 'tr',
  replacement: function () {
    return ''
  }
})

turndownService.addRule('tableCell', {
  filter: ['th', 'td'],
  replacement: function () {
    return ''
  }
})

// Add rules for better list handling
turndownService.addRule('listItem', {
  filter: 'li',
  replacement: function (content, node) {
    content = content.replace(/^\n+/, '').replace(/\n+$/, '\n').replace(/\n/gm, '\n    ')

    let prefix = '- '
    const parent = node.parentNode
    if (parent && parent.nodeName === 'OL') {
      const siblings = Array.from(parent.children)
      const index = siblings.indexOf(node as Element) + 1
      prefix = `${index}. `
    }

    return prefix + content + (node.nextSibling ? '\n' : '')
  }
})

// Task list conversion rules
turndownService.addRule('taskList', {
  filter: function (node) {
    return node.nodeName === 'UL' && node.getAttribute('data-type') === 'taskList'
  },
  replacement: function (content) {
    return content
  }
})

turndownService.addRule('taskItem', {
  filter: function (node) {
    return node.nodeName === 'LI' && node.getAttribute('data-type') === 'taskItem'
  },
  replacement: function (content, node) {
    content = content.replace(/^\n+/, '').replace(/\n+$/, '\n').replace(/\n/gm, '\n    ')

    const checkbox = node.querySelector('input[type="checkbox"]') as HTMLInputElement | null
    const checked = checkbox ? checkbox.checked : false
    const prefix = checked ? '- [x] ' : '- [ ] '

    return prefix + content + (node.nextSibling ? '\n' : '')
  }
})

// Add rule for images with size classes
turndownService.addRule('imageWithSize', {
  filter: 'img',
  replacement: function (_content, node) {
    const img = node as HTMLImageElement
    const alt = img.alt || ''
    let src = img.src || ''

    if (!src) return ''

    // Check if this is a resolved .assets path (stored in data-asset-path)
    const assetPath = img.getAttribute('data-asset-path')
    if (assetPath) {
      src = assetPath // Use original .assets path in markdown
    }

    // Get size class from wrapper
    const wrapper = img.closest('.image-wrapper')
    let sizeClass = 'original'
    if (wrapper) {
      const dataSize = wrapper.getAttribute('data-size')
      if (dataSize) {
        sizeClass = dataSize
      }
    }

    const markdown = `![${alt}](${src})`

    // Add size comment if not original
    if (sizeClass && sizeClass !== 'original') {
      return `${markdown}<!-- size:${sizeClass} -->`
    }

    return markdown
  }
})

interface EditorProps {
  onReady?: () => void
}

export function Editor({ onReady }: EditorProps): React.JSX.Element {
  const {
    mode,
    content,
    setContent,
    updateCounts,
    isLoadingContent,
    currentFilePath,
    setCurrentFile,
    setOriginalContent,
    setIsLoadingContent
  } = useDocumentStore()
  const isUpdatingFromMarkdown = useRef(false)
  const lastMarkdownContent = useRef('')
  const [, forceUpdate] = useState({})
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    show: boolean
    type: 'table' | 'image' | 'text-selection' | 'empty-area' | null
    canEmbed?: boolean
  }>({ x: 0, y: 0, show: false, type: null, canEmbed: false })
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [altTextModal, setAltTextModal] = useState<{
    isOpen: boolean
    currentAlt: string
    imagePos: number
  }>({ isOpen: false, currentAlt: '', imagePos: -1 })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: false, // Disable default heading to use our extended version
        link: false, // Disable default link to use our custom one
        strike: false, // Disable default strike to use custom keyboard shortcut
        bold: false, // Disable to extend with heading check
        italic: false, // Disable to extend with heading check
        code: false, // Disable to extend with heading check (inline code)
        blockquote: false, // Disable to extend with heading check
        bulletList: false, // Disable to extend with heading check
        orderedList: false, // Disable to extend with heading check
        listItem: false // Disable to extend with heading check
      }),
      HeadingWithId,
      Link.configure({
        openOnClick: false, // Prevent default link opening, we'll handle it manually
        HTMLAttributes: {
          class: 'editor-link',
          target: null, // Don't open in new tab
          rel: null // Remove rel attributes
        }
      }),
      Strike.extend({
        addKeyboardShortcuts() {
          return {
            'Mod-Shift-x': () => {
              if (this.editor.isActive('heading')) {
                return true // Block the command
              }
              return this.editor.commands.toggleStrike()
            }
          }
        }
      }),
      BoldExtended,
      ItalicExtended,
      CodeExtended,
      BlockquoteExtended,
      BulletListExtended,
      OrderedListExtended,
      TaskListExtended,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-list-item'
        }
      }),
      ListItem,
      CustomImage.configure({
        inline: false,
        allowBase64: true
      }),
      CodeBlockLowlightExtended.configure({
        lowlight
      }),
      Placeholder.configure({
        placeholder: 'Start writing...'
      }),
      Table.extend({
        addKeyboardShortcuts() {
          return {
            ...this.parent?.(),
            Tab: () => {
              // Check if we're in a list FIRST
              const isInList =
                this.editor.isActive('bulletList') ||
                this.editor.isActive('orderedList') ||
                this.editor.isActive('taskList')
              if (isInList) {
                // Handle list indentation
                if (this.editor.isActive('taskList')) {
                  this.editor.commands.sinkListItem('taskItem')
                } else {
                  this.editor.commands.sinkListItem('listItem')
                }
                return true
              }
              // Try to go to next cell
              if (this.editor.commands.goToNextCell()) {
                return true
              }
              // If goToNextCell returns false, we're at the last cell
              // Add a new row and move to its first cell (standard Word/Docs behavior)
              this.editor.commands.addRowAfter()
              // Move to the first cell of the new row
              this.editor.commands.goToNextCell()
              return true
            },
            'Shift-Tab': () => {
              // Check if we're in a list FIRST
              const isInList =
                this.editor.isActive('bulletList') ||
                this.editor.isActive('orderedList') ||
                this.editor.isActive('taskList')
              if (isInList) {
                // Handle list outdentation
                if (this.editor.isActive('taskList')) {
                  this.editor.commands.liftListItem('taskItem')
                } else {
                  this.editor.commands.liftListItem('listItem')
                }
                return true
              }
              // Default table behavior: go to previous cell
              return this.editor.commands.goToPreviousCell()
            }
          }
        }
      }).configure({
        resizable: false,
        HTMLAttributes: {
          class: 'editor-table'
        }
      }),
      TableRow,
      TableHeader.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            textAlign: {
              default: 'left',
              parseHTML: (element) => element.style.textAlign || 'left',
              renderHTML: (attributes) => {
                if (!attributes.textAlign || attributes.textAlign === 'left') {
                  return {}
                }
                return {
                  style: `text-align: ${attributes.textAlign}`
                }
              }
            }
          }
        }
      }),
      TableCell.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            textAlign: {
              default: 'left',
              parseHTML: (element) => element.style.textAlign || 'left',
              renderHTML: (attributes) => {
                if (!attributes.textAlign || attributes.textAlign === 'left') {
                  return {}
                }
                return {
                  style: `text-align: ${attributes.textAlign}`
                }
              }
            }
          }
        }
      }),
      TabHandling
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'editor-content'
      },
      handleDOMEvents: {
        contextmenu: (view, event) => {
          const target = event.target as HTMLElement

          // Priority 1: Check if right-click is on an image
          const img = target.closest('img')
          if (img) {
            event.preventDefault()

            // Check if the image has an assetPath (can be embedded)
            const assetPath = img.getAttribute('data-asset-path')
            const canEmbed = !!(assetPath && assetPath.startsWith('.assets/'))

            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              show: true,
              type: 'image',
              canEmbed
            })
            return true
          }

          // Priority 2: Check if right-click is on a table cell
          const cell = target.closest('td, th')
          if (cell) {
            event.preventDefault()
            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              show: true,
              type: 'table'
            })
            return true
          }

          // Priority 3: Check if there's text selection
          const { from, to } = view.state.selection
          const hasSelection = from !== to && view.state.doc.textBetween(from, to).trim().length > 0

          if (hasSelection) {
            event.preventDefault()
            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              show: true,
              type: 'text-selection'
            })
            return true
          }

          // Priority 4: Empty area (no selection, no image, no table)
          event.preventDefault()
          setContextMenu({
            x: event.clientX,
            y: event.clientY,
            show: true,
            type: 'empty-area'
          })
          return true
        },
        click: (_view, event) => {
          // Handle link clicks when Cmd (Mac) or Ctrl (Windows/Linux) is pressed
          const target = event.target as HTMLElement
          const link = target.closest('a')
          if (link && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            const href = link.getAttribute('href')
            if (href) {
              if (href.startsWith('#')) {
                // Internal link - scroll to element
                try {
                  const targetId = decodeURIComponent(href.substring(1))
                  const targetElement = document.getElementById(targetId)
                  if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                } catch (e) {
                  console.error('Failed to decode URI:', e)
                }
              } else if (
                href.endsWith('.md') &&
                !href.startsWith('http://') &&
                !href.startsWith('https://') &&
                !href.startsWith('file://') &&
                !href.startsWith('/')
              ) {
                // Relative markdown file link - open in MarkNotes
                const loadRelativeFile = async (): Promise<void> => {
                  try {
                    // Decode URL-encoded filename (e.g., %20 -> space)
                    const decodedHref = decodeURIComponent(href)

                    // Get current file's directory
                    const currentPath = currentFilePath
                    if (!currentPath) return

                    const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/'))
                    const targetPath = `${currentDir}/${decodedHref}`

                    // Check if file exists
                    const exists = await window.api.file.exists(targetPath)
                    if (!exists) {
                      console.error('File not found:', targetPath)
                      return
                    }

                    // Load the file content
                    setIsLoadingContent(true)
                    const result = await window.api.file.read(targetPath)
                    if (result.success && result.content !== undefined) {
                      const fileName = decodedHref.split('/').pop() || decodedHref
                      setCurrentFile(targetPath, fileName)
                      setContent(result.content)
                      setOriginalContent(result.content)
                    } else {
                      console.error('Failed to load file:', result.error)
                    }
                  } catch (error) {
                    console.error('Failed to open relative file:', error)
                  } finally {
                    setIsLoadingContent(false)
                  }
                }
                loadRelativeFile()
              } else {
                // External link - open in browser
                window.api.shell.openExternal(href).catch((err) => {
                  console.error('Failed to open external link:', err)
                })
              }
            }
            return true
          }
          return false
        }
      }
    },
    onUpdate: ({ editor }) => {
      if (isUpdatingFromMarkdown.current) return

      const html = editor.getHTML()
      const markdown = turndownService.turndown(html)

      // Only update if markdown actually changed
      if (markdown !== lastMarkdownContent.current) {
        lastMarkdownContent.current = markdown
        setContent(markdown)
        updateCounts(markdown)
      }
    },
    onSelectionUpdate: () => {
      // Force re-render to update toolbar button states when cursor moves
      forceUpdate({})
    }
  })

  // Load content into editor when content changes externally
  useEffect(() => {
    if (editor && content !== lastMarkdownContent.current) {
      isUpdatingFromMarkdown.current = true
      const loadContent = async (): Promise<void> => {
        let html = marked.parse(content) as string
        html = postProcessImageSizes(html)
        html = processTaskListsForEditor(html)
        html = await resolveAssetImages(html)
        editor.commands.setContent(html, { emitUpdate: false })
        lastMarkdownContent.current = content
        isUpdatingFromMarkdown.current = false
      }
      loadContent()
    }
  }, [editor, content])

  // Notify when editor is ready
  useEffect(() => {
    if (editor && onReady) {
      onReady()
    }
  }, [editor, onReady])

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = (): void => {
      setContextMenu((prev) => ({ ...prev, show: false }))
    }
    if (contextMenu.show) {
      document.addEventListener('click', handleClick)
      return (): void => {
        document.removeEventListener('click', handleClick)
      }
    }
    return undefined
  }, [contextMenu.show])

  // Close context menu on scroll
  useEffect(() => {
    const handleScroll = (): void => {
      if (contextMenu.show) {
        setContextMenu((prev) => ({ ...prev, show: false }))
      }
    }
    if (contextMenu.show) {
      window.addEventListener('scroll', handleScroll, true)
      return (): void => {
        window.removeEventListener('scroll', handleScroll, true)
      }
    }
    return undefined
  }, [contextMenu.show])

  // Handle markdown mode changes
  const handleMarkdownChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      const newContent = e.target.value
      setContent(newContent)
      updateCounts(newContent)
      lastMarkdownContent.current = newContent

      // Update editor content
      if (editor) {
        isUpdatingFromMarkdown.current = true
        const loadContent = async (): Promise<void> => {
          let html = marked.parse(newContent) as string
          html = postProcessImageSizes(html)
          html = processTaskListsForEditor(html)
          html = await resolveAssetImages(html)
          editor.commands.setContent(html, { emitUpdate: false })
          isUpdatingFromMarkdown.current = false
        }
        loadContent()
      }
    },
    [editor, setContent, updateCounts]
  )

  // Update preview HTML for code/split mode
  useEffect(() => {
    const updatePreview = async (): Promise<void> => {
      let html = marked.parse(content) as string
      html = postProcessImageSizes(html)
      html = processTaskListsForPreview(html)
      html = await resolveAssetImages(html)
      setPreviewHtml(html)
    }
    updatePreview()
  }, [content])

  // Handle link clicks in preview mode
  useEffect(() => {
    const handlePreviewLinkClick = (e: Event): void => {
      const mouseEvent = e as MouseEvent
      const target = mouseEvent.target as HTMLElement
      const link = target.closest('a')
      if (link) {
        mouseEvent.preventDefault()
        const href = link.getAttribute('href')
        if (href) {
          if (href.startsWith('#')) {
            // Internal link - scroll to element
            try {
              const targetId = decodeURIComponent(href.substring(1))
              const targetElement = document.getElementById(targetId)
              if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            } catch (err) {
              console.error('Failed to decode URI:', err)
            }
          } else if (
            href.endsWith('.md') &&
            !href.startsWith('http://') &&
            !href.startsWith('https://') &&
            !href.startsWith('file://') &&
            !href.startsWith('/')
          ) {
            // Relative markdown file link - open in MarkNotes
            const loadRelativeFile = async (): Promise<void> => {
              try {
                // Decode URL-encoded filename (e.g., %20 -> space)
                const decodedHref = decodeURIComponent(href)

                // Get current file's directory
                const currentPath = currentFilePath
                if (!currentPath) return

                const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/'))
                const targetPath = `${currentDir}/${decodedHref}`

                // Check if file exists
                const exists = await window.api.file.exists(targetPath)
                if (!exists) {
                  console.error('File not found:', targetPath)
                  return
                }

                // Load the file content
                setIsLoadingContent(true)
                const result = await window.api.file.read(targetPath)
                if (result.success && result.content !== undefined) {
                  const fileName = decodedHref.split('/').pop() || decodedHref
                  setCurrentFile(targetPath, fileName)
                  setContent(result.content)
                  setOriginalContent(result.content)
                } else {
                  console.error('Failed to load file:', result.error)
                }
              } catch (error) {
                console.error('Failed to open relative file:', error)
              } finally {
                setIsLoadingContent(false)
              }
            }
            loadRelativeFile()
          } else {
            // External link - open in browser
            window.api.shell.openExternal(href).catch((err) => {
              console.error('Failed to open external link:', err)
            })
          }
        }
      }
    }

    const previewContent = document.querySelector('.preview-content')
    if (previewContent) {
      previewContent.addEventListener('click', handlePreviewLinkClick as EventListener)
      return (): void => {
        previewContent.removeEventListener('click', handlePreviewLinkClick as EventListener)
      }
    }
    return undefined
  }, [
    mode,
    content,
    currentFilePath,
    setCurrentFile,
    setContent,
    setOriginalContent,
    setIsLoadingContent
  ])

  // Get context menu items based on type
  const getContextMenuItems = useCallback((): ContextMenuItem[] => {
    if (!editor) return []

    switch (contextMenu.type) {
      case 'text-selection':
        return getTextSelectionMenuItems(editor)
      case 'empty-area':
        return getEmptyAreaMenuItems(editor)
      case 'image':
        return getImageMenuItems(editor, contextMenu.canEmbed ?? false, setAltTextModal)
      case 'table':
        return getTableMenuItems(editor)
      default:
        return []
    }
  }, [editor, contextMenu.type, contextMenu.canEmbed])

  if (isLoadingContent) {
    return (
      <div className="editor-loading">
        <div className="loading-spinner" />
        <span>Loading...</span>
      </div>
    )
  }

  return (
    <div className="editor-container">
      {mode === 'wysiwyg' && (
        <div className="wysiwyg-mode">
          <FormattingToolbar editor={editor} />
          <EditorContent editor={editor} className="wysiwyg-editor" />
          {contextMenu.show && editor && (
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              items={getContextMenuItems()}
              onClose={() => setContextMenu((prev) => ({ ...prev, show: false }))}
              zIndex={1000}
            />
          )}
          <AltTextModal
            isOpen={altTextModal.isOpen}
            initialAlt={altTextModal.currentAlt}
            onClose={() => setAltTextModal({ isOpen: false, currentAlt: '', imagePos: -1 })}
            onSave={(newAlt) => {
              if (altTextModal.imagePos !== -1 && editor) {
                const { state, view } = editor
                const node = state.doc.nodeAt(altTextModal.imagePos)
                if (node) {
                  const tr = state.tr
                  tr.setNodeMarkup(altTextModal.imagePos, undefined, {
                    ...(node.attrs as object),
                    alt: newAlt
                  })
                  view.dispatch(tr)
                }
              }
            }}
          />
        </div>
      )}

      {mode === 'split' && (
        <div className="split-mode">
          <div className="split-pane markdown-pane">
            <div className="pane-header">Markdown</div>
            <textarea
              className="markdown-editor"
              value={content}
              onChange={handleMarkdownChange}
              placeholder="Write markdown here..."
              spellCheck={false}
            />
          </div>
          <div className="split-divider" />
          <div className="split-pane preview-pane">
            <div className="pane-header">Preview</div>
            <div className="preview-content" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>
      )}
    </div>
  )
}

// Context Menu Item Generators
function getTextSelectionMenuItems(editor: TipTapEditor): ContextMenuItem[] {
  return [
    {
      type: 'item',
      label: 'Cut',
      icon: <CutIcon />,
      onClick: () => document.execCommand('cut')
    },
    {
      type: 'item',
      label: 'Copy',
      icon: <CopyIcon />,
      onClick: () => document.execCommand('copy')
    },
    {
      type: 'item',
      label: 'Copy as Markdown',
      icon: <CopyIcon />,
      onClick: async () => {
        const { state } = editor
        const { from, to } = state.selection

        // Serialize selected content to HTML
        const slice = state.doc.slice(from, to)
        const serializer = DOMSerializer.fromSchema(editor.schema)
        const fragment = serializer.serializeFragment(slice.content)
        const div = document.createElement('div')
        div.appendChild(fragment)
        const html = div.innerHTML

        // Convert HTML to markdown
        const markdown = turndownService.turndown(html)

        // Copy to clipboard as plain text
        try {
          await navigator.clipboard.writeText(markdown)
        } catch (err) {
          console.error('Failed to copy as markdown:', err)
        }
      }
    },
    { type: 'divider' },
    {
      type: 'item',
      label: 'Bold',
      icon: <BoldIcon />,
      onClick: () => editor.chain().focus().toggleBold().run(),
      disabled: editor.isActive('heading')
    },
    {
      type: 'item',
      label: 'Italic',
      icon: <ItalicIcon />,
      onClick: () => editor.chain().focus().toggleItalic().run(),
      disabled: editor.isActive('heading')
    },
    {
      type: 'item',
      label: 'Strikethrough',
      icon: <StrikeIcon />,
      onClick: () => editor.chain().focus().toggleStrike().run(),
      disabled: editor.isActive('heading')
    },
    {
      type: 'item',
      label: 'Inline Code',
      icon: <CodeIcon />,
      onClick: () => editor.chain().focus().toggleCode().run(),
      disabled: editor.isActive('heading')
    },
    {
      type: 'item',
      label: editor.isActive('link') ? 'Edit Link' : 'Add Link',
      icon: <LinkIcon />,
      onClick: () => {
        const event = new CustomEvent('open-link-modal')
        document.dispatchEvent(event)
      },
      disabled: editor.isActive('heading')
    },
    { type: 'divider' },
    {
      type: 'item',
      label: 'Numbered List',
      icon: <OrderedListIcon />,
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
      disabled: editor.isActive('heading')
    },
    {
      type: 'item',
      label: 'Bullet List',
      icon: <BulletListIcon />,
      onClick: () => editor.chain().focus().toggleBulletList().run(),
      disabled: editor.isActive('heading')
    },
    {
      type: 'item',
      label: 'Task List',
      icon: <TaskListIcon />,
      onClick: () => editor.chain().focus().toggleTaskList().run(),
      disabled: editor.isActive('heading')
    },
    {
      type: 'item',
      label: 'Indent',
      icon: <IndentIcon />,
      onClick: () => {
        if (editor.isActive('taskList')) {
          editor.chain().focus().sinkListItem('taskItem').run()
        } else {
          editor.chain().focus().sinkListItem('listItem').run()
        }
      },
      disabled: (() => {
        if (editor.isActive('heading')) return true
        const isInList =
          editor.isActive('bulletList') ||
          editor.isActive('orderedList') ||
          editor.isActive('taskList')
        if (!isInList) return true // Disable if not in a list
        if (editor.isActive('taskList')) {
          return !editor.can().sinkListItem('taskItem') // Disable if first item
        }
        return !editor.can().sinkListItem('listItem') // Disable if first item
      })()
    },
    {
      type: 'item',
      label: 'Outdent',
      icon: <OutdentIcon />,
      onClick: () => {
        if (editor.isActive('taskList')) {
          editor.chain().focus().liftListItem('taskItem').run()
        } else {
          editor.chain().focus().liftListItem('listItem').run()
        }
      },
      disabled: (() => {
        if (editor.isActive('heading')) return true
        const isInList =
          editor.isActive('bulletList') ||
          editor.isActive('orderedList') ||
          editor.isActive('taskList')
        if (!isInList) return true // Disable if not in a list
        if (editor.isActive('taskList')) {
          return !editor.can().liftListItem('taskItem') // Disable if lift not possible
        }
        return !editor.can().liftListItem('listItem') // Disable if lift not possible
      })()
    },
    {
      type: 'item',
      label: 'Blockquote',
      icon: <QuoteIcon />,
      onClick: () => editor.chain().focus().toggleBlockquote().run(),
      disabled:
        editor.isActive('heading') ||
        editor.isActive('bulletList') ||
        editor.isActive('orderedList') ||
        editor.isActive('taskList')
    },
    {
      type: 'item',
      label: 'Code Block',
      icon: <CodeBlockIcon />,
      onClick: () => editor.chain().focus().toggleCodeBlock().run(),
      disabled: editor.isActive('heading')
    }
  ]
}

function getEmptyAreaMenuItems(editor: TipTapEditor): ContextMenuItem[] {
  return [
    {
      type: 'item',
      label: 'Paste',
      icon: <PasteIcon />,
      onClick: async () => {
        try {
          // Read all clipboard items (text, images, etc.)
          const clipboardItems = await navigator.clipboard.read()

          for (const item of clipboardItems) {
            // Check for image types
            const imageType = item.types.find((type) => type.startsWith('image/'))
            if (imageType) {
              const blob = await item.getType(imageType)
              const reader = new FileReader()
              reader.onload = (e) => {
                const dataUrl = e.target?.result as string
                editor.chain().focus().setImage({ src: dataUrl }).run()
              }
              reader.readAsDataURL(blob)
              return
            }

            // Check for HTML
            if (item.types.includes('text/html')) {
              const blob = await item.getType('text/html')
              let html = await blob.text()

              // Parse HTML to unwrap unnecessary outer <p> tags
              const parser = new DOMParser()
              const doc = parser.parseFromString(html, 'text/html')
              const body = doc.body

              // If content is a single <p> tag with only inline content, unwrap it
              if (body.children.length === 1 && body.firstElementChild?.tagName === 'P') {
                const p = body.firstElementChild
                // Check if paragraph contains block elements
                const hasBlockElements = Array.from(p.querySelectorAll('*')).some((child) => {
                  const tagName = child.tagName
                  return [
                    'DIV',
                    'P',
                    'H1',
                    'H2',
                    'H3',
                    'H4',
                    'H5',
                    'H6',
                    'UL',
                    'OL',
                    'BLOCKQUOTE',
                    'PRE',
                    'TABLE'
                  ].includes(tagName)
                })

                // If no block elements, unwrap the <p> tag
                if (!hasBlockElements) {
                  html = p.innerHTML
                }
              }

              editor.chain().focus().insertContent(html).run()
              return
            }

            // Fallback to plain text - insert directly without wrapping in <p>
            if (item.types.includes('text/plain')) {
              const blob = await item.getType('text/plain')
              const text = await blob.text()

              // Use low-level transaction to insert text at current position
              // This avoids wrapping in <p> tags and adding line breaks
              const { state, view } = editor
              const { from, to } = state.selection
              const tr = state.tr.insertText(text, from, to)
              view.dispatch(tr)
              editor.commands.focus()
              return
            }
          }
        } catch (err) {
          console.error('Failed to paste:', err)
        }
      }
    },
    {
      type: 'item',
      label: 'Select All',
      icon: <SelectAllIcon />,
      onClick: () => editor.chain().focus().selectAll().run()
    },
    { type: 'divider' },
    {
      type: 'item',
      label: 'Bold',
      icon: <BoldIcon />,
      onClick: () => editor.chain().focus().toggleBold().run(),
      disabled: editor.isActive('heading')
    },
    {
      type: 'item',
      label: 'Italic',
      icon: <ItalicIcon />,
      onClick: () => editor.chain().focus().toggleItalic().run(),
      disabled: editor.isActive('heading')
    },
    {
      type: 'item',
      label: 'Strikethrough',
      icon: <StrikeIcon />,
      onClick: () => editor.chain().focus().toggleStrike().run(),
      disabled: editor.isActive('heading')
    },
    {
      type: 'item',
      label: 'Inline Code',
      icon: <CodeIcon />,
      onClick: () => editor.chain().focus().toggleCode().run(),
      disabled: editor.isActive('heading')
    },
    {
      type: 'item',
      label: editor.isActive('link') ? 'Edit Link' : 'Add Link',
      icon: <LinkIcon />,
      onClick: () => {
        const event = new CustomEvent('open-link-modal')
        document.dispatchEvent(event)
      },
      disabled: editor.isActive('heading')
    },
    { type: 'divider' },
    {
      type: 'item',
      label: 'Numbered List',
      icon: <OrderedListIcon />,
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
      disabled: editor.isActive('heading')
    },
    {
      type: 'item',
      label: 'Bullet List',
      icon: <BulletListIcon />,
      onClick: () => editor.chain().focus().toggleBulletList().run(),
      disabled: editor.isActive('heading')
    },
    {
      type: 'item',
      label: 'Task List',
      icon: <TaskListIcon />,
      onClick: () => editor.chain().focus().toggleTaskList().run(),
      disabled: editor.isActive('heading')
    },
    {
      type: 'item',
      label: 'Indent',
      icon: <IndentIcon />,
      onClick: () => {
        if (editor.isActive('taskList')) {
          editor.chain().focus().sinkListItem('taskItem').run()
        } else {
          editor.chain().focus().sinkListItem('listItem').run()
        }
      },
      disabled: (() => {
        if (editor.isActive('heading')) return true
        const isInList =
          editor.isActive('bulletList') ||
          editor.isActive('orderedList') ||
          editor.isActive('taskList')
        if (!isInList) return true
        if (editor.isActive('taskList')) {
          return !editor.can().sinkListItem('taskItem')
        }
        return !editor.can().sinkListItem('listItem')
      })()
    },
    {
      type: 'item',
      label: 'Outdent',
      icon: <OutdentIcon />,
      onClick: () => {
        if (editor.isActive('taskList')) {
          editor.chain().focus().liftListItem('taskItem').run()
        } else {
          editor.chain().focus().liftListItem('listItem').run()
        }
      },
      disabled: (() => {
        if (editor.isActive('heading')) return true
        const isInList =
          editor.isActive('bulletList') ||
          editor.isActive('orderedList') ||
          editor.isActive('taskList')
        if (!isInList) return true
        if (editor.isActive('taskList')) {
          return !editor.can().liftListItem('taskItem')
        }
        return !editor.can().liftListItem('listItem')
      })()
    },
    {
      type: 'item',
      label: 'Blockquote',
      icon: <QuoteIcon />,
      onClick: () => editor.chain().focus().toggleBlockquote().run(),
      disabled:
        editor.isActive('heading') ||
        editor.isActive('bulletList') ||
        editor.isActive('orderedList') ||
        editor.isActive('taskList')
    },
    {
      type: 'item',
      label: 'Code Block',
      icon: <CodeBlockIcon />,
      onClick: () => editor.chain().focus().toggleCodeBlock().run(),
      disabled: editor.isActive('heading')
    },
    { type: 'divider' },
    {
      type: 'item',
      label: 'Horizontal Rule',
      icon: <HRIcon />,
      onClick: () => editor.chain().focus().setHorizontalRule().run(),
      disabled: editor.isActive('heading')
    },
    {
      type: 'item',
      label: 'Insert Table',
      icon: <TableIcon />,
      onClick: () =>
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      disabled: editor.isActive('heading') || editor.isActive('table')
    },
    {
      type: 'item',
      label: 'Insert Image',
      icon: <ImageIcon />,
      onClick: () => {
        const event = new CustomEvent('open-image-modal')
        document.dispatchEvent(event)
      },
      disabled: editor.isActive('heading')
    }
  ]
}

function getImageMenuItems(
  editor: TipTapEditor,
  canEmbed: boolean,
  setAltTextModal: (value: { isOpen: boolean; currentAlt: string; imagePos: number }) => void
): ContextMenuItem[] {
  const handleResize = (sizeClass: string): void => {
    const { state, view } = editor
    const { selection } = state

    let imagePos = -1
    let imageAttrs: Record<string, unknown> | null = null

    state.doc.descendants((node, pos) => {
      if (node.type.name === 'image') {
        const nodeStart = pos
        const nodeEnd = pos + node.nodeSize

        if (selection.from >= nodeStart && selection.from <= nodeEnd) {
          imagePos = pos
          imageAttrs = node.attrs
          return false
        }
      }
      return true
    })

    if (imagePos !== -1 && imageAttrs) {
      const tr = state.tr
      tr.setNodeMarkup(imagePos, undefined, {
        ...(imageAttrs as object),
        sizeClass
      })
      view.dispatch(tr)
    }
  }

  const handleEditAltText = (): void => {
    const { state } = editor
    const { selection } = state

    let imagePos = -1
    let currentAlt = ''

    state.doc.descendants((node, pos) => {
      if (node.type.name === 'image') {
        const nodeStart = pos
        const nodeEnd = pos + node.nodeSize

        if (selection.from >= nodeStart && selection.from <= nodeEnd) {
          imagePos = pos
          currentAlt = (node.attrs.alt as string) || ''
          return false
        }
      }
      return true
    })

    if (imagePos !== -1) {
      setAltTextModal({ isOpen: true, currentAlt, imagePos })
    }
  }

  const handleEmbedImage = async (): Promise<void> => {
    const { state, view } = editor
    const { selection } = state

    let imagePos = -1
    let imageAttrs: Record<string, unknown> | null = null

    state.doc.descendants((node, pos) => {
      if (node.type.name === 'image') {
        const nodeStart = pos
        const nodeEnd = pos + node.nodeSize

        if (selection.from >= nodeStart && selection.from <= nodeEnd) {
          imagePos = pos
          imageAttrs = node.attrs
          return false
        }
      }
      return true
    })

    if (imagePos !== -1 && imageAttrs) {
      const assetPathValue = imageAttrs['assetPath']
      const srcValue = imageAttrs['src']

      let pathToEmbed: string | null = null

      if (typeof assetPathValue === 'string') {
        const assetPath: string = assetPathValue
        if (assetPath.startsWith('.assets/')) {
          pathToEmbed = assetPath
        }
      } else if (typeof srcValue === 'string') {
        const src: string = srcValue
        if (src.startsWith('.assets/')) {
          pathToEmbed = src
        }
      }

      if (pathToEmbed) {
        try {
          const result = await window.api.image.embedBase64(pathToEmbed)
          if (result.success && result.content) {
            const tr = state.tr
            tr.setNodeMarkup(imagePos, undefined, {
              ...(imageAttrs as object),
              src: result.content,
              assetPath: null
            })
            view.dispatch(tr)
            alert('Image embedded successfully. The document now contains the full image data.')
          } else {
            alert(result.error || 'Failed to embed image')
          }
        } catch {
          alert('Failed to embed image')
        }
      } else {
        alert('Only local .assets images can be embedded')
      }
    }
  }

  const handleDeleteImage = (): void => {
    const { state, view } = editor
    const { selection } = state

    let imagePos = -1

    state.doc.descendants((node, pos) => {
      if (node.type.name === 'image') {
        const nodeStart = pos
        const nodeEnd = pos + node.nodeSize

        if (selection.from >= nodeStart && selection.from <= nodeEnd) {
          imagePos = pos
          return false
        }
      }
      return true
    })

    if (imagePos !== -1) {
      const tr = state.tr
      tr.delete(imagePos, imagePos + 1)
      view.dispatch(tr)
    }
  }

  return [
    {
      type: 'item',
      label: 'Cut Image',
      icon: <CutIcon />,
      onClick: () => document.execCommand('cut')
    },
    {
      type: 'item',
      label: 'Copy Image',
      icon: <CopyIcon />,
      onClick: () => document.execCommand('copy')
    },
    { type: 'divider' },
    {
      type: 'item',
      label: 'Small (300px)',
      icon: <ResizeIcon />,
      onClick: () => handleResize('small')
    },
    {
      type: 'item',
      label: 'Medium (600px)',
      icon: <ResizeIcon />,
      onClick: () => handleResize('medium')
    },
    {
      type: 'item',
      label: 'Large (900px)',
      icon: <ResizeIcon />,
      onClick: () => handleResize('large')
    },
    {
      type: 'item',
      label: 'Original Size',
      icon: <ResizeIcon />,
      onClick: () => handleResize('original')
    },
    { type: 'divider' },
    {
      type: 'item',
      label: 'Edit Alt Text',
      icon: <EditIcon />,
      onClick: handleEditAltText
    },
    {
      type: 'item',
      label: 'Embed in Document',
      icon: <CodeIcon />,
      onClick: handleEmbedImage,
      disabled: !canEmbed
    },
    { type: 'divider' },
    {
      type: 'item',
      label: 'Delete Image',
      icon: <TrashIcon />,
      onClick: handleDeleteImage,
      danger: true
    }
  ]
}

function getTableMenuItems(editor: TipTapEditor): ContextMenuItem[] {
  const setCellAlignment = (alignment: 'left' | 'center' | 'right'): void => {
    const { state, view } = editor
    const { selection } = state

    let colIndex = -1
    let tableStart = -1
    let foundTable = false

    state.doc.descendants((node, pos) => {
      if (foundTable) return false

      if (
        node.type.name === 'table' &&
        pos < selection.from &&
        pos + node.nodeSize > selection.from
      ) {
        tableStart = pos
        foundTable = true

        let currentPos = pos + 1
        let foundRow = false

        for (let i = 0; i < node.childCount; i++) {
          const row = node.child(i)
          if (currentPos < selection.from && currentPos + row.nodeSize > selection.from) {
            let cellIndex = 0
            let cellPos = currentPos + 1

            for (let j = 0; j < row.childCount; j++) {
              const cell = row.child(j)
              if (cellPos <= selection.from && cellPos + cell.nodeSize > selection.from) {
                colIndex = cellIndex
                foundRow = true
                break
              }
              cellIndex++
              cellPos += cell.nodeSize
            }

            if (foundRow) break
          }
          currentPos += row.nodeSize
        }

        return false
      }
      return true
    })

    if (colIndex === -1 || tableStart === -1) return

    const table = state.doc.nodeAt(tableStart)
    if (!table) return

    const tr = state.tr

    let currentPos = tableStart + 1
    for (let i = 0; i < table.childCount; i++) {
      const row = table.child(i)
      let cellIndex = 0
      let cellPos = currentPos + 1

      for (let j = 0; j < row.childCount; j++) {
        const cell = row.child(j)
        if (cellIndex === colIndex) {
          tr.setNodeMarkup(cellPos, undefined, {
            ...cell.attrs,
            textAlign: alignment
          })
        }
        cellIndex++
        cellPos += cell.nodeSize
      }
      currentPos += row.nodeSize
    }

    view.dispatch(tr)
  }

  return [
    {
      type: 'item',
      label: 'Add Row Above',
      icon: <ArrowUpIcon />,
      onClick: () => editor.chain().focus().addRowBefore().run()
    },
    {
      type: 'item',
      label: 'Add Row Below',
      icon: <ArrowDownIcon />,
      onClick: () => editor.chain().focus().addRowAfter().run()
    },
    { type: 'divider' },
    {
      type: 'item',
      label: 'Add Column Left',
      icon: <ArrowLeftIcon />,
      onClick: () => editor.chain().focus().addColumnBefore().run()
    },
    {
      type: 'item',
      label: 'Add Column Right',
      icon: <ArrowRightIcon />,
      onClick: () => editor.chain().focus().addColumnAfter().run()
    },
    { type: 'divider' },
    {
      type: 'item',
      label: 'Align Left',
      icon: <AlignLeftIcon />,
      onClick: () => setCellAlignment('left')
    },
    {
      type: 'item',
      label: 'Align Center',
      icon: <AlignCenterIcon />,
      onClick: () => setCellAlignment('center')
    },
    {
      type: 'item',
      label: 'Align Right',
      icon: <AlignRightIcon />,
      onClick: () => setCellAlignment('right')
    },
    { type: 'divider' },
    {
      type: 'item',
      label: 'Delete Row',
      icon: <TrashIcon />,
      onClick: () => {
        const { state } = editor
        const { selection } = state
        const { $from } = selection

        // Check if we're in a table
        const table = $from.node(-3) // Go up to the table node
        if (table && table.type.name === 'table') {
          const rowCount = table.childCount

          // If only one row remains, delete the entire table
          if (rowCount <= 1) {
            editor.chain().focus().deleteTable().run()
            return
          }
        }

        editor.chain().focus().deleteRow().run()
      },
      danger: true
    },
    {
      type: 'item',
      label: 'Delete Column',
      icon: <TrashIcon />,
      onClick: () => editor.chain().focus().deleteColumn().run(),
      danger: true
    },
    {
      type: 'item',
      label: 'Delete Table',
      icon: <TrashIcon />,
      onClick: () => editor.chain().focus().deleteTable().run(),
      danger: true
    }
  ]
}

// Formatting Toolbar Component
interface FormattingToolbarProps {
  editor: TipTapEditor | null
}

function FormattingToolbar({ editor }: FormattingToolbarProps): React.JSX.Element | null {
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [linkModalData, setLinkModalData] = useState<{
    text: string
    url: string
    isEditing: boolean
  }>({
    text: '',
    url: '',
    isEditing: false
  })
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [imageModalData, setImageModalData] = useState<{ alt: string }>({
    alt: ''
  })

  const handleLinkButtonClick = useCallback((): void => {
    if (!editor) return
    const { state } = editor
    const { from, to, $from } = state.selection
    let selectedText = state.doc.textBetween(from, to, '')

    // Get existing link URL if selection is within a link
    const linkAttrs = editor.getAttributes('link')
    const existingUrl = linkAttrs.href || ''

    // If cursor is inside a link (not just a selection), extract the full link text
    if (!selectedText && editor.isActive('link')) {
      // Find the link mark at cursor position
      const marks = $from.marks()
      const linkMark = marks.find((mark) => mark.type.name === 'link')

      if (linkMark) {
        // Find the range of the link mark
        let linkStart = from
        let linkEnd = from

        // Scan backward to find link start
        let pos = from - 1
        while (pos >= 0) {
          const resolvedPos = state.doc.resolve(pos)
          const marksAtPos = resolvedPos.marks()
          if (
            !marksAtPos.some((m) => m.type.name === 'link' && m.attrs.href === linkMark.attrs.href)
          ) {
            linkStart = pos + 1
            break
          }
          pos--
        }
        if (pos < 0) linkStart = 0

        // Scan forward to find link end
        pos = from
        const docSize = state.doc.content.size
        while (pos < docSize) {
          const resolvedPos = state.doc.resolve(pos)
          const marksAtPos = resolvedPos.marks()
          if (
            !marksAtPos.some((m) => m.type.name === 'link' && m.attrs.href === linkMark.attrs.href)
          ) {
            linkEnd = pos
            break
          }
          pos++
        }
        if (pos >= docSize) linkEnd = docSize

        // Extract text from the link range
        selectedText = state.doc.textBetween(linkStart, linkEnd, '')
      }
    }

    setLinkModalData({
      text: selectedText,
      url: existingUrl,
      isEditing: editor.isActive('link')
    })
    setLinkModalOpen(true)
  }, [editor])

  const handleLinkInsert = (text: string, url: string): void => {
    if (!editor) return
    const { state } = editor
    const { from, to, $from } = state.selection
    const hasSelection = from !== to

    // Check if we're editing an existing link
    const isEditingLink = editor.isActive('link')

    if (isEditingLink && !hasSelection) {
      // Editing an existing link (cursor is inside link, no selection)
      // Find the link mark at cursor position
      const marks = $from.marks()
      const linkMark = marks.find((mark) => mark.type.name === 'link')

      if (linkMark) {
        // Find the range of the link mark
        let linkStart = from
        let linkEnd = from

        // Scan backward to find link start
        let pos = from - 1
        while (pos >= 0) {
          const resolvedPos = state.doc.resolve(pos)
          const marksAtPos = resolvedPos.marks()
          if (
            !marksAtPos.some((m) => m.type.name === 'link' && m.attrs.href === linkMark.attrs.href)
          ) {
            linkStart = pos + 1
            break
          }
          pos--
        }
        if (pos < 0) linkStart = 0

        // Scan forward to find link end
        pos = from
        const docSize = state.doc.content.size
        while (pos < docSize) {
          const resolvedPos = state.doc.resolve(pos)
          const marksAtPos = resolvedPos.marks()
          if (
            !marksAtPos.some((m) => m.type.name === 'link' && m.attrs.href === linkMark.attrs.href)
          ) {
            linkEnd = pos
            break
          }
          pos++
        }
        if (pos >= docSize) linkEnd = docSize

        // Replace the link's text and URL
        const tr = state.tr
        tr.removeMark(linkStart, linkEnd, editor.schema.marks.link)
        tr.insertText(text, linkStart, linkEnd)
        tr.addMark(
          linkStart,
          linkStart + text.length,
          editor.schema.marks.link.create({ href: url })
        )
        editor.view.dispatch(tr)

        // Move cursor to end of link
        editor.commands.focus()
        editor.commands.setTextSelection(linkStart + text.length)
        return
      }
    }

    if (hasSelection) {
      // Update existing selection with link
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    } else {
      // Insert new text with link
      editor.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run()
    }
  }

  const handleImageButtonClick = useCallback((): void => {
    setImageModalData({
      alt: ''
    })
    setImageModalOpen(true)
  }, [])

  // Handle Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        // Block if heading is active
        if (editor?.isActive('heading')) {
          return
        }
        handleLinkButtonClick()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleLinkButtonClick, editor])

  // Listen for custom events from context menus
  useEffect(() => {
    const handleOpenLinkModal = (): void => {
      handleLinkButtonClick()
    }

    const handleOpenImageModal = (): void => {
      handleImageButtonClick()
    }

    document.addEventListener('open-link-modal', handleOpenLinkModal)
    document.addEventListener('open-image-modal', handleOpenImageModal)

    return () => {
      document.removeEventListener('open-link-modal', handleOpenLinkModal)
      document.removeEventListener('open-image-modal', handleOpenImageModal)
    }
  }, [handleLinkButtonClick, handleImageButtonClick])

  if (!editor) return null

  const insertTable = (): void => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  const handleImageInsert = async (src: string, alt: string): Promise<void> => {
    if (!editor) return
    // Resolve .assets paths to data URLs for display
    let displaySrc = src
    let assetPath: string | null = null

    if (src.startsWith('.assets/')) {
      assetPath = src // Store original .assets path
      const result = await window.api.image.resolveAssetPath(src)
      if (result.success && result.content) {
        displaySrc = result.content
      }
    }

    // Insert image
    editor.chain().focus().setImage({ src: displaySrc, alt }).run()

    // If this is an .assets image, update the assetPath attribute
    if (assetPath) {
      const { state } = editor
      let imagePos = -1

      state.doc.descendants((node, pos) => {
        if (node.type.name === 'image' && node.attrs.src === displaySrc) {
          imagePos = pos
          return false
        }
        return true
      })

      if (imagePos !== -1) {
        const tr = state.tr
        const node = state.doc.nodeAt(imagePos)
        if (node) {
          tr.setNodeMarkup(imagePos, undefined, {
            ...(node.attrs as object),
            assetPath
          })
          editor.view.dispatch(tr)
        }
      }
    }
  }

  return (
    <div className="formatting-toolbar">
      <div className="toolbar-group">
        <button
          className="format-btn"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          data-tooltip="Undo (Cmd+Z)"
        >
          <UndoIcon />
        </button>
        <button
          className="format-btn"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          data-tooltip="Redo (Cmd+Shift+Z)"
        >
          <RedoIcon />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <select
          className="format-select"
          value={
            editor.isActive('heading', { level: 1 })
              ? 'h1'
              : editor.isActive('heading', { level: 2 })
                ? 'h2'
                : editor.isActive('heading', { level: 3 })
                  ? 'h3'
                  : editor.isActive('heading', { level: 4 })
                    ? 'h4'
                    : editor.isActive('heading', { level: 5 })
                      ? 'h5'
                      : editor.isActive('heading', { level: 6 })
                        ? 'h6'
                        : 'p'
          }
          onChange={(e) => {
            const value = e.target.value
            if (value === 'p') {
              editor.chain().focus().setParagraph().run()
            } else {
              const level = parseInt(value.replace('h', '')) as 1 | 2 | 3 | 4 | 5 | 6
              editor.chain().focus().toggleHeading({ level }).run()
            }
          }}
          data-tooltip="Text style"
        >
          <option value="p">Normal Text</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="h5">Heading 5</option>
          <option value="h6">Heading 6</option>
        </select>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          className={`format-btn ${editor.isActive('bold') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={editor.isActive('heading')}
          data-tooltip="Bold (Cmd+B)"
        >
          <BoldIcon />
        </button>
        <button
          className={`format-btn ${editor.isActive('italic') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={editor.isActive('heading')}
          data-tooltip="Italic (Cmd+I)"
        >
          <ItalicIcon />
        </button>
        <button
          className={`format-btn ${editor.isActive('strike') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={editor.isActive('heading')}
          data-tooltip="Strikethrough (Cmd+Shift+X)"
        >
          <StrikeIcon />
        </button>
        <button
          className={`format-btn ${editor.isActive('code') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={editor.isActive('heading')}
          data-tooltip="Inline Code (Cmd+E)"
        >
          <CodeIcon />
        </button>
        <button
          className={`format-btn ${editor.isActive('link') ? 'active' : ''}`}
          onClick={handleLinkButtonClick}
          disabled={editor.isActive('heading')}
          data-tooltip="Insert Link (Cmd+K)"
        >
          <LinkIcon />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          className={`format-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={editor.isActive('heading')}
          data-tooltip="Numbered List (Cmd+Shift+7)"
        >
          <OrderedListIcon />
        </button>
        <button
          className={`format-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={editor.isActive('heading')}
          data-tooltip="Bullet List (Cmd+Shift+8)"
        >
          <BulletListIcon />
        </button>
        <button
          className={`format-btn ${editor.isActive('taskList') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          disabled={editor.isActive('heading')}
          data-tooltip="Task List (Cmd+Shift+9)"
        >
          <TaskListIcon />
        </button>
        <button
          className="format-btn"
          onClick={() => {
            if (editor.isActive('taskList')) {
              editor.chain().focus().sinkListItem('taskItem').run()
            } else {
              editor.chain().focus().sinkListItem('listItem').run()
            }
          }}
          disabled={(() => {
            if (editor.isActive('heading')) return true
            const isInList =
              editor.isActive('bulletList') ||
              editor.isActive('orderedList') ||
              editor.isActive('taskList')
            if (!isInList) return true // Disable if not in a list
            if (editor.isActive('taskList')) {
              return !editor.can().sinkListItem('taskItem') // Disable if first item
            }
            return !editor.can().sinkListItem('listItem') // Disable if first item
          })()}
          data-tooltip="Indent (Tab)"
        >
          <IndentIcon />
        </button>
        <button
          className="format-btn"
          onClick={() => {
            if (editor.isActive('taskList')) {
              editor.chain().focus().liftListItem('taskItem').run()
            } else {
              editor.chain().focus().liftListItem('listItem').run()
            }
          }}
          disabled={(() => {
            if (editor.isActive('heading')) return true
            const isInList =
              editor.isActive('bulletList') ||
              editor.isActive('orderedList') ||
              editor.isActive('taskList')
            if (!isInList) return true // Disable if not in a list
            if (editor.isActive('taskList')) {
              return !editor.can().liftListItem('taskItem') // Disable if lift not possible
            }
            return !editor.can().liftListItem('listItem') // Disable if lift not possible
          })()}
          data-tooltip="Outdent (Shift+Tab)"
        >
          <OutdentIcon />
        </button>
        <button
          className={`format-btn ${editor.isActive('blockquote') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          disabled={
            editor.isActive('heading') ||
            editor.isActive('bulletList') ||
            editor.isActive('orderedList') ||
            editor.isActive('taskList')
          }
          data-tooltip="Blockquote (Cmd+Shift+B)"
        >
          <QuoteIcon />
        </button>
        <button
          className={`format-btn ${editor.isActive('codeBlock') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          disabled={editor.isActive('heading')}
          data-tooltip="Code Block (Cmd+Option+C)"
        >
          <CodeBlockIcon />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          className="format-btn"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          disabled={editor.isActive('heading')}
          data-tooltip="Horizontal Rule"
        >
          <HRIcon />
        </button>
        <button
          className="format-btn"
          onClick={insertTable}
          disabled={editor.isActive('heading') || editor.isActive('table')}
          data-tooltip="Insert Table"
        >
          <TableIcon />
        </button>
        <button
          className="format-btn"
          onClick={handleImageButtonClick}
          disabled={editor.isActive('heading')}
          data-tooltip="Insert Image"
        >
          <ImageIcon />
        </button>
      </div>

      <LinkModal
        isOpen={linkModalOpen}
        initialText={linkModalData.text}
        initialUrl={linkModalData.url}
        isEditing={linkModalData.isEditing}
        onClose={() => setLinkModalOpen(false)}
        onInsert={handleLinkInsert}
      />

      <ImageModal
        isOpen={imageModalOpen}
        initialAlt={imageModalData.alt}
        onClose={() => setImageModalOpen(false)}
        onInsert={handleImageInsert}
      />
    </div>
  )
}

// Undo and Redo icons (not in utils/icons since they're only used in toolbar)
function UndoIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"
      />
      <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z" />
    </svg>
  )
}

function RedoIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"
      />
      <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
    </svg>
  )
}
