import { useState, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
import type { FileEntry } from '../../../../shared/types'
import { FolderIcon, FolderOpenIcon, RootFolderIcon, CloseIcon } from '../../utils/icons'
import './CreateModal.css'

interface SearchFolderModalProps {
  files: FileEntry[]
  rootPath: string
  currentTargetPath: string
  onSelect: (path: string) => void
  onClose: () => void
}

export function SearchFolderModal({
  files,
  rootPath,
  currentTargetPath,
  onSelect,
  onClose
}: SearchFolderModalProps): React.JSX.Element {
  const [selectedPath, setSelectedPath] = useState<string>(currentTargetPath)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  useEffect(() => {
    const rootFolders = files.filter((f) => f.isDirectory).map((f) => f.path)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpandedFolders(new Set(rootFolders))
  }, [files])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

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
        const isSelected = selectedPath === entry.path

        return (
          <div key={entry.path}>
            <div
              className={`folder-item ${isSelected ? 'selected' : ''}`}
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
              onClick={() => setSelectedPath(entry.path)}
            >
              <button
                className="folder-toggle"
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggleFolder(entry.path)
                }}
              >
                <span className={`chevron ${isExpanded ? 'expanded' : ''}`}>
                  <ChevronRight size={12} />
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Search Location</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <CloseIcon className="icon" />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Select Folder to Search In</label>
            <div className="folder-selector">
              <div
                className={`folder-item root ${selectedPath === rootPath ? 'selected' : ''}`}
                onClick={() => setSelectedPath(rootPath)}
              >
                <span className="folder-icon">
                  <RootFolderIcon className="icon" />
                </span>
                <span className="folder-name">MarkNotes (all files)</span>
              </div>
              {renderFolderTree(files)}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onSelect(selectedPath)}>
            Search Here
          </button>
        </div>
      </div>
    </div>
  )
}
