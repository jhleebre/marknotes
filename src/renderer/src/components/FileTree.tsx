import { useState, useEffect, useCallback, useRef } from 'react'
import { useDocumentStore } from '../store/useDocumentStore'
import type { FileEntry } from '../../../preload/index.d'
import { CreateModal } from './CreateModal'
import { ContextMenu, type ContextMenuItem } from './ContextMenu'
import {
  FileIcon,
  FolderIcon as FolderIconImported,
  FolderPlusIcon,
  RenameIcon,
  TrashIcon,
  ShowInFinderIcon,
  CopyIcon,
  DuplicateIcon
} from '../utils/icons'
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
  const [editName, setEditName] = useState(() => {
    // Initialize without .md extension for files
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

  // Get display name without .md extension for files
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
    // Update editName when entry changes, removing .md for files
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
        // Add .md extension back for files
        const finalName =
          !entry.isDirectory && !editName.endsWith('.md')
            ? `${editName.trim()}.md`
            : editName.trim()

        // Only rename if name actually changed
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
      // Reset to display name (without .md)
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
      // Add .md extension back for files
      const finalName =
        !entry.isDirectory && !editName.endsWith('.md') ? `${editName.trim()}.md` : editName.trim()

      // Only rename if name actually changed
      if (finalName !== entry.name) {
        onFinishRename(entry.path, finalName)
      } else {
        onCancelRename()
      }
    } else {
      // Reset to display name (without .md)
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
            <ChevronIcon />
          </span>
        )}
        <span className="file-icon">
          {entry.isDirectory ? <FolderIconImported /> : <FileIcon />}
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
          <span className="file-name">{getDisplayName(entry.name, entry.isDirectory)}</span>
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
    content,
    originalContent,
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
        const rootFolders = listResult.files.filter((f) => f.isDirectory).map((f) => f.path)
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
    async (path: string, name: string): Promise<void> => {
      // Save current file if there are unsaved changes
      if (currentFilePath && content !== originalContent) {
        try {
          await window.api.file.write(currentFilePath, content)
        } catch (error) {
          console.error('Failed to save before switching files:', error)
        }
      }

      // Load the new file
      loadFileContent(path, name)
    },
    [loadFileContent, currentFilePath, content, originalContent]
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

  const handleShowInFinder = useCallback(async (entry: FileEntry): Promise<void> => {
    try {
      const result = await window.api.shell.showInFinder(entry.path)
      if (!result.success) {
        console.error('Failed to show in Finder:', result.error)
      }
    } catch (error) {
      console.error('Failed to show in Finder:', error)
    }
  }, [])

  const handleCopyPath = useCallback(async (entry: FileEntry): Promise<void> => {
    try {
      const result = await window.api.shell.copyPath(entry.path)
      if (!result.success) {
        alert(result.error || 'Failed to copy path')
      }
    } catch (error) {
      console.error('Failed to copy path:', error)
    }
  }, [])

  const handleDuplicate = useCallback(
    async (entry: FileEntry): Promise<void> => {
      try {
        const result = await window.api.file.duplicate(entry.path)
        if (result.success) {
          loadFiles()
          // Open the duplicated file if it's a file
          if (!entry.isDirectory && result.content) {
            const fileName = result.content.split('/').pop() || ''
            loadFileContent(result.content, fileName)
          }
        } else {
          alert(result.error || 'Failed to duplicate')
        }
      } catch (error) {
        console.error('Failed to duplicate:', error)
      }
    },
    [loadFiles, loadFileContent]
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

  // Close context menu on scroll
  useEffect(() => {
    const handleScroll = (): void => {
      if (contextMenu.visible) {
        closeContextMenu()
      }
    }
    if (contextMenu.visible) {
      window.addEventListener('scroll', handleScroll, true)
      return (): void => {
        window.removeEventListener('scroll', handleScroll, true)
      }
    }
    return undefined
  }, [contextMenu.visible, closeContextMenu])

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

  // Listen for menu commands and custom events from TitleBar
  useEffect(() => {
    const unsubscribeNewFile = window.api.menu.onNewFile(openCreateFileModal)
    const unsubscribeNewFolder = window.api.menu.onNewFolder(openCreateFolderModal)

    // Listen for custom events from TitleBar
    const handleRequestNewFile = (): void => {
      openCreateFileModal()
    }
    const handleRequestNewFolder = (): void => {
      openCreateFolderModal()
    }

    document.addEventListener('request-new-file', handleRequestNewFile)
    document.addEventListener('request-new-folder', handleRequestNewFolder)

    return () => {
      unsubscribeNewFile()
      unsubscribeNewFolder()
      document.removeEventListener('request-new-file', handleRequestNewFile)
      document.removeEventListener('request-new-folder', handleRequestNewFolder)
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

  const getContextMenuItems = useCallback((): ContextMenuItem[] => {
    const items: ContextMenuItem[] = []

    // Root context menu
    if (contextMenu.isRoot) {
      items.push(
        {
          type: 'item',
          label: 'New File',
          icon: <FileIcon />,
          onClick: () => openCreateFileModal(null)
        },
        {
          type: 'item',
          label: 'New Folder',
          icon: <FolderPlusIcon />,
          onClick: () => openCreateFolderModal(null)
        },
        {
          type: 'divider'
        },
        {
          type: 'item',
          label: 'Show in Finder',
          icon: <ShowInFinderIcon />,
          onClick: () =>
            handleShowInFinder({ path: rootPath, name: 'MarkNotes', isDirectory: true })
        }
      )
      return items
    }

    // File/Folder context menu
    if (contextMenu.entry) {
      const entry = contextMenu.entry

      // Folder-specific items
      if (entry.isDirectory) {
        items.push(
          {
            type: 'item',
            label: 'New File',
            icon: <FileIcon />,
            onClick: () => openCreateFileModal(entry.path)
          },
          {
            type: 'item',
            label: 'New Folder',
            icon: <FolderPlusIcon />,
            onClick: () => openCreateFolderModal(entry.path)
          },
          {
            type: 'divider'
          }
        )
      }

      // File-specific "Open" item
      if (!entry.isDirectory) {
        items.push({
          type: 'item',
          label: 'Open',
          icon: <FileIcon />,
          onClick: () => handleFileSelect(entry.path, entry.name)
        })
      }

      // Common items for files and folders
      items.push(
        {
          type: 'item',
          label: 'Show in Finder',
          icon: <ShowInFinderIcon />,
          onClick: () => handleShowInFinder(entry)
        },
        {
          type: 'divider'
        },
        {
          type: 'item',
          label: 'Rename',
          icon: <RenameIcon />,
          onClick: () => handleStartRename(entry.path)
        },
        {
          type: 'item',
          label: entry.isDirectory ? 'Copy Folder Path' : 'Copy File Path',
          icon: <CopyIcon />,
          onClick: () => handleCopyPath(entry)
        }
      )

      // File-specific duplicate
      if (!entry.isDirectory) {
        items.push({
          type: 'item',
          label: 'Duplicate',
          icon: <DuplicateIcon />,
          onClick: () => handleDuplicate(entry)
        })
      }

      items.push(
        {
          type: 'divider'
        },
        {
          type: 'item',
          label: 'Delete',
          icon: <TrashIcon />,
          onClick: () => handleDelete(entry),
          danger: true
        }
      )
    }

    return items
  }, [
    contextMenu,
    rootPath,
    openCreateFileModal,
    openCreateFolderModal,
    handleFileSelect,
    handleShowInFinder,
    handleStartRename,
    handleCopyPath,
    handleDuplicate,
    handleDelete
  ])

  return (
    <div className="file-tree">
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
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={closeContextMenu}
          zIndex={10000}
        />
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

// Local icons not in utils/icons
function ChevronIcon(): React.JSX.Element {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 2l4 4-4 4" />
    </svg>
  )
}
