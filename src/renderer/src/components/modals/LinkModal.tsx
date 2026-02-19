import { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import type { FileEntry } from '../../../../shared/types'
import { CloseIcon, FolderIcon, FolderOpenIcon, FileIcon } from '../../utils/icons'
import { computeRelativePath } from '../../utils/pathUtils'
import './LinkModal.css'

export interface HeadingInfo {
  id: string
  text: string
  level: number
}

type LinkMode = 'url' | 'heading' | 'file'

interface LinkModalProps {
  isOpen: boolean
  initialText?: string
  initialUrl?: string
  isEditing?: boolean
  headings?: HeadingInfo[]
  files?: FileEntry[]
  currentFilePath?: string | null
  onClose: () => void
  onInsert: (text: string, url: string) => void
  onDelete?: () => void
}

export function LinkModal({
  isOpen,
  initialText = '',
  initialUrl = '',
  isEditing = false,
  headings = [],
  files = [],
  currentFilePath = null,
  onClose,
  onInsert,
  onDelete
}: LinkModalProps): React.JSX.Element | null {
  const [text, setText] = useState(initialText)
  const [url, setUrl] = useState(initialUrl)
  const [mode, setMode] = useState<LinkMode>('url')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [dropdownDismissed, setDropdownDismissed] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const textInputRef = useRef<HTMLInputElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Detect initial mode from initialUrl
  const detectMode = (urlVal: string): LinkMode => {
    if (urlVal && (urlVal.endsWith('.md') || /\.md#/.test(urlVal))) return 'file'
    if (urlVal && urlVal.startsWith('#')) return 'heading'
    return 'url'
  }

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setText(initialText)
      setUrl(initialUrl)
      setDropdownDismissed(false)
      setActiveIndex(-1)
      setSelectedFile(null)

      const detectedMode = detectMode(initialUrl)
      setMode(detectedMode)

      // Pre-expand root-level folders
      setExpandedFolders(new Set(files.filter((f) => f.isDirectory).map((f) => f.path)))

      // Focus appropriate input
      setTimeout(() => {
        if (detectedMode === 'file') return
        if (initialText) {
          urlInputRef.current?.focus()
        } else {
          textInputRef.current?.focus()
        }
      }, 100)
    }
  }, [isOpen, initialText, initialUrl, files])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const filteredHeadings = useMemo(() => {
    if (mode !== 'heading') {
      if (!url.startsWith('#') || headings.length === 0) return []
    }
    if (headings.length === 0) return []
    const query = url.startsWith('#') ? url.slice(1).toLowerCase() : ''
    if (query === '') return headings
    return headings.filter(
      (h) => h.id.toLowerCase().includes(query) || h.text.toLowerCase().includes(query)
    )
  }, [url, headings, mode])

  const showDropdown =
    !dropdownDismissed && (mode === 'heading' || url.startsWith('#')) && filteredHeadings.length > 0

  const handleModeChange = (newMode: LinkMode): void => {
    setMode(newMode)
    setDropdownDismissed(false)
    setActiveIndex(-1)
    if (newMode === 'heading' && !url.startsWith('#')) {
      setUrl('#')
    }
    if (newMode === 'url' || newMode === 'file') {
      // Keep url as-is; user may switch back
    }
    if (newMode !== 'file') {
      setTimeout(() => {
        if (text) {
          urlInputRef.current?.focus()
        } else {
          textInputRef.current?.focus()
        }
      }, 50)
    }
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setUrl(e.target.value)
    setDropdownDismissed(false)
    setActiveIndex(-1)
  }

  const selectHeading = (heading: HeadingInfo): void => {
    setUrl(`#${heading.id}`)
    setDropdownDismissed(true)
    urlInputRef.current?.focus()
  }

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (!showDropdown || filteredHeadings.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => {
        const next = prev < filteredHeadings.length - 1 ? prev + 1 : 0
        scrollActiveIntoView(next)
        return next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => {
        const next = prev > 0 ? prev - 1 : filteredHeadings.length - 1
        scrollActiveIntoView(next)
        return next
      })
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      selectHeading(filteredHeadings[activeIndex])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setDropdownDismissed(true)
    }
  }

  const scrollActiveIntoView = (index: number): void => {
    requestAnimationFrame(() => {
      const item = dropdownRef.current?.children[index] as HTMLElement | undefined
      item?.scrollIntoView({ block: 'nearest' })
    })
  }

  const handleFileSelect = (entry: FileEntry): void => {
    setSelectedFile(entry.path)
    const relPath = currentFilePath ? computeRelativePath(currentFilePath, entry.path) : entry.path
    setUrl(relPath)
    if (!text) {
      setText(entry.name.replace(/\.md$/, ''))
    }
  }

  const toggleFolder = (folderPath: string): void => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderPath)) {
        next.delete(folderPath)
      } else {
        next.add(folderPath)
      }
      return next
    })
  }

  const renderFileTree = (entries: FileEntry[], depth: number = 0): React.JSX.Element[] => {
    return entries.map((entry) => {
      if (entry.isDirectory) {
        const isExpanded = expandedFolders.has(entry.path)
        return (
          <div key={entry.path}>
            <div
              className="link-file-item link-folder-item"
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
              onClick={() => toggleFolder(entry.path)}
            >
              <span className={`link-file-chevron ${isExpanded ? 'expanded' : ''}`}>
                <ChevronRight size={12} />
              </span>
              <span className="link-file-icon">
                {isExpanded ? <FolderOpenIcon className="icon" /> : <FolderIcon className="icon" />}
              </span>
              <span className="link-file-name">{entry.name}</span>
            </div>
            {isExpanded && entry.children && renderFileTree(entry.children, depth + 1)}
          </div>
        )
      }
      const isSelected = selectedFile === entry.path
      return (
        <div
          key={entry.path}
          className={`link-file-item link-md-item ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 16 + 24}px` }}
          onClick={() => handleFileSelect(entry)}
        >
          <span className="link-file-icon">
            <FileIcon className="icon" />
          </span>
          <span className="link-file-name">{entry.name.replace(/\.md$/, '')}</span>
        </div>
      )
    })
  }

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (text.trim() && url.trim()) {
      onInsert(text.trim(), url.trim())
      onClose()
    }
  }

  if (!isOpen) return null

  const urlPlaceholder = mode === 'heading' ? '#heading-id' : 'https://example.com or #heading-id'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content link-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Link' : 'Insert Link'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <CloseIcon className="icon" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Mode tabs */}
            <div className="link-mode-tabs">
              <button
                type="button"
                className={`link-mode-tab ${mode === 'url' ? 'active' : ''}`}
                onClick={() => handleModeChange('url')}
              >
                URL
              </button>
              <button
                type="button"
                className={`link-mode-tab ${mode === 'heading' ? 'active' : ''}`}
                onClick={() => handleModeChange('heading')}
              >
                # Heading
              </button>
              <button
                type="button"
                className={`link-mode-tab ${mode === 'file' ? 'active' : ''}`}
                onClick={() => handleModeChange('file')}
              >
                File
              </button>
            </div>

            <div className="form-group">
              <label htmlFor="link-text-input">Link Text</label>
              <input
                ref={textInputRef}
                id="link-text-input"
                type="text"
                className="link-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text to display"
                autoComplete="off"
                disabled={!!initialText && !isEditing}
              />
            </div>

            {mode === 'file' ? (
              <div className="form-group">
                <label>Select File</label>
                <div className="link-file-browser">
                  {files.length === 0 ? (
                    <div className="link-file-empty">No files available</div>
                  ) : (
                    renderFileTree(files)
                  )}
                </div>
                {url && (
                  <span className="input-hint link-file-path-hint">
                    Path: <code>{url}</code>
                  </span>
                )}
              </div>
            ) : (
              <div className="form-group">
                <label htmlFor="link-url-input">{mode === 'heading' ? 'Heading' : 'URL'}</label>
                <div className="url-input-wrapper">
                  <input
                    ref={urlInputRef}
                    id="link-url-input"
                    type="text"
                    className="link-input"
                    value={url}
                    onChange={handleUrlChange}
                    onKeyDown={handleUrlKeyDown}
                    placeholder={urlPlaceholder}
                    autoComplete="off"
                  />
                  {showDropdown && (
                    <div className="heading-dropdown" ref={dropdownRef}>
                      {filteredHeadings.map((heading, index) => (
                        <div
                          key={heading.id}
                          className={`heading-dropdown-item${index === activeIndex ? ' active' : ''}`}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            selectHeading(heading)
                          }}
                          onMouseEnter={() => setActiveIndex(index)}
                        >
                          <span className="heading-dropdown-id">#{heading.id}</span>
                          <span className="heading-dropdown-sep">&mdash;</span>
                          <span className="heading-dropdown-label">H{heading.level}</span>
                          <span className="heading-dropdown-text">{heading.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {mode === 'url' && (
                  <span className="input-hint">
                    For internal heading links, use #heading-id (e.g., #getting-started)
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer">
            {isEditing && onDelete && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  onDelete()
                  onClose()
                }}
              >
                Delete Link
              </button>
            )}
            <div className="modal-footer-right">
              <button type="button" className="btn btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!text.trim() || !url.trim()}
              >
                {isEditing ? 'Update Link' : 'Insert Link'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
