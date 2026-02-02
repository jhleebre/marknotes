import { useState, useEffect, useCallback, useRef } from 'react'
import { useDocumentStore } from '../store/useDocumentStore'
import type { FileEntry } from '../../../preload/index.d'
import { CreateModal } from './CreateModal'
import './FileTree.css'

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  entry: FileEntry | null
  isRoot: boolean
}

interface DragState {
  isDragging: boolean
  draggedEntry: FileEntry | null
  dropTarget: string | null
}

interface FileTreeItemProps {
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

function FileTreeItem({
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
  const [editName, setEditName] = useState(entry.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const isExpanded = expandedFolders.has(entry.path)
  const isSelected = entry.path === selectedPath
  const isEditing = editingPath === entry.path
  const isDropTarget = dragState.dropTarget === entry.path && entry.isDirectory

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      // Select filename without extension for files
      if (!entry.isDirectory && entry.name.endsWith('.md')) {
        inputRef.current.setSelectionRange(0, entry.name.length - 3)
      } else {
        inputRef.current.select()
      }
    }
  }, [isEditing, entry.isDirectory, entry.name])

  useEffect(() => {
    setEditName(entry.name)
  }, [entry.name])

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
      if (editName.trim() && editName !== entry.name) {
        onFinishRename(entry.path, editName.trim())
      } else {
        onCancelRename()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditName(entry.name)
      onCancelRename()
    }
  }

  const handleRenameBlur = (): void => {
    if (editName.trim() && editName !== entry.name) {
      onFinishRename(entry.path, editName.trim())
    } else {
      setEditName(entry.name)
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
            <ChevronIcon />
          </span>
        )}
        <span className="file-icon">
          {entry.isDirectory ? (
            isExpanded ? <FolderOpenIcon /> : <FolderIcon />
          ) : (
            <FileIcon />
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
          <span className="file-name">{entry.name}</span>
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

export function FileTree(): React.JSX.Element {
  const {
    files,
    setFiles,
    rootPath,
    setRootPath,
    currentFilePath,
    setCurrentFile,
    setContent,
    setOriginalContent,
    setIsLoadingContent,
    setIsLoadingFiles
  } = useDocumentStore()

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [editingPath, setEditingPath] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    entry: null,
    isRoot: false
  })
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedEntry: null,
    dropTarget: null
  })
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createModalType, setCreateModalType] = useState<'file' | 'folder'>('file')
  const [createModalDefaultParent, setCreateModalDefaultParent] = useState<string | null>(null)

  const loadFiles = useCallback(async (): Promise<void> => {
    setIsLoadingFiles(true)
    try {
      const [rootResult, listResult] = await Promise.all([
        window.api.file.getRootPath(),
        window.api.file.list()
      ])

      setRootPath(rootResult)

      if (listResult.success && listResult.files) {
        setFiles(listResult.files)
        // Auto-expand root level folders
        const rootFolders = listResult.files
          .filter((f) => f.isDirectory)
          .map((f) => f.path)
        setExpandedFolders((prev) => new Set([...prev, ...rootFolders]))
      }
    } catch (error) {
      console.error('Failed to load files:', error)
    } finally {
      setIsLoadingFiles(false)
    }
  }, [setFiles, setRootPath, setIsLoadingFiles])

  const loadFileContent = useCallback(
    async (path: string, name: string): Promise<void> => {
      setIsLoadingContent(true)
      try {
        const result = await window.api.file.read(path)
        if (result.success && result.content !== undefined) {
          setCurrentFile(path, name)
          setContent(result.content)
          setOriginalContent(result.content)
        } else {
          console.error('Failed to load file:', result.error)
        }
      } catch (error) {
        console.error('Failed to load file:', error)
      } finally {
        setIsLoadingContent(false)
      }
    },
    [setCurrentFile, setContent, setOriginalContent, setIsLoadingContent]
  )

  // File operations
  const handleFileSelect = useCallback(
    (path: string, name: string): void => {
      loadFileContent(path, name)
    },
    [loadFileContent]
  )

  const handleToggleExpand = useCallback((path: string): void => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const handleDelete = useCallback(
    async (entry: FileEntry): Promise<void> => {
      const confirmMsg = entry.isDirectory
        ? `Delete folder "${entry.name}" and all its contents?`
        : `Delete "${entry.name}"?`

      if (!window.confirm(confirmMsg)) return

      try {
        const result = await window.api.file.delete(entry.path)
        if (result.success) {
          if (entry.path === currentFilePath) {
            setCurrentFile(null, null)
            setContent('')
            setOriginalContent('')
          }
          loadFiles()
        } else {
          console.error('Failed to delete:', result.error)
        }
      } catch (error) {
        console.error('Failed to delete:', error)
      }
    },
    [currentFilePath, setCurrentFile, setContent, setOriginalContent, loadFiles]
  )

  const handleCreateFile = useCallback(
    async (name: string, parentPath: string | null): Promise<void> => {
      try {
        const result = await window.api.file.create(name, parentPath || undefined)
        if (result.success && result.content) {
          loadFiles()
          const fileName = name.endsWith('.md') ? name : `${name}.md`
          loadFileContent(result.content, fileName)
        } else {
          alert(result.error || 'Failed to create file')
        }
      } catch (error) {
        console.error('Failed to create file:', error)
      }
    },
    [loadFiles, loadFileContent]
  )

  const handleCreateFolder = useCallback(
    async (name: string, parentPath: string | null): Promise<void> => {
      try {
        const result = await window.api.file.createFolder(name.trim(), parentPath || undefined)
        if (result.success && result.content) {
          loadFiles()
          // Auto-expand parent folder
          if (parentPath) {
            setExpandedFolders((prev) => new Set([...prev, parentPath]))
          }
          // Auto-expand new folder
          setExpandedFolders((prev) => new Set([...prev, result.content!]))
        } else {
          alert(result.error || 'Failed to create folder')
        }
      } catch (error) {
        console.error('Failed to create folder:', error)
      }
    },
    [loadFiles]
  )

  const handleStartRename = useCallback((path: string): void => {
    setEditingPath(path)
  }, [])

  const handleFinishRename = useCallback(
    async (oldPath: string, newName: string): Promise<void> => {
      setEditingPath(null)
      try {
        const result = await window.api.file.rename(oldPath, newName)
        if (result.success && result.content) {
          // Update current file path if renamed
          if (oldPath === currentFilePath) {
            setCurrentFile(result.content, newName)
          }
          loadFiles()
        } else {
          alert(result.error || 'Failed to rename')
        }
      } catch (error) {
        console.error('Failed to rename:', error)
      }
    },
    [currentFilePath, setCurrentFile, loadFiles]
  )

  const handleCancelRename = useCallback((): void => {
    setEditingPath(null)
  }, [])

  // Drag and drop handlers
  const handleDragStart = useCallback((entry: FileEntry): void => {
    setDragState({
      isDragging: true,
      draggedEntry: entry,
      dropTarget: null
    })
  }, [])

  const handleDragEnd = useCallback((): void => {
    setDragState({
      isDragging: false,
      draggedEntry: null,
      dropTarget: null
    })
  }, [])

  const handleDragOver = useCallback(
    (_e: React.DragEvent, targetPath: string): void => {
      if (dragState.draggedEntry && targetPath !== dragState.draggedEntry.path) {
        setDragState((prev) => ({ ...prev, dropTarget: targetPath }))
      }
    },
    [dragState.draggedEntry]
  )

  const handleDrop = useCallback(
    async (targetPath: string): Promise<void> => {
      if (!dragState.draggedEntry) return

      const sourcePath = dragState.draggedEntry.path
      setDragState({
        isDragging: false,
        draggedEntry: null,
        dropTarget: null
      })

      try {
        const result = await window.api.file.move(sourcePath, targetPath)
        if (result.success) {
          // Update current file path if moved
          if (sourcePath === currentFilePath && result.content) {
            setCurrentFile(result.content, dragState.draggedEntry.name)
          }
          loadFiles()
          // Expand target folder
          setExpandedFolders((prev) => new Set([...prev, targetPath]))
        } else {
          alert(result.error || 'Failed to move')
        }
      } catch (error) {
        console.error('Failed to move:', error)
      }
    },
    [dragState.draggedEntry, currentFilePath, setCurrentFile, loadFiles]
  )

  // Root drop zone handlers
  const handleRootDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
    if (dragState.draggedEntry) {
      e.dataTransfer.dropEffect = 'move'
      setDragState((prev) => ({ ...prev, dropTarget: 'root' }))
    }
  }

  const handleRootDrop = async (e: React.DragEvent): Promise<void> => {
    e.preventDefault()
    if (!dragState.draggedEntry) return

    const sourcePath = dragState.draggedEntry.path
    setDragState({
      isDragging: false,
      draggedEntry: null,
      dropTarget: null
    })

    try {
      const result = await window.api.file.move(sourcePath, rootPath)
      if (result.success) {
        if (sourcePath === currentFilePath && result.content) {
          setCurrentFile(result.content, dragState.draggedEntry.name)
        }
        loadFiles()
      } else {
        alert(result.error || 'Failed to move')
      }
    } catch (error) {
      console.error('Failed to move:', error)
    }
  }

  // Context menu handlers
  const handleContextMenu = useCallback((e: React.MouseEvent, entry: FileEntry): void => {
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      entry,
      isRoot: false
    })
  }, [])

  const handleRootContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      entry: null,
      isRoot: true
    })
  }

  const closeContextMenu = useCallback((): void => {
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }, [])

  // Adjust context menu position to stay within viewport
  useEffect(() => {
    if (contextMenu.visible && contextMenuRef.current) {
      const menu = contextMenuRef.current
      const rect = menu.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let { x, y } = contextMenu

      // Adjust horizontal position
      if (x + rect.width > viewportWidth) {
        x = viewportWidth - rect.width - 8
      }

      // Adjust vertical position
      if (y + rect.height > viewportHeight) {
        y = viewportHeight - rect.height - 8
      }

      // Ensure minimum distance from edges
      x = Math.max(8, x)
      y = Math.max(8, y)

      if (x !== contextMenu.x || y !== contextMenu.y) {
        setContextMenu((prev) => ({ ...prev, x, y }))
      }
    }
  }, [contextMenu.visible, contextMenu.x, contextMenu.y])

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = (): void => {
      closeContextMenu()
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [closeContextMenu])

  // Initial load
  useEffect(() => {
    loadFiles()
    window.api.file.watch()

    const unsubscribe = window.api.file.onChanged(() => {
      loadFiles()
    })

    const unsubscribeExternal = window.api.file.onExternalChange((changedPath) => {
      if (changedPath === currentFilePath) {
        loadFileContent(changedPath, currentFilePath?.split('/').pop() || '')
      }
    })

    return () => {
      unsubscribe()
      unsubscribeExternal()
      window.api.file.unwatch()
    }
  }, [loadFiles])

  const openCreateFileModal = useCallback((parentPath: string | null = null) => {
    setCreateModalType('file')
    setCreateModalDefaultParent(parentPath)
    setCreateModalOpen(true)
  }, [])

  const openCreateFolderModal = useCallback((parentPath: string | null = null) => {
    setCreateModalType('folder')
    setCreateModalDefaultParent(parentPath)
    setCreateModalOpen(true)
  }, [])

  // Listen for menu commands
  useEffect(() => {
    const unsubscribeNewFile = window.api.menu.onNewFile(openCreateFileModal)
    const unsubscribeNewFolder = window.api.menu.onNewFolder(openCreateFolderModal)

    return () => {
      unsubscribeNewFile()
      unsubscribeNewFolder()
    }
  }, [openCreateFileModal, openCreateFolderModal])

  const handleModalCreate = useCallback(
    (name: string, parentPath: string | null) => {
      if (createModalType === 'file') {
        handleCreateFile(name, parentPath)
      } else {
        handleCreateFolder(name, parentPath)
      }
    },
    [createModalType, handleCreateFile, handleCreateFolder]
  )

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <span className="header-title">MarkNotes</span>
        <div className="header-actions">
          <button
            className="action-btn"
            onClick={() => openCreateFileModal()}
            data-tooltip="New File (Cmd+N)"
          >
            <FileIcon />
          </button>
          <button
            className="action-btn"
            onClick={() => openCreateFolderModal()}
            data-tooltip="New Folder (Cmd+Shift+N)"
          >
            <FolderPlusIcon />
          </button>
        </div>
      </div>

      <div
        className={`file-tree-content ${dragState.dropTarget === 'root' ? 'drop-target-root' : ''}`}
        onContextMenu={handleRootContextMenu}
        onDragOver={handleRootDragOver}
        onDrop={handleRootDrop}
      >
        {files.length === 0 ? (
          <div className="empty-state">
            <p>No files yet</p>
            <button onClick={() => openCreateFileModal()}>Create your first note</button>
          </div>
        ) : (
          files.map((entry) => (
            <FileTreeItem
              key={entry.path}
              entry={entry}
              depth={0}
              selectedPath={currentFilePath}
              expandedFolders={expandedFolders}
              editingPath={editingPath}
              dragState={dragState}
              onFileSelect={handleFileSelect}
              onToggleExpand={handleToggleExpand}
              onContextMenu={handleContextMenu}
              onStartRename={handleStartRename}
              onFinishRename={handleFinishRename}
              onCancelRename={handleCancelRename}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="context-menu"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.entry?.isDirectory && (
            <>
              <button
                className="context-menu-item"
                onClick={() => {
                  openCreateFileModal(contextMenu.entry!.path)
                  closeContextMenu()
                }}
              >
                <FileIcon />
                <span>New File</span>
              </button>
              <button
                className="context-menu-item"
                onClick={() => {
                  openCreateFolderModal(contextMenu.entry!.path)
                  closeContextMenu()
                }}
              >
                <FolderPlusIcon />
                <span>New Folder</span>
              </button>
              <div className="context-menu-divider" />
            </>
          )}
          {contextMenu.isRoot && (
            <>
              <button
                className="context-menu-item"
                onClick={() => {
                  openCreateFileModal(null)
                  closeContextMenu()
                }}
              >
                <FileIcon />
                <span>New File</span>
              </button>
              <button
                className="context-menu-item"
                onClick={() => {
                  openCreateFolderModal(null)
                  closeContextMenu()
                }}
              >
                <FolderPlusIcon />
                <span>New Folder</span>
              </button>
            </>
          )}
          {contextMenu.entry && (
            <>
              <button
                className="context-menu-item"
                onClick={() => {
                  handleStartRename(contextMenu.entry!.path)
                  closeContextMenu()
                }}
              >
                <RenameIcon />
                <span>Rename</span>
              </button>
              <div className="context-menu-divider" />
              <button
                className="context-menu-item danger"
                onClick={() => {
                  handleDelete(contextMenu.entry!)
                  closeContextMenu()
                }}
              >
                <TrashIcon />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Create Modal */}
      <CreateModal
        isOpen={createModalOpen}
        type={createModalType}
        files={files}
        rootPath={rootPath}
        defaultParentPath={createModalDefaultParent}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleModalCreate}
      />
    </div>
  )
}

// Icons
function ChevronIcon(): React.JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <path d="M4.5 2L8.5 6L4.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

function FileIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4 1h5.586a1 1 0 0 1 .707.293l2.414 2.414a1 1 0 0 1 .293.707V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zm5 1v2.5a.5.5 0 0 0 .5.5H12l-3-3z" />
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

function FolderPlusIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 3a1 1 0 0 1 1-1h3.586a1 1 0 0 1 .707.293L8 3H13a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3z" />
      <path d="M8 7v4M6 9h4" stroke="var(--bg-primary)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function TrashIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
      <path d="M3 5h10M6 5V3.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V5M4 5v9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V5" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function RenameIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M12.146 1.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1 0 .708l-9.5 9.5a.5.5 0 0 1-.168.11l-4 1.5a.5.5 0 0 1-.65-.65l1.5-4a.5.5 0 0 1 .11-.168l9.5-9.5zM11.207 4L12 4.793 13.793 3 13 2.207 11.207 4z" />
    </svg>
  )
}
