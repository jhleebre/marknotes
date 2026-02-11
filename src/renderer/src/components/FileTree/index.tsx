import { useState, useEffect, useCallback, useRef } from 'react'
import { useDocumentStore } from '../../store/useDocumentStore'
import type { FileEntry } from '../../../../shared/types'
import { CreateModal } from '../modals/CreateModal'
import { ContextMenu } from '../ContextMenu'
import { FileTreeItem } from './FileTreeItem'
import { useFileTreeContextMenu } from './hooks/useFileTreeContextMenu'
import { useDragAndDrop } from './hooks/useDragAndDrop'
import { markWrite, getLastWriteTime } from '../../utils/writeTracker'
import './FileTree.css'

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

  const currentFilePathRef = useRef(currentFilePath)
  useEffect(() => {
    currentFilePathRef.current = currentFilePath
  }, [currentFilePath])

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [editingPath, setEditingPath] = useState<string | null>(null)
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

  const handleFileSelect = useCallback(
    async (path: string, name: string): Promise<void> => {
      if (currentFilePath && content !== originalContent) {
        try {
          markWrite()
          await window.api.file.write(currentFilePath, content)
        } catch (error) {
          console.error('Failed to save before switching files:', error)
        }
      }
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
          if (parentPath) {
            setExpandedFolders((prev) => new Set([...prev, parentPath]))
          }
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

  // Context menu hook
  const {
    contextMenu,
    handleContextMenu,
    handleRootContextMenu,
    closeContextMenu,
    getContextMenuItems
  } = useFileTreeContextMenu(
    rootPath,
    openCreateFileModal,
    openCreateFolderModal,
    handleFileSelect,
    handleShowInFinder,
    handleStartRename,
    handleCopyPath,
    handleDuplicate,
    handleDelete
  )

  // Drag and drop hook
  const {
    dragState,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    handleRootDragOver,
    handleRootDrop
  } = useDragAndDrop(currentFilePath, setCurrentFile, rootPath, loadFiles)

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
      if (changedPath === currentFilePathRef.current) {
        // Skip if this change was triggered by our own save (within 2 seconds)
        if (Date.now() - getLastWriteTime() < 2000) {
          return
        }
        loadFileContent(changedPath, changedPath.split('/').pop() || '')
      }
    })

    return () => {
      unsubscribe()
      unsubscribeExternal()
      window.api.file.unwatch()
    }
  }, [loadFiles, loadFileContent])

  // Listen for menu commands and custom events from TitleBar
  useEffect(() => {
    const unsubscribeNewFile = window.api.menu.onNewFile(openCreateFileModal)
    const unsubscribeNewFolder = window.api.menu.onNewFolder(openCreateFolderModal)

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

      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={closeContextMenu}
          zIndex={10000}
        />
      )}

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
