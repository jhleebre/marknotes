import { useEffect, useCallback, useRef, useState, useMemo } from 'react'
import { useEditor, EditorContent, Editor as TipTapEditor } from '@tiptap/react'
import { EditorState } from '@tiptap/pm/state'
import { useDocumentStore } from '../../store/useDocumentStore'
import { LinkModal, type HeadingInfo } from '../modals/LinkModal'
import { ImageModal } from '../modals/ImageModal'
import { AltTextModal } from '../modals/AltTextModal'
import { ContextMenu, type ContextMenuItem } from '../ContextMenu'
import { SearchBar } from '../SearchBar'
import { MetadataPanel } from '../MetadataPanel'
import { getEditorExtensions } from './editorConfig'
import { marked, postProcessImageSizes, resolveAssetImages } from './markdown/markdownToHtml'
import { processTaskListsForEditor, processTaskListsForPreview } from './markdown/taskListProcessor'
import { turndownService } from './markdown/htmlToMarkdown'
import { getTextSelectionMenuItems } from './contextMenus/textSelectionMenu'
import { getEmptyAreaMenuItems } from './contextMenus/emptyAreaMenu'
import { getImageMenuItems } from './contextMenus/imageMenu'
import { getTableMenuItems } from './contextMenus/tableMenu'
import { useLinkHandlers } from './hooks/useLinkHandlers'
import { useImageHandlers } from './hooks/useImageHandlers'
import { useEditorEvents } from './hooks/useEditorEvents'
import { useDropHandler } from './hooks/useDropHandler'
import {
  setEditorPositionGetter,
  saveCurrentPosition,
  getCursorScroll
} from '../../utils/cursorScrollCache'
import { extractBody, parseFrontmatter, buildContent } from '../../utils/frontmatter'
import './Editor.css'

interface EditorProps {
  onReady?: () => void
  onEditorReady?: (editor: TipTapEditor) => void
}

