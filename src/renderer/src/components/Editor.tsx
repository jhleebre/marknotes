import { useEffect, useCallback, useRef, useState } from 'react'
import { useEditor, EditorContent, Editor as TipTapEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Heading from '@tiptap/extension-heading'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Link from '@tiptap/extension-link'
import Strike from '@tiptap/extension-strike'
import TipTapImage from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { common, createLowlight } from 'lowlight'
import { marked } from 'marked'
import TurndownService from 'turndown'
import { useDocumentStore } from '../store/useDocumentStore'
import { LinkModal } from './LinkModal'
import { ImageModal } from './ImageModal'
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

        // Check if we're inside a table
        const isInTable = $from.node(-1)?.type.name === 'tableCell' || $from.node(-1)?.type.name === 'tableHeader'
        if (isInTable) {
          // Let table extension handle it (go to next cell)
          return false
        }

        // Check if we're in a list
        const isInList = this.editor.isActive('bulletList') || this.editor.isActive('orderedList')
        if (isInList) {
          // Sink list item (increase indent)
          return this.editor.commands.sinkListItem('listItem')
        }

        // For regular text, insert tab character
        return this.editor.commands.insertContent('\t')
      },
      'Shift-Tab': () => {
        const { state } = this.editor
        const { selection } = state
        const { $from } = selection

        // Check if we're inside a table
        const isInTable = $from.node(-1)?.type.name === 'tableCell' || $from.node(-1)?.type.name === 'tableHeader'
        if (isInTable) {
          // Let table extension handle it (go to previous cell)
          return false
        }

        // Check if we're in a list
        const isInList = this.editor.isActive('bulletList') || this.editor.isActive('orderedList')
        if (isInList) {
          // Lift list item (decrease indent)
          return this.editor.commands.liftListItem('listItem')
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

        return false
      }
    }
  }
})

// Configure marked for GFM table support and heading IDs
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

// Custom table cell renderer to apply alignment from markdown
renderer.tablecell = function (token) {
  const text = token.text
  const type = token.header ? 'th' : 'td'
  const align = token.align
  const style = align ? ` style="text-align: ${align}"` : ''
  return `<${type}${style}>${text}</${type}>\n`
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
        const text = cell.textContent?.trim() || ''
        return text.replace(/\|/g, '\\|').replace(/\n/g, ' ')
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
    content = content.replace(/^\n+/, '').replace(/\n+$/, '\n').replace(/\n/gm, '\n  ')

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
  const { mode, content, setContent, updateCounts, isLoadingContent } = useDocumentStore()
  const isUpdatingFromMarkdown = useRef(false)
  const lastMarkdownContent = useRef('')
  const [, forceUpdate] = useState({})
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    show: boolean
    type: 'table' | 'image' | null
    canEmbed?: boolean
  }>({ x: 0, y: 0, show: false, type: null, canEmbed: false })
  const [previewHtml, setPreviewHtml] = useState<string>('')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: false, // Disable default heading to use our extended version
        link: false, // Disable default link to use our custom one
        strike: false // Disable default strike to use custom keyboard shortcut
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
            'Mod-Shift-x': () => this.editor.commands.toggleStrike()
          }
        }
      }),
      TabHandling,
      CustomImage.configure({
        inline: false,
        allowBase64: true
      }),
      CodeBlockLowlight.configure({
        lowlight
      }),
      Placeholder.configure({
        placeholder: 'Start writing...'
      }),
      Table.configure({
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
      })
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'editor-content'
      },
      handleDOMEvents: {
        contextmenu: (_view, event) => {
          const target = event.target as HTMLElement

          // Check if right-click is on an image
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

          // Check if right-click is on a table cell
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

          return false
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
  }, [mode, content])

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
          {contextMenu.show && editor && contextMenu.type === 'table' && (
            <TableContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              editor={editor}
              onClose={() => setContextMenu((prev) => ({ ...prev, show: false }))}
            />
          )}
          {contextMenu.show && editor && contextMenu.type === 'image' && (
            <ImageContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              editor={editor}
              onClose={() => setContextMenu((prev) => ({ ...prev, show: false }))}
              canEmbed={contextMenu.canEmbed ?? false}
            />
          )}
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

