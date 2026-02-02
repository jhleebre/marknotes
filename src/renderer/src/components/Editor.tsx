import { useEffect, useCallback, useRef, useState } from 'react'
import { useEditor, EditorContent, Editor as TipTapEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Heading from '@tiptap/extension-heading'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Link from '@tiptap/extension-link'
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
import './Editor.css'

const lowlight = createLowlight(common)

// Configure marked for GFM table support and heading IDs
marked.setOptions({
  gfm: true,
  breaks: false
})

// Add custom renderer for headings with IDs using slugger
const renderer = new marked.Renderer()
renderer.heading = function({ text, depth, tokens }) {
  // Extract plain text from tokens for ID generation
  const raw = tokens ? tokens.map(t => t.raw || '').join('') : text

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

marked.use({ renderer })

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
    let updateTimeout: NodeJS.Timeout | null = null

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
          if (transactions.some(transaction => transaction.docChanged)) {
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
  replacement: function (content, node) {
    const level = Number(node.nodeName.charAt(1))
    const hashes = '#'.repeat(level)
    return '\n\n' + hashes + ' ' + content + '\n\n'
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

      // Add separator after first row (header)
      if (index === 0) {
        const separator = '| ' + cells.map(() => '---').join(' | ') + ' |'
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
    content = content
      .replace(/^\n+/, '')
      .replace(/\n+$/, '\n')
      .replace(/\n/gm, '\n  ')

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
  }>({ x: 0, y: 0, show: false })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: false, // Disable default heading to use our extended version
        link: false // Disable default link to use our custom one
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
      TableHeader,
      TableCell
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'editor-content'
      },
      handleDOMEvents: {
        contextmenu: (_view, event) => {
          // Check if right-click is on a table cell
          const target = event.target as HTMLElement
          const cell = target.closest('td, th')
          if (cell) {
            event.preventDefault()
            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              show: true
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
                window.api.shell.openExternal(href).catch(err => {
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
      const html = marked.parse(content) as string
      editor.commands.setContent(html, { emitUpdate: false })
      lastMarkdownContent.current = content
      isUpdatingFromMarkdown.current = false
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
        const html = marked.parse(newContent) as string
        editor.commands.setContent(html, { emitUpdate: false })
        isUpdatingFromMarkdown.current = false
      }
    },
    [editor, setContent, updateCounts]
  )

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
            window.api.shell.openExternal(href).catch(err => {
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
          {contextMenu.show && editor && (
            <TableContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              editor={editor}
              onClose={() => setContextMenu((prev) => ({ ...prev, show: false }))}
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
            <div
              className="preview-content"
              dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }}
            />
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
  const handleAction = (action: () => void): void => {
    action()
    onClose()
  }

  return (
    <div
      className="table-context-menu"
      style={{
        left: `${x}px`,
        top: `${y}px`
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

  if (!editor) return null

  const insertTable = (): void => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  const handleLinkButtonClick = (): void => {
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
  }

  const handleLinkInsert = (text: string, url: string): void => {
    const { from, to } = editor.state.selection
    const hasSelection = from !== to

    if (hasSelection) {
      // Update existing selection with link
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run()
    } else {
      // Insert new text with link
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${url}">${text}</a>`)
        .run()
    }
  }

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
  }, [])

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
          className={`format-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          data-tooltip="Bullet List (Cmd+Shift+8)"
        >
          <BulletListIcon />
        </button>
        <button
          className={`format-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          data-tooltip="Numbered List (Cmd+Shift+7)"
        >
          <OrderedListIcon />
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
        <button
          className="format-btn"
          onClick={insertTable}
          data-tooltip="Insert Table"
        >
          <TableIcon />
        </button>
      </div>

      <LinkModal
        isOpen={linkModalOpen}
        initialText={linkModalData.text}
        initialUrl={linkModalData.url}
        onClose={() => setLinkModalOpen(false)}
        onInsert={handleLinkInsert}
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
      <path fillRule="evenodd" d="M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm-3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
    </svg>
  )
}

function OrderedListIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path fillRule="evenodd" d="M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5z" />
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
      <path fillRule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z" />
      <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z" />
    </svg>
  )
}

function RedoIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" />
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