export function Editor({ onReady, onEditorReady }: EditorProps): React.JSX.Element {
  const {
    mode,
    content,
    setContent,
    updateCounts,
    isLoadingContent,
    currentFilePath,
    setCurrentFile,
    setOriginalContent,
    setIsLoadingContent,
    setLineNumbers,
    bumpSelectionKey
  } = useDocumentStore()
  const isUpdatingFromMarkdown = useRef(false)
  const lastMarkdownContent = useRef('')
  const lastLoadedFilePath = useRef<string | null>(null)
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

  const editor = useEditor({
    extensions: getEditorExtensions(),
    content: '',
    editorProps: {
      attributes: {
        class: 'editor-content'
      },
      handleDOMEvents: {
        contextmenu: (view, event) => {
          const target = event.target as HTMLElement

          const img = target.closest('img')
          if (img) {
            event.preventDefault()
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
          const target = event.target as HTMLElement
          const link = target.closest('a')
          if (link && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            const href = link.getAttribute('href')
            if (href) {
              if (href.startsWith('#')) {
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
                saveCurrentPosition(currentFilePath)
                const loadRelativeFile = async (): Promise<void> => {
                  try {
                    const decodedHref = decodeURIComponent(href)
                    const currentPath = currentFilePath
                    if (!currentPath) return

                    const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/'))
                    const targetPath = `${currentDir}/${decodedHref}`

                    const exists = await window.api.file.exists(targetPath)
                    if (!exists) {
                      console.error('File not found:', targetPath)
                      return
                    }

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

      if (markdown !== lastMarkdownContent.current) {
        lastMarkdownContent.current = markdown
        // Re-attach frontmatter from current store content
        const { data } = parseFrontmatter(useDocumentStore.getState().content)
        const fullContent = buildContent(data, markdown)
        setContent(fullContent)
        updateCounts(markdown)
      }
    },
    onSelectionUpdate: ({ editor }) => {
      bumpSelectionKey()

      const { state } = editor
      const { $from } = state.selection

      let lineCount = 0
      let currentLine = 1
      let found = false

      state.doc.descendants((node, pos) => {
        if (node.type.name === 'tableRow') {
          if (!found && $from.pos >= pos && $from.pos < pos + node.nodeSize) {
            currentLine = lineCount + 1
            found = true
          }
          lineCount++
          return false
        }

        if (node.isTextblock) {
          const isCodeBlock = node.type.name === 'codeBlock'
          const blockLines = isCodeBlock ? node.textContent.split('\n').length : 1

          if (!found) {
            const contentStart = pos + 1
            const contentEnd = pos + node.nodeSize - 1

            if ($from.pos >= contentStart && $from.pos <= contentEnd) {
              if (isCodeBlock) {
                const offset = $from.pos - contentStart
                const textBefore = node.textContent.substring(0, offset)
                currentLine = lineCount + (textBefore.match(/\n/g) || []).length + 1
              } else {
                currentLine = lineCount + 1
              }
              found = true
            }
          }

          lineCount += blockLines
          return false
        }

        if (node.isLeaf && node.isBlock) {
          if (!found && $from.pos >= pos && $from.pos <= pos + node.nodeSize) {
            currentLine = lineCount + 1
            found = true
          }
          lineCount++
          return false
        }

        return true
      })

      setLineNumbers(Math.max(1, currentLine), Math.max(1, lineCount))
    }
  })

  // Hook: link handlers
  const { handleLinkButtonClick, handleLinkInsert, handleLinkDelete } = useLinkHandlers(
    editor,
    setLinkModalData,
    setLinkModalOpen
  )

  // Hook: image handlers
  const { handleImageButtonClick, handleImageInsert } = useImageHandlers(
    editor,
    setImageModalData,
    setImageModalOpen
  )

  // Insert table
  const insertTable = useCallback((): void => {
    if (!editor) return
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  // Hook: editor events (TitleBar events, Cmd+K, preview link clicks)
  useEditorEvents(handleLinkButtonClick, handleImageButtonClick, insertTable, editor)

  // Hook: drag-and-drop image insertion
  useDropHandler(handleImageInsert, currentFilePath)

  // Register position getter for cursor/scroll cache
  useEffect(() => {
    if (!editor) return
    setEditorPositionGetter(() => {
      const { from, to } = editor.state.selection
      const editorEl = document.querySelector('.wysiwyg-editor') as HTMLElement | null
      return { cursorFrom: from, cursorTo: to, scrollTop: editorEl?.scrollTop ?? 0 }
    })
    return () => {
      setEditorPositionGetter(null)
    }
  }, [editor])

  // Listen for menu undo/redo
  useEffect(() => {
    const unsubUndo = window.api.menu.onUndo(() => {
      editor?.chain().focus().undo().run()
    })
    const unsubRedo = window.api.menu.onRedo(() => {
      editor?.chain().focus().redo().run()
    })
    return () => {
      unsubUndo()
      unsubRedo()
    }
  }, [editor])

  // Collect heading IDs from the editor document for link autocomplete
  const headings: HeadingInfo[] = useMemo(() => {
    if (!linkModalOpen || !editor) return []
    const result: HeadingInfo[] = []
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'heading') {
        const text = node.textContent
        const id = text
          .toLowerCase()
          .trim()
          .replace(/[^\p{L}\p{N}\s_-]/gu, '')
          .replace(/\s+/g, '-')
          .replace(/^-+|-+$/g, '')
        if (id) {
          result.push({ id, text, level: node.attrs.level as number })
        }
      }
    })
    return result
  }, [linkModalOpen, editor])

  // Load content into editor when content changes externally
  useEffect(() => {
    const body = extractBody(content)
    if (editor && body !== lastMarkdownContent.current) {
      isUpdatingFromMarkdown.current = true
      const isNewFile = currentFilePath !== lastLoadedFilePath.current
      lastLoadedFilePath.current = currentFilePath
      const loadContent = async (): Promise<void> => {
        let html = marked.parse(body) as string
        html = postProcessImageSizes(html)
        html = processTaskListsForEditor(html)
        html = await resolveAssetImages(html)
        editor.commands.setContent(html, { emitUpdate: false })
        lastMarkdownContent.current = body
        isUpdatingFromMarkdown.current = false

        // Clear undo history when loading a different file
        if (isNewFile) {
          const { state } = editor
          const freshState = EditorState.create({
            doc: state.doc,
            plugins: state.plugins
          })
          editor.view.updateState(freshState)

          // Restore cursor and scroll position if previously saved
          if (currentFilePath) {
            const saved = getCursorScroll(currentFilePath)
            if (saved) {
              try {
                const docSize = editor.state.doc.content.size
                const from = Math.min(saved.cursorFrom, docSize)
                const to = Math.min(saved.cursorTo, docSize)
                editor.commands.setTextSelection({ from, to })
                requestAnimationFrame(() => {
                  const editorEl = document.querySelector('.wysiwyg-editor') as HTMLElement | null
                  if (editorEl) {
                    editorEl.scrollTop = saved.scrollTop
                  }
                })
              } catch {
                // Position no longer valid (e.g. doc was externally modified) — ignore
              }
            }
          }
        }
      }
      loadContent()
    }
  }, [editor, content, currentFilePath])

  // Notify when editor is ready
  useEffect(() => {
    if (editor) {
      if (onReady) {
        onReady()
      }
      if (onEditorReady) {
        onEditorReady(editor)
      }
    }
  }, [editor, onReady, onEditorReady])

  // Calculate counts when content is first loaded
  useEffect(() => {
    if (currentFilePath && content) {
      updateCounts(extractBody(content))
    }
  }, [currentFilePath]) // Only run when file changes, not on every content update

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
      const body = extractBody(newContent)
      updateCounts(body)
      lastMarkdownContent.current = body

      if (editor) {
        isUpdatingFromMarkdown.current = true
        const loadContent = async (): Promise<void> => {
          let html = marked.parse(body) as string
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
      const body = extractBody(content)
      let html = marked.parse(body) as string
      html = postProcessImageSizes(html)
      html = processTaskListsForPreview(html)
      html = await resolveAssetImages(html)
      setPreviewHtml(html)
    }
    updatePreview()
  }, [content])

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
      <SearchBar editor={editor} />
      <MetadataPanel />
      {mode === 'wysiwyg' && (
        <div className="wysiwyg-mode">
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
          <LinkModal
            isOpen={linkModalOpen}
            initialText={linkModalData.text}
            initialUrl={linkModalData.url}
            isEditing={linkModalData.isEditing}
            headings={headings}
            onClose={() => setLinkModalOpen(false)}
            onInsert={handleLinkInsert}
            onDelete={handleLinkDelete}
          />
          <ImageModal
            isOpen={imageModalOpen}
            initialAlt={imageModalData.alt}
            onClose={() => setImageModalOpen(false)}
            onInsert={handleImageInsert}
          />
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
