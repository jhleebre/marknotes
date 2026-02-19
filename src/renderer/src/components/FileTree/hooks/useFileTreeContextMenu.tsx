import { useState, useCallback } from 'react'
import type { FileEntry } from '../../../../../shared/types'
import type { ContextMenuItem } from '../../ContextMenu'
import {
  FileIcon,
  FolderPlusIcon,
  RenameIcon,
  TrashIcon,
  ShowInFinderIcon,
  CopyIcon,
  DuplicateIcon,
  SearchIcon
} from '../../../utils/icons'

export interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  entry: FileEntry | null
  isRoot: boolean
}

export function useFileTreeContextMenu(
  rootPath: string,
  openCreateFileModal: (parentPath: string | null) => void,
  openCreateFolderModal: (parentPath: string | null) => void,
  handleFileSelect: (path: string, name: string) => Promise<void>,
  handleShowInFinder: (entry: FileEntry) => Promise<void>,
  handleStartRename: (path: string) => void,
  handleCopyPath: (entry: FileEntry) => Promise<void>,
  handleDuplicate: (entry: FileEntry) => Promise<void>,
  handleDelete: (entry: FileEntry) => Promise<void>,
  handleSearchInFolder: (folderPath: string) => void
): {
  contextMenu: ContextMenuState
  handleContextMenu: (e: React.MouseEvent, entry: FileEntry) => void
  handleRootContextMenu: (e: React.MouseEvent) => void
  closeContextMenu: () => void
  getContextMenuItems: () => ContextMenuItem[]
} {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    entry: null,
    isRoot: false
  })

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

  const getContextMenuItems = useCallback((): ContextMenuItem[] => {
    const items: ContextMenuItem[] = []

    if (contextMenu.isRoot) {
      items.push(
        {
          type: 'item',
          label: 'New File',
          icon: <FileIcon className="icon" />,
          onClick: () => openCreateFileModal(null)
        },
        {
          type: 'item',
          label: 'New Folder',
          icon: <FolderPlusIcon className="icon" />,
          onClick: () => openCreateFolderModal(null)
        },
        {
          type: 'divider'
        },
        {
          type: 'item',
          label: 'Show in Finder',
          icon: <ShowInFinderIcon className="icon" />,
          onClick: () =>
            handleShowInFinder({ path: rootPath, name: 'MarkNotes', isDirectory: true })
        }
      )
      return items
    }

    if (contextMenu.entry) {
      const entry = contextMenu.entry

      if (entry.isDirectory) {
        items.push(
          {
            type: 'item',
            label: 'New File',
            icon: <FileIcon className="icon" />,
            onClick: () => openCreateFileModal(entry.path)
          },
          {
            type: 'item',
            label: 'New Folder',
            icon: <FolderPlusIcon className="icon" />,
            onClick: () => openCreateFolderModal(entry.path)
          },
          {
            type: 'divider'
          },
          {
            type: 'item',
            label: 'Search in Folder',
            icon: <SearchIcon className="icon" />,
            onClick: () => handleSearchInFolder(entry.path)
          },
          {
            type: 'divider'
          }
        )
      }

      if (!entry.isDirectory) {
        items.push({
          type: 'item',
          label: 'Open',
          icon: <FileIcon className="icon" />,
          onClick: () => handleFileSelect(entry.path, entry.name)
        })
      }

      items.push(
        {
          type: 'item',
          label: 'Show in Finder',
          icon: <ShowInFinderIcon className="icon" />,
          onClick: () => handleShowInFinder(entry)
        },
        {
          type: 'divider'
        },
        {
          type: 'item',
          label: 'Rename',
          icon: <RenameIcon className="icon" />,
          onClick: () => handleStartRename(entry.path)
        },
        {
          type: 'item',
          label: entry.isDirectory ? 'Copy Folder Path' : 'Copy File Path',
          icon: <CopyIcon className="icon" />,
          onClick: () => handleCopyPath(entry)
        }
      )

      if (!entry.isDirectory) {
        items.push({
          type: 'item',
          label: 'Duplicate',
          icon: <DuplicateIcon className="icon" />,
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
          icon: <TrashIcon className="icon" />,
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
    handleDelete,
    handleSearchInFolder
  ])

  return {
    contextMenu,
    handleContextMenu,
    handleRootContextMenu,
    closeContextMenu,
    getContextMenuItems
  }
}
