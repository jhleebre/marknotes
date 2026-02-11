import { useState, useEffect, useRef, useMemo } from 'react'
import { CloseIcon } from '../../utils/icons'
import './LinkModal.css'

export interface HeadingInfo {
  id: string
  text: string
  level: number
}

interface LinkModalProps {
  isOpen: boolean
  initialText?: string
  initialUrl?: string
  isEditing?: boolean
  headings?: HeadingInfo[]
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
  onClose,
  onInsert,
  onDelete
}: LinkModalProps): React.JSX.Element | null {
  const [text, setText] = useState(initialText)
  const [url, setUrl] = useState(initialUrl)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [dropdownDismissed, setDropdownDismissed] = useState(false)
  const textInputRef = useRef<HTMLInputElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setText(initialText)
      setUrl(initialUrl)
      // Focus appropriate input based on whether text is already provided
      setTimeout(() => {
        if (initialText) {
          urlInputRef.current?.focus()
        } else {
          textInputRef.current?.focus()
        }
      }, 100)
    }
  }, [isOpen, initialText, initialUrl])

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
    if (!url.startsWith('#') || headings.length === 0) return []
    const query = url.slice(1).toLowerCase()
    if (query === '') return headings
    return headings.filter(
      (h) => h.id.toLowerCase().includes(query) || h.text.toLowerCase().includes(query)
    )
  }, [url, headings])

  const showDropdown = !dropdownDismissed && url.startsWith('#') && filteredHeadings.length > 0

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

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (text.trim() && url.trim()) {
      onInsert(text.trim(), url.trim())
      onClose()
    }
  }

  if (!isOpen) return null

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

            <div className="form-group">
              <label htmlFor="link-url-input">URL</label>
              <div className="url-input-wrapper">
                <input
                  ref={urlInputRef}
                  id="link-url-input"
                  type="text"
                  className="link-input"
                  value={url}
                  onChange={handleUrlChange}
                  onKeyDown={handleUrlKeyDown}
                  placeholder="https://example.com or #heading-id"
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
              <span className="input-hint">
                For internal links, use #heading-id (e.g., #getting-started)
              </span>
            </div>
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
