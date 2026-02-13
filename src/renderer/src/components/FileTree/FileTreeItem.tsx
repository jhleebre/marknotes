import { useState, useEffect, useRef } from 'react'
import type { FileEntry } from '../../../../shared/types'
import { FileIcon, FolderIcon as FolderIconImported, ChevronIcon } from '../../utils/icons'

interface DragState {
  isDragging: boolean
  draggedEntry: FileEntry | null
  dropTarget: string | null
}

export interface FileTreeItemProps {
  entry: FileEntry
  depth: number
  selectedPath: string | null
  expandedFolders: Set<string>
  editingPath: string | null
  dragState: DragState
  onFileSelect: (path: string, name: string) => void
  onToggleExpand: (path: string) => void
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void
  onStartRename: (path: string) => void
  onFinishRename: (oldPath: string, newName: string) => void
  onCancelRename: () => void
  onDragStart: (entry: FileEntry) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, targetPath: string) => void
  onDrop: (targetPath: string) => void
}

export function FileTreeItem({
  entry,
  depth,
  selectedPath,
  expandedFolders,
  editingPath,
  dragState,
  onFileSelect,
  onToggleExpand,
  onContextMenu,
  onStartRename,
  onFinishRename,
  onCancelRename,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop
}: FileTreeItemProps): React.JSX.Element {
  const [editName, setEditName] = useState(() => {
    if (!entry.isDirectory && entry.name.endsWith('.md')) {
      return entry.name.slice(0, -3)
    }
    return entry.name
  })
  const inputRef = useRef<HTMLInputElement>(null)
  const isExpanded = expandedFolders.has(entry.path)
  const isSelected = entry.path === selectedPath
  const isEditing = editingPath === entry.path
  const isDropTarget = dragState.dropTarget === entry.path && entry.isDirectory

  const getDisplayName = (name: string, isDirectory: boolean): string => {
    if (isDirectory) return name
    return name.endsWith('.md') ? name.slice(0, -3) : name
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    if (!entry.isDirectory && entry.name.endsWith('.md')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditName(entry.name.slice(0, -3))
    } else {
      setEditName(entry.name)
    }
  }, [entry.name, entry.isDirectory])

  const handleClick = (e: React.MouseEvent): void => {
    e.stopPropagation()
    if (entry.isDirectory) {
      onToggleExpand(entry.path)
    } else {
      onFileSelect(entry.path, entry.name)
    }
  }

  const handleDoubleClick = (e: React.MouseEvent): void => {
    e.stopPropagation()
    onStartRename(entry.path)
  }

  const handleContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    onContextMenu(e, entry)
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (editName.trim()) {
        const finalName =
          !entry.isDirectory && !editName.endsWith('.md')
            ? `${editName.trim()}.md`
            : editName.trim()

        if (finalName !== entry.name) {
          onFinishRename(entry.path, finalName)
        } else {
          onCancelRename()
        }
      } else {
        onCancelRename()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (!entry.isDirectory && entry.name.endsWith('.md')) {
        setEditName(entry.name.slice(0, -3))
      } else {
        setEditName(entry.name)
      }
      onCancelRename()
    }
  }

  const handleRenameBlur = (): void => {
    if (editName.trim()) {
      const finalName =
        !entry.isDirectory && !editName.endsWith('.md') ? `${editName.trim()}.md` : editName.trim()

      if (finalName !== entry.name) {
        onFinishRename(entry.path, finalName)
      } else {
        onCancelRename()
      }
    } else {
      if (!entry.isDirectory && entry.name.endsWith('.md')) {
        setEditName(entry.name.slice(0, -3))
      } else {
        setEditName(entry.name)
      }
      onCancelRename()
    }
  }

  const handleDragStart = (e: React.DragEvent): void => {
    e.stopPropagation()
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', entry.path)
    onDragStart(entry)
  }

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    if (entry.isDirectory && dragState.draggedEntry?.path !== entry.path) {
      e.dataTransfer.dropEffect = 'move'
      onDragOver(e, entry.path)
    }
  }

  const handleDragLeave = (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    if (entry.isDirectory) {
      onDrop(entry.path)
    }
  }

  const handleDragEnd = (): void => {
    onDragEnd()
  }

  return (
    <div className="file-tree-item">
      <div
        className={`file-tree-row ${isSelected ? 'selected' : ''} ${isDropTarget ? 'drop-target' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        draggable={!isEditing}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
      >
        {entry.isDirectory && (
          <span className={`chevron ${isExpanded ? 'expanded' : ''}`}>
            <ChevronIcon className="icon" />
          </span>
        )}
        <span className="file-icon">
          {entry.isDirectory ? (
            <FolderIconImported className="icon" />
          ) : (
            <FileIcon className="icon" />
          )}
        </span>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="rename-input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRenameBlur}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`file-name${entry.isDirectory ? ' folder-name' : ''}`}>
            {getDisplayName(entry.name, entry.isDirectory)}
          </span>
        )}
      </div>
      {entry.isDirectory && isExpanded && entry.children && (
        <div className="file-tree-children">
          {entry.children.map((child) => (
            <FileTreeItem
              key={child.path}
              entry={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              expandedFolders={expandedFolders}
              editingPath={editingPath}
              dragState={dragState}
              onFileSelect={onFileSelect}
              onToggleExpand={onToggleExpand}
              onContextMenu={onContextMenu}
              onStartRename={onStartRename}
              onFinishRename={onFinishRename}
              onCancelRename={onCancelRename}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
  )
}
