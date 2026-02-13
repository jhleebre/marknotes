import { useCallback, useEffect, useState } from 'react'
import { useDocumentStore } from '../../store/useDocumentStore'
import { useAutoSave } from '../../hooks/useAutoSave'
import { markWrite } from '../../utils/writeTracker'
import type { Editor as TipTapEditor } from '@tiptap/react'
import {
  UndoIcon,
  RedoIcon,
  BoldIcon,
  ItalicIcon,
  StrikeIcon,
  CodeIcon,
  LinkIcon,
  OrderedListIcon,
  BulletListIcon,
  TaskListIcon,
  IndentIcon,
  OutdentIcon,
  QuoteIcon,
  CodeBlockIcon,
  HRIcon,
  TableIcon,
  ImageIcon,
  CloseFileIcon
} from '../../utils/icons'
import './TitleBar.css'

interface TitleBarProps {
  editor: TipTapEditor | null
}

export function TitleBar({ editor }: TitleBarProps): React.JSX.Element {
  const {
    currentFilePath,
    currentFileName,
    content,
    originalContent,
    setCurrentFile,
    setContent,
    setOriginalContent
  } = useDocumentStore()

  // Subscribe to selection changes so toolbar buttons reflect current formatting
  useDocumentStore((s) => s.editorSelectionKey)
  const { saveNow } = useAutoSave()

  const [platform, setPlatform] = useState<'darwin' | 'win32' | 'linux'>('darwin')

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.indexOf('win') !== -1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlatform('win32')
    } else if (userAgent.indexOf('linux') !== -1) {
      setPlatform('linux')
    } else {
      setPlatform('darwin')
    }
  }, [])

  const handleExportPdf = useCallback(async (): Promise<void> => {
    if (!content || !currentFileName) return
    try {
      await window.api.export.pdf(content, currentFileName)
    } catch (error) {
      console.error('Failed to export PDF:', error)
    }
  }, [content, currentFileName])

  const handleCloseFile = useCallback(async (): Promise<void> => {
    // Save current file if there are unsaved changes
    if (currentFilePath && content !== originalContent) {
      try {
        markWrite()
        await window.api.file.write(currentFilePath, content)
      } catch (error) {
        console.error('Failed to save before closing file:', error)
      }
    }

    // Close the file
    setCurrentFile(null, null)
    setContent('')
    setOriginalContent('')
  }, [currentFilePath, content, originalContent, setCurrentFile, setContent, setOriginalContent])

  // Listen for menu commands
  useEffect(() => {
    const unsubscribeSave = window.api.menu.onSave(() => {
      saveNow()
    })
    const unsubscribeExportPdf = window.api.menu.onExportPdf(handleExportPdf)
    const unsubscribeCloseFile = window.api.menu.onCloseFile(handleCloseFile)

    return () => {
      unsubscribeSave()
      unsubscribeExportPdf()
      unsubscribeCloseFile()
    }
  }, [saveNow, handleExportPdf, handleCloseFile])

  const isDisabled = !currentFilePath || !editor

  return (
    <div className={`title-bar ${platform}`}>
      <div className="title-bar-drag-region">
        <div className="title-bar-section title-bar-left">
          {/* Undo, Redo */}
          <button
            className="title-bar-btn"
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={isDisabled || !editor?.can().undo()}
            data-tooltip="Undo (Cmd+Z)"
          >
            <UndoIcon className="icon" />
          </button>
          <button
            className="title-bar-btn"
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={isDisabled || !editor?.can().redo()}
            data-tooltip="Redo (Cmd+Shift+Z)"
          >
            <RedoIcon className="icon" />
          </button>

          <div className="title-bar-divider" />

          {/* Heading selectbox */}
          <select
            className="title-bar-select"
            value={
              editor?.isActive('heading', { level: 1 })
                ? 'h1'
                : editor?.isActive('heading', { level: 2 })
                  ? 'h2'
                  : editor?.isActive('heading', { level: 3 })
                    ? 'h3'
                    : editor?.isActive('heading', { level: 4 })
                      ? 'h4'
                      : editor?.isActive('heading', { level: 5 })
                        ? 'h5'
                        : editor?.isActive('heading', { level: 6 })
                          ? 'h6'
                          : 'p'
            }
            onChange={(e) => {
              if (!editor) return
              const value = e.target.value
              if (value === 'p') {
                editor.chain().focus().setParagraph().run()
              } else {
                const level = parseInt(value.replace('h', '')) as 1 | 2 | 3 | 4 | 5 | 6
                editor.chain().focus().toggleHeading({ level }).run()
              }
            }}
            disabled={isDisabled}
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

          <div className="title-bar-divider" />

          {/* Formatting buttons */}
          <button
            className={`title-bar-btn ${editor?.isActive('bold') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            disabled={isDisabled || editor?.isActive('heading')}
            data-tooltip="Bold (Cmd+B)"
          >
            <BoldIcon className="icon" />
          </button>
          <button
            className={`title-bar-btn ${editor?.isActive('italic') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            disabled={isDisabled || editor?.isActive('heading')}
            data-tooltip="Italic (Cmd+I)"
          >
            <ItalicIcon className="icon" />
          </button>
          <button
            className={`title-bar-btn ${editor?.isActive('strike') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            disabled={isDisabled || editor?.isActive('heading')}
            data-tooltip="Strikethrough (Cmd+Shift+X)"
          >
            <StrikeIcon className="icon" />
          </button>
          <button
            className={`title-bar-btn ${editor?.isActive('code') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleCode().run()}
            disabled={isDisabled || editor?.isActive('heading')}
            data-tooltip="Inline Code (Cmd+E)"
          >
            <CodeIcon className="icon" />
          </button>
          <button
            className={`title-bar-btn ${editor?.isActive('link') ? 'active' : ''}`}
            onClick={() => document.dispatchEvent(new CustomEvent('open-link-modal'))}
            disabled={isDisabled || editor?.isActive('heading')}
            data-tooltip="Insert Link (Cmd+K)"
          >
            <LinkIcon className="icon" />
          </button>

          <div className="title-bar-divider" />

          {/* Block buttons - reordered */}
          <button
            className={`title-bar-btn ${editor?.isActive('orderedList') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            disabled={isDisabled || editor?.isActive('heading')}
            data-tooltip="Numbered List (Cmd+Shift+7)"
          >
            <OrderedListIcon className="icon" />
          </button>
          <button
            className={`title-bar-btn ${editor?.isActive('bulletList') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            disabled={isDisabled || editor?.isActive('heading')}
            data-tooltip="Bullet List (Cmd+Shift+8)"
          >
            <BulletListIcon className="icon" />
          </button>
          <button
            className={`title-bar-btn ${editor?.isActive('taskList') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleTaskList().run()}
            disabled={isDisabled || editor?.isActive('heading')}
            data-tooltip="Task List (Cmd+Shift+9)"
          >
            <TaskListIcon className="icon" />
          </button>
          <button
            className="title-bar-btn"
            onClick={() => {
              if (!editor) return
              if (editor.isActive('taskList')) {
                editor.chain().focus().sinkListItem('taskItem').run()
              } else {
                editor.chain().focus().sinkListItem('listItem').run()
              }
            }}
            disabled={
              isDisabled ||
              (() => {
                if (!editor) return true
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
            }
            data-tooltip="Indent (Tab)"
          >
            <IndentIcon className="icon" />
          </button>
          <button
            className="title-bar-btn"
            onClick={() => {
              if (!editor) return
              if (editor.isActive('taskList')) {
                editor.chain().focus().liftListItem('taskItem').run()
              } else {
                editor.chain().focus().liftListItem('listItem').run()
              }
            }}
            disabled={
              isDisabled ||
              (() => {
                if (!editor) return true
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
            }
            data-tooltip="Outdent (Shift+Tab)"
          >
            <OutdentIcon className="icon" />
          </button>
          <button
            className={`title-bar-btn ${editor?.isActive('blockquote') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            disabled={
              isDisabled ||
              editor?.isActive('heading') ||
              editor?.isActive('bulletList') ||
              editor?.isActive('orderedList') ||
              editor?.isActive('taskList')
            }
            data-tooltip="Blockquote (Cmd+Shift+B)"
          >
            <QuoteIcon className="icon" />
          </button>
          <button
            className={`title-bar-btn ${editor?.isActive('codeBlock') ? 'active' : ''}`}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            disabled={isDisabled || editor?.isActive('heading')}
            data-tooltip="Code Block (Cmd+Shift+C)"
          >
            <CodeBlockIcon className="icon" />
          </button>

          <div className="title-bar-divider" />

          {/* Insert buttons */}
          <button
            className="title-bar-btn"
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            disabled={isDisabled || editor?.isActive('heading')}
            data-tooltip="Horizontal Rule"
          >
            <HRIcon className="icon" />
          </button>
          <button
            className="title-bar-btn"
            onClick={() => document.dispatchEvent(new CustomEvent('insert-table'))}
            disabled={isDisabled || editor?.isActive('heading') || editor?.isActive('table')}
            data-tooltip="Insert Table"
          >
            <TableIcon className="icon" />
          </button>
          <button
            className="title-bar-btn"
            onClick={() => document.dispatchEvent(new CustomEvent('open-image-modal'))}
            disabled={isDisabled || editor?.isActive('heading')}
            data-tooltip="Insert Image"
          >
            <ImageIcon className="icon" />
          </button>

          <div className="title-bar-divider" />

          {/* Close file */}
          <button
            className="title-bar-btn"
            onClick={handleCloseFile}
            disabled={isDisabled}
            data-tooltip="Close File (Cmd+W)"
          >
            <CloseFileIcon className="icon" />
          </button>
        </div>
      </div>
    </div>
  )
}
