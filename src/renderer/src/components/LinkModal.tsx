import { useState, useEffect, useRef } from 'react'
import './LinkModal.css'

interface LinkModalProps {
  isOpen: boolean
  initialText?: string
  initialUrl?: string
  onClose: () => void
  onInsert: (text: string, url: string) => void
}

export function LinkModal({
  isOpen,
  initialText = '',
  initialUrl = '',
  onClose,
  onInsert
}: LinkModalProps): React.JSX.Element | null {
  const [text, setText] = useState(initialText)
  const [url, setUrl] = useState(initialUrl)
  const textInputRef = useRef<HTMLInputElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)

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
          <h2>Insert Link</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <CloseIcon />
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
                disabled={!!initialText}
              />
            </div>

            <div className="form-group">
              <label htmlFor="link-url-input">URL</label>
              <input
                ref={urlInputRef}
                id="link-url-input"
                type="text"
                className="link-input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com or #heading-id"
                autoComplete="off"
              />
              <span className="input-hint">
                For internal links, use #heading-id (e.g., #getting-started)
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!text.trim() || !url.trim()}
            >
              Insert Link
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CloseIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
    </svg>
  )
}
