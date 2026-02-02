import { useState, useEffect, useRef } from 'react'
import './ImageModal.css'

interface ImageModalProps {
  isOpen: boolean
  initialAlt?: string
  onClose: () => void
  onInsert: (src: string, alt: string) => void
}

export function ImageModal({
  isOpen,
  initialAlt = '',
  onClose,
  onInsert
}: ImageModalProps): React.JSX.Element | null {
  const [alt, setAlt] = useState(initialAlt)
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [preview, setPreview] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string>('')
  const altInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setAlt(initialAlt)
      setSelectedFile('')
      setPreview('')
      setError('')

      setTimeout(() => {
        altInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen, initialAlt])

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

  const handleFileUpload = async (): Promise<void> => {
    setIsUploading(true)
    setError('')
    try {
      const result = await window.api.image.upload()
      if (result.success && result.content) {
        setSelectedFile(result.content)
        // Resolve .assets path to data URL for preview
        const resolveResult = await window.api.image.resolveAssetPath(result.content)
        if (resolveResult.success && resolveResult.content) {
          setPreview(resolveResult.content)
        } else {
          setPreview(result.content)
        }
      } else {
        setError(result.error || 'Failed to upload image')
      }
    } catch {
      setError('Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()

    if (!selectedFile.trim()) {
      setError('Please select an image file')
      return
    }

    onInsert(selectedFile, alt.trim())
    onClose()
  }

  const canSubmit = !!selectedFile

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content image-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Insert Image</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Select Image File</label>
              <button
                type="button"
                className="btn btn-secondary upload-button"
                onClick={handleFileUpload}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Choose Image File'}
              </button>
              {selectedFile && <span className="file-name">{selectedFile.split('/').pop()}</span>}
              <span className="input-hint">
                Supported formats: JPG, PNG, GIF, SVG, WEBP (max 10MB)
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="image-alt-input">Alt Text</label>
              <input
                ref={altInputRef}
                id="image-alt-input"
                type="text"
                className="link-input"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Describe the image"
                autoComplete="off"
              />
              <span className="input-hint">
                Describes the image for accessibility and when image cannot load
              </span>
            </div>

            {preview && (
              <div className="image-preview">
                <label>Preview</label>
                <div className="preview-wrapper">
                  <img src={preview} alt={alt || 'Preview'} />
                </div>
              </div>
            )}

            {error && <div className="error-message">{error}</div>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
              Insert Image
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
