import { useState, useEffect, useRef } from 'react'
import type { FileEntry } from '../../../preload/index.d'
import { ChevronIcon, FolderIcon, FolderOpenIcon, RootFolderIcon, CloseIcon } from '../utils/icons'
import './CreateModal.css'

interface CreateModalProps {
  isOpen: boolean
  type: 'file' | 'folder'
  files: FileEntry[]
  rootPath: string
  defaultParentPath?: string | null
  onClose: () => void
  onCreate: (name: string, parentPath: string | null) => void
}

export function CreateModal({
  isOpen,
  type,
  files,
  rootPath,
  defaultParentPath,
  onClose,
  onCreate
}: CreateModalProps): React.JSX.Element | null {
  const [name, setName] = useState('')
  const [selectedParent, setSelectedParent] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName('')

      setSelectedParent(defaultParentPath ?? null)
      // Auto-expand root level folders
      const rootFolders = files.filter((f) => f.isDirectory).map((f) => f.path)

      setExpandedFolders(new Set(rootFolders))
      // Focus input after modal opens
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, files, defaultParentPath])

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
      if (isOpen) {
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [isOpen, onClose])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (name.trim()) {
      onCreate(name.trim(), selectedParent)
      onClose()
    }
  }

  const handleToggleFolder = (path: string): void => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const renderFolderTree = (entries: FileEntry[], depth: number = 0): React.JSX.Element[] => {
    return entries
      .filter((entry) => entry.isDirectory)
      .map((entry) => {
        const isExpanded = expandedFolders.has(entry.path)
        const isSelected = selectedParent === entry.path

        return (
          <div key={entry.path}>
            <div
              className={`folder-item ${isSelected ? 'selected' : ''}`}
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
              onClick={() => setSelectedParent(entry.path)}
            >
              <button
                className="folder-toggle"
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggleFolder(entry.path)
                }}
              >
                <span className={`chevron ${isExpanded ? 'expanded' : ''}`}>
                  <ChevronIcon className="icon" />
                </span>
              </button>
              <span className="folder-icon">
                {isExpanded ? <FolderOpenIcon className="icon" /> : <FolderIcon className="icon" />}
              </span>
              <span className="folder-name">{entry.name}</span>
            </div>
            {isExpanded && entry.children && (
              <div className="folder-children">{renderFolderTree(entry.children, depth + 1)}</div>
            )}
          </div>
        )
      })
  }

  if (!isOpen) return null

  const title = type === 'file' ? 'Create New File' : 'Create New Folder'
  const placeholder = type === 'file' ? 'Enter file name' : 'Enter folder name'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <CloseIcon className="icon" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="name-input">{type === 'file' ? 'File Name' : 'Folder Name'}</label>
              <input
                ref={inputRef}
                id="name-input"
                type="text"
                className="name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={placeholder}
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label>Parent Folder</label>
              <div className="folder-selector">
                <div
                  className={`folder-item root ${selectedParent === null ? 'selected' : ''}`}
                  onClick={() => setSelectedParent(null)}
                >
                  <span className="folder-icon">
                    <RootFolderIcon className="icon" />
                  </span>
                  <span className="folder-name">Root Folder ({rootPath.split('/').pop()})</span>
                </div>
                {renderFolderTree(files)}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
              {type === 'file' ? 'Create File' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
