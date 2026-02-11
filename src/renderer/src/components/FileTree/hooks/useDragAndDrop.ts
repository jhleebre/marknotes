import { useState, useCallback } from 'react'
import type { FileEntry } from '../../../../../shared/types'

export interface DragState {
  isDragging: boolean
  draggedEntry: FileEntry | null
  dropTarget: string | null
}

export function useDragAndDrop(
  currentFilePath: string | null,
  setCurrentFile: (path: string | null, name: string | null) => void,
  rootPath: string,
  loadFiles: () => Promise<void>
): {
  dragState: DragState
  handleDragStart: (entry: FileEntry) => void
  handleDragEnd: () => void
  handleDragOver: (e: React.DragEvent, targetPath: string) => void
  handleDrop: (targetPath: string) => Promise<void>
  handleRootDragOver: (e: React.DragEvent) => void
  handleRootDrop: (e: React.DragEvent) => Promise<void>
} {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedEntry: null,
    dropTarget: null
  })

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
      const entryName = dragState.draggedEntry.name
      setDragState({
        isDragging: false,
        draggedEntry: null,
        dropTarget: null
      })

      try {
        const result = await window.api.file.move(sourcePath, targetPath)
        if (result.success) {
          if (sourcePath === currentFilePath && result.content) {
            setCurrentFile(result.content, entryName)
          }
          loadFiles()
        } else {
          alert(result.error || 'Failed to move')
        }
      } catch (error) {
        console.error('Failed to move:', error)
      }
    },
    [dragState.draggedEntry, currentFilePath, setCurrentFile, loadFiles]
  )

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
    const entryName = dragState.draggedEntry.name
    setDragState({
      isDragging: false,
      draggedEntry: null,
      dropTarget: null
    })

    try {
      const result = await window.api.file.move(sourcePath, rootPath)
      if (result.success) {
        if (sourcePath === currentFilePath && result.content) {
          setCurrentFile(result.content, entryName)
        }
        loadFiles()
      } else {
        alert(result.error || 'Failed to move')
      }
    } catch (error) {
      console.error('Failed to move:', error)
    }
  }

  return {
    dragState,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    handleRootDragOver,
    handleRootDrop
  }
}
