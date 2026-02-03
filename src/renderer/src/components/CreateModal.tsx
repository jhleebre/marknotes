import { useState, useEffect, useRef } from 'react'
import type { FileEntry } from '../../../preload/index.d'
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
                  <ChevronIcon />
                </span>
              </button>
              <span className="folder-icon">
                {isExpanded ? <FolderOpenIcon /> : <FolderIcon />}
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
            <CloseIcon />
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
                    <RootFolderIcon />
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

// Icons
function ChevronIcon(): React.JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <path
        d="M4.5 2L8.5 6L4.5 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

function FolderIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 3a1 1 0 0 1 1-1h3.586a1 1 0 0 1 .707.293L8 3H13a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3z" />
    </svg>
  )
}

function FolderOpenIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M1.5 4A1.5 1.5 0 0 1 3 2.5h2.672a1.5 1.5 0 0 1 1.06.44L8.207 4.5H13A1.5 1.5 0 0 1 14.5 6v.5h-13V4z" />
      <path d="M14.5 7h-13v5.5A1.5 1.5 0 0 0 3 14h10a1.5 1.5 0 0 0 1.5-1.5V7z" />
    </svg>
  )
}

function RootFolderIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1.5L2 5v8l6 3.5 6-3.5V5L8 1.5zM8 3l4.5 2.5v5L8 13l-4.5-2.5v-5L8 3z" />
    </svg>
  )
}

function CloseIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
    </svg>
  )
}
