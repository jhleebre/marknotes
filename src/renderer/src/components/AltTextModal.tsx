import { useState, useEffect, useRef } from 'react'
import './AltTextModal.css'

interface AltTextModalProps {
  isOpen: boolean
  initialAlt: string
  onClose: () => void
  onSave: (alt: string) => void
}

export function AltTextModal({
  isOpen,
  initialAlt,
  onClose,
  onSave
}: AltTextModalProps): React.JSX.Element | null {
  const [alt, setAlt] = useState(initialAlt)
  const inputRef = useRef<HTMLInputElement>(null)
  const prevIsOpenRef = useRef(false)

  useEffect(() => {
    // Only update when modal opens (transition from closed to open)
    if (isOpen && !prevIsOpenRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAlt(initialAlt)
    }
    prevIsOpenRef.current = isOpen

    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isOpen, initialAlt])

  const handleSave = (): void => {
    onSave(alt)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Edit Alt Text</h3>
        <div className="modal-body">
          <label className="modal-label">Alternative Text</label>
          <input
            ref={inputRef}
            type="text"
            className="modal-input"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe this image..."
          />
          <p className="modal-hint">
            Provide a brief description of the image for accessibility and when the image can&apos;t
            be displayed.
          </p>
        </div>
        <div className="modal-actions">
          <button className="modal-btn modal-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="modal-btn modal-btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