// Table Context Menu Component
interface TableContextMenuProps {
  x: number
  y: number
  editor: TipTapEditor
  onClose: () => void
}

function TableContextMenu({ x, y, editor, onClose }: TableContextMenuProps): React.JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x, y })

  // Adjust position to stay within viewport
  useEffect(() => {
    if (menuRef.current) {
      const menu = menuRef.current
      const rect = menu.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let adjustedX = x
      let adjustedY = y

      // Adjust horizontal position
      if (x + rect.width > viewportWidth) {
        adjustedX = Math.max(8, viewportWidth - rect.width - 8)
      }

      // Adjust vertical position - show above if too close to bottom
      if (y + rect.height > viewportHeight) {
        adjustedY = Math.max(8, y - rect.height)
      }

      // Ensure minimum distance from edges
      adjustedX = Math.max(8, adjustedX)
      adjustedY = Math.max(8, adjustedY)

      setPosition({ x: adjustedX, y: adjustedY })
    }
  }, [x, y])

  const handleAction = (action: () => void): void => {
    action()
    onClose()
  }

  const setCellAlignment = (alignment: 'left' | 'center' | 'right'): void => {
    const { state, view } = editor
    const { selection } = state

    // Find the column index by checking the current cell position
    let colIndex = -1
    let tableStart = -1
    let foundTable = false

    // Walk up to find table and calculate column index
    state.doc.descendants((node, pos) => {
      if (foundTable) return false

      if (node.type.name === 'table' && pos < selection.from && pos + node.nodeSize > selection.from) {
        tableStart = pos
        foundTable = true

        // Find which column we're in
        let currentPos = pos + 1
        let foundRow = false

        for (let i = 0; i < node.childCount; i++) {
          const row = node.child(i)
          if (currentPos < selection.from && currentPos + row.nodeSize > selection.from) {
            // We're in this row
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

    if (colIndex === -1 || tableStart === -1) {
      onClose()
      return
    }

    const table = state.doc.nodeAt(tableStart)
    if (!table) {
      onClose()
      return
    }

    const tr = state.tr

    // Update all cells in the same column
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
    onClose()
  }

  return (
    <div
      ref={menuRef}
      className="table-context-menu"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="context-menu-item"
        onClick={() => handleAction(() => editor.chain().focus().addRowBefore().run())}
      >
        Add Row Above
      </button>
      <button
        className="context-menu-item"
        onClick={() => handleAction(() => editor.chain().focus().addRowAfter().run())}
      >
        Add Row Below
      </button>
      <div className="context-menu-divider" />
      <button
        className="context-menu-item"
        onClick={() => handleAction(() => editor.chain().focus().addColumnBefore().run())}
      >
        Add Column Left
      </button>
      <button
        className="context-menu-item"
        onClick={() => handleAction(() => editor.chain().focus().addColumnAfter().run())}
      >
        Add Column Right
      </button>
      <div className="context-menu-divider" />
      <div className="context-menu-section-label">Align Cell</div>
      <button className="context-menu-item" onClick={() => setCellAlignment('left')}>
        <AlignLeftIcon />
        <span>Align Left</span>
      </button>
      <button className="context-menu-item" onClick={() => setCellAlignment('center')}>
        <AlignCenterIcon />
        <span>Align Center</span>
      </button>
      <button className="context-menu-item" onClick={() => setCellAlignment('right')}>
        <AlignRightIcon />
        <span>Align Right</span>
      </button>
      <div className="context-menu-divider" />
      <button
        className="context-menu-item context-menu-item-danger"
        onClick={() => handleAction(() => editor.chain().focus().deleteRow().run())}
      >
        Delete Row
      </button>
      <button
        className="context-menu-item context-menu-item-danger"
        onClick={() => handleAction(() => editor.chain().focus().deleteColumn().run())}
      >
        Delete Column
      </button>
      <button
        className="context-menu-item context-menu-item-danger"
        onClick={() => handleAction(() => editor.chain().focus().deleteTable().run())}
      >
        Delete Table
      </button>
    </div>
  )
}

// Image Context Menu Component
interface ImageContextMenuProps {
  x: number
  y: number
  editor: TipTapEditor
  onClose: () => void
  canEmbed: boolean
}

function ImageContextMenu({
  x,
  y,
  editor,
  onClose,
  canEmbed
}: ImageContextMenuProps): React.JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x, y })

  // Adjust position to stay within viewport
  useEffect(() => {
    if (menuRef.current) {
      const menu = menuRef.current
      const rect = menu.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let adjustedX = x
      let adjustedY = y

      // Adjust horizontal position
      if (x + rect.width > viewportWidth) {
        adjustedX = Math.max(8, viewportWidth - rect.width - 8)
      }

      // Adjust vertical position - show above if too close to bottom
      if (y + rect.height > viewportHeight) {
        adjustedY = Math.max(8, y - rect.height)
      }

      // Ensure minimum distance from edges
      adjustedX = Math.max(8, adjustedX)
      adjustedY = Math.max(8, adjustedY)

      setPosition({ x: adjustedX, y: adjustedY })
    }
  }, [x, y])

  const handleAction = (action: () => void): void => {
    action()
    onClose()
  }

  const handleResize = (sizeClass: string): void => {
    // Find the selected image node and update its sizeClass
    const { state, view } = editor
    const { selection } = state

    // Find the image node at the current position
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

    onClose()
  }

  const handleEmbedImage = async (): Promise<void> => {
    const { state, view } = editor
    const { selection } = state

    // Find the image node
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
      // Check if this is a .assets image (stored in assetPath attribute)
      const assetPathValue = imageAttrs['assetPath']
      const srcValue = imageAttrs['src']

      let pathToEmbed: string | null = null

      // First check assetPath (for already resolved images)
      if (typeof assetPathValue === 'string') {
        const assetPath: string = assetPathValue
        if (assetPath.startsWith('.assets/')) {
          pathToEmbed = assetPath
        }
      }
      // Fallback to src if it's still a .assets path (shouldn't happen but just in case)
      else if (typeof srcValue === 'string') {
        const src: string = srcValue
        if (src.startsWith('.assets/')) {
          pathToEmbed = src
        }
      }

      if (pathToEmbed) {
        try {
          const result = await window.api.image.embedBase64(pathToEmbed)
          if (result.success && result.content) {
            // Update image src with data URL and remove assetPath
            const tr = state.tr
            tr.setNodeMarkup(imagePos, undefined, {
              ...(imageAttrs as object),
              src: result.content,
              assetPath: null // Remove assetPath since it's now fully embedded
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

    onClose()
  }

  const handleCopyImage = (): void => {
    // Use the native copy command (same as Cmd+C)
    // This preserves the HTML structure including assetPath attributes
    document.execCommand('copy')
    onClose()
  }

  const handleRemoveImage = (): void => {
    const { state, view } = editor
    const { selection } = state

    // Find and delete the image node
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

    onClose()
  }

  return (
    <div
      ref={menuRef}
      className="table-context-menu"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="context-menu-section-label">Resize</div>
      <button className="context-menu-item" onClick={() => handleResize('small')}>
        Small (300px)
      </button>
      <button className="context-menu-item" onClick={() => handleResize('medium')}>
        Medium (600px)
      </button>
      <button className="context-menu-item" onClick={() => handleResize('large')}>
        Large (900px)
      </button>
      <button className="context-menu-item" onClick={() => handleResize('original')}>
        Original Size
      </button>
      <div className="context-menu-divider" />
      <button className="context-menu-item" onClick={() => handleAction(handleCopyImage)}>
        Copy Image
      </button>
      <button
        className="context-menu-item"
        onClick={() => handleAction(handleEmbedImage)}
        disabled={!canEmbed}
        title={
          canEmbed ? 'Convert to embedded base64 image' : 'Image is already embedded or is from URL'
        }
      >
        Embed Image (Base64)
      </button>
      <div className="context-menu-divider" />
      <button
        className="context-menu-item context-menu-item-danger"
        onClick={() => handleAction(handleRemoveImage)}
      >
        Remove Image
      </button>
    </div>
  )
}

// Formatting Toolbar Component
interface FormattingToolbarProps {
  editor: TipTapEditor | null
}

function FormattingToolbar({ editor }: FormattingToolbarProps): React.JSX.Element | null {
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [linkModalData, setLinkModalData] = useState<{ text: string; url: string }>({
    text: '',
    url: ''
  })
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [imageModalData, setImageModalData] = useState<{ alt: string }>({
    alt: ''
  })

  const handleLinkButtonClick = useCallback((): void => {
    if (!editor) return
    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to, '')

    // Get existing link URL if selection is within a link
    const linkAttrs = editor.getAttributes('link')
    const existingUrl = linkAttrs.href || ''

    setLinkModalData({
      text: selectedText,
      url: existingUrl
    })
    setLinkModalOpen(true)
  }, [editor])

  const handleLinkInsert = (text: string, url: string): void => {
    if (!editor) return
    const { from, to } = editor.state.selection
    const hasSelection = from !== to

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
        handleLinkButtonClick()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleLinkButtonClick])

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
        <button
          className={`format-btn ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          data-tooltip="Heading 1 (Cmd+Option+1)"
        >
          H1
        </button>
        <button
          className={`format-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          data-tooltip="Heading 2 (Cmd+Option+2)"
        >
          H2
        </button>
        <button
          className={`format-btn ${editor.isActive('heading', { level: 3 }) ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          data-tooltip="Heading 3 (Cmd+Option+3)"
        >
          H3
        </button>
        <button
          className={`format-btn ${editor.isActive('heading', { level: 4 }) ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          data-tooltip="Heading 4 (Cmd+Option+4)"
        >
          H4
        </button>
        <button
          className={`format-btn ${editor.isActive('heading', { level: 5 }) ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
          data-tooltip="Heading 5 (Cmd+Option+5)"
        >
          H5
        </button>
        <button
          className={`format-btn ${editor.isActive('heading', { level: 6 }) ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
          data-tooltip="Heading 6 (Cmd+Option+6)"
        >
          H6
        </button>
        <button
          className={`format-btn ${editor.isActive('paragraph') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().setParagraph().run()}
          data-tooltip="Paragraph (Cmd+Option+0)"
        >
          P
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          className={`format-btn ${editor.isActive('bold') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          data-tooltip="Bold (Cmd+B)"
        >
          <BoldIcon />
        </button>
        <button
          className={`format-btn ${editor.isActive('italic') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          data-tooltip="Italic (Cmd+I)"
        >
          <ItalicIcon />
        </button>
        <button
          className={`format-btn ${editor.isActive('strike') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          data-tooltip="Strikethrough (Cmd+Shift+X)"
        >
          <StrikeIcon />
        </button>
        <button
          className={`format-btn ${editor.isActive('code') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleCode().run()}
          data-tooltip="Inline Code (Cmd+E)"
        >
          <CodeIcon />
        </button>
        <button
          className={`format-btn ${editor.isActive('link') ? 'active' : ''}`}
          onClick={handleLinkButtonClick}
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
          data-tooltip="Numbered List (Cmd+Shift+7)"
        >
          <OrderedListIcon />
        </button>
        <button
          className={`format-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          data-tooltip="Bullet List (Cmd+Shift+8)"
        >
          <BulletListIcon />
        </button>
        <button
          className="format-btn"
          onClick={() => {
            const isInList = editor.isActive('bulletList') || editor.isActive('orderedList')
            if (isInList) {
              editor.chain().focus().sinkListItem('listItem').run()
            } else {
              editor.chain().focus().insertContent('\t').run()
            }
          }}
          data-tooltip="Increase Indent (Tab)"
        >
          <IndentIcon />
        </button>
        <button
          className="format-btn"
          onClick={() => {
            const isInList = editor.isActive('bulletList') || editor.isActive('orderedList')
            if (isInList) {
              editor.chain().focus().liftListItem('listItem').run()
            }
          }}
          data-tooltip="Decrease Indent (Shift+Tab)"
        >
          <OutdentIcon />
        </button>
        <button
          className={`format-btn ${editor.isActive('blockquote') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          data-tooltip="Blockquote (Cmd+Shift+B)"
        >
          <QuoteIcon />
        </button>
        <button
          className={`format-btn ${editor.isActive('codeBlock') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
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
          data-tooltip="Horizontal Rule"
        >
          <HRIcon />
        </button>
        <button className="format-btn" onClick={insertTable} data-tooltip="Insert Table">
          <TableIcon />
        </button>
        <button className="format-btn" onClick={handleImageButtonClick} data-tooltip="Insert Image">
          <ImageIcon />
        </button>
      </div>

      <LinkModal
        isOpen={linkModalOpen}
        initialText={linkModalData.text}
        initialUrl={linkModalData.url}
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

// Icons
function BoldIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4 2a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h5.5a3.5 3.5 0 0 0 1.852-6.47A3.5 3.5 0 0 0 8.5 2H4zm4.5 5a1.5 1.5 0 1 1 0-3H8.5a1.5 1.5 0 0 1 0 3h-.5zm0 2H9.5a1.5 1.5 0 0 1 0 3H5V9h3.5z" />
    </svg>
  )
}

function ItalicIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M7.991 11.674 9.53 4.455c.123-.595.246-.71 1.347-.807l.11-.52H6.68l-.11.52c1.06.096 1.128.212 1.005.807L6.036 11.674c-.123.595-.246.71-1.346.806l-.11.52h4.306l.11-.52c-1.06-.095-1.129-.211-1.005-.806z" />
    </svg>
  )
}

function StrikeIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M6.333 5.686c0 .31.083.581.27.814H5.166a2.776 2.776 0 0 1-.099-.76c0-1.627 1.436-2.768 3.48-2.768 1.969 0 3.39 1.175 3.445 2.85h-1.23c-.11-1.08-.964-1.743-2.25-1.743-1.23 0-2.18.602-2.18 1.607zm2.194 7.478c-2.153 0-3.589-1.107-3.705-2.81h1.23c.144 1.06 1.129 1.703 2.544 1.703 1.34 0 2.31-.705 2.31-1.675 0-.827-.547-1.374-1.914-1.675L7.667 8.486H14v-1H2v1h2.5c-.917.54-1.5 1.404-1.5 2.514 0 1.736 1.503 2.864 3.527 2.864z" />
    </svg>
  )
}

function CodeIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M5.854 4.854a.5.5 0 1 0-.708-.708l-3.5 3.5a.5.5 0 0 0 0 .708l3.5 3.5a.5.5 0 0 0 .708-.708L2.707 8l3.147-3.146zm4.292 0a.5.5 0 0 1 .708-.708l3.5 3.5a.5.5 0 0 1 0 .708l-3.5 3.5a.5.5 0 0 1-.708-.708L13.293 8l-3.147-3.146z" />
    </svg>
  )
}

function BulletListIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm-3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
      />
    </svg>
  )
}

function OrderedListIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5z"
      />
      <path d="M1.713 11.865v-.474H2c.217 0 .363-.137.363-.317 0-.185-.158-.31-.361-.31-.223 0-.367.152-.373.31h-.59c.016-.467.373-.787.986-.787.588-.002.954.291.957.703a.595.595 0 0 1-.492.594v.033a.615.615 0 0 1 .569.631c.003.533-.502.8-1.051.8-.656 0-1-.37-1.008-.794h.582c.008.178.186.306.422.309.254 0 .424-.145.422-.35-.002-.195-.155-.348-.414-.348h-.3zm-.004-4.699h-.604v-.035c0-.408.295-.844.958-.844.583 0 .96.326.96.756 0 .389-.257.617-.476.848l-.537.572v.03h1.054V9H1.143v-.395l.957-.99c.138-.142.293-.304.293-.508 0-.18-.147-.32-.342-.32a.33.33 0 0 0-.342.338v.041zM2.564 5h-.635V2.924h-.031l-.598.42v-.567l.629-.443h.635V5z" />
    </svg>
  )
}

function QuoteIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M12 12a1 1 0 0 0 1-1V8.558a1 1 0 0 0-1-1h-1.388c0-.351.021-.703.062-1.054.062-.372.166-.703.31-.992.145-.29.331-.517.559-.683.227-.186.516-.279.868-.279V3c-.579 0-1.085.124-1.52.372a3.322 3.322 0 0 0-1.085.992 4.92 4.92 0 0 0-.62 1.458A7.712 7.712 0 0 0 9 7.558V11a1 1 0 0 0 1 1h2Zm-6 0a1 1 0 0 0 1-1V8.558a1 1 0 0 0-1-1H4.612c0-.351.021-.703.062-1.054.062-.372.166-.703.31-.992.145-.29.331-.517.559-.683.227-.186.516-.279.868-.279V3c-.579 0-1.085.124-1.52.372a3.322 3.322 0 0 0-1.085.992 4.92 4.92 0 0 0-.62 1.458A7.712 7.712 0 0 0 3 7.558V11a1 1 0 0 0 1 1h2Z" />
    </svg>
  )
}

function CodeBlockIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z" />
      <path d="M6.854 4.646a.5.5 0 0 1 0 .708L4.207 8l2.647 2.646a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 0 1 .708 0zm2.292 0a.5.5 0 0 0 0 .708L11.793 8l-2.647 2.646a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708 0z" />
    </svg>
  )
}

function HRIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M0 8a.5.5 0 0 1 .5-.5h15a.5.5 0 0 1 0 1H.5A.5.5 0 0 1 0 8z" />
    </svg>
  )
}

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

function TableIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z" />
    </svg>
  )
}

function LinkIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M6.354 5.5H4a3 3 0 0 0 0 6h3a3 3 0 0 0 2.83-4H9c-.086 0-.17.01-.25.031A2 2 0 0 1 7 10.5H4a2 2 0 1 1 0-4h1.535c.218-.376.495-.714.82-1z" />
      <path d="M9 5.5a3 3 0 0 0-2.83 4h1.098A2 2 0 0 1 9 6.5h3a2 2 0 1 1 0 4h-1.535a4.02 4.02 0 0 1-.82 1H12a3 3 0 1 0 0-6H9z" />
    </svg>
  )
}

function ImageIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
      <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z" />
    </svg>
  )
}

function IndentIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M3 2.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm6 2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-6-6a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-3-8a.5.5 0 0 1 .854-.353l2 2a.5.5 0 0 1 0 .707l-2 2a.5.5 0 1 1-.708-.708L1.293 6.5.146 5.354A.5.5 0 0 1 0 5z"
      />
    </svg>
  )
}

function OutdentIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M3 2.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm6 2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-6-6a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2.354-7.146a.5.5 0 0 1 0 .707L.293 6.5l1.353 1.146a.5.5 0 1 1-.707.708l-2-2a.5.5 0 0 1 0-.708l2-2a.5.5 0 0 1 .707 0z"
      />
    </svg>
  )
}

function AlignLeftIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M2 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"
      />
    </svg>
  )
}

function AlignCenterIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M4 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"
      />
    </svg>
  )
}

function AlignRightIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M6 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-4-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm4-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-4-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"
      />
    </svg>
  )
}
