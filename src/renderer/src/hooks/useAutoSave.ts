import { useEffect, useMemo } from 'react'
import debounce from 'lodash.debounce'
import { useDocumentStore } from '../store/useDocumentStore'
import { saveDocument } from '../utils/saveDocument'

const AUTO_SAVE_DELAY = 5000 // 5 seconds

// Debounced auto-save scheduler. Mount exactly once (in App) — actual saving
// lives in saveDocument(), which other call sites use directly.
export function useAutoSave(): void {
  const content = useDocumentStore((s) => s.content)
  const originalContent = useDocumentStore((s) => s.originalContent)
  const currentFilePath = useDocumentStore((s) => s.currentFilePath)

  const debouncedSave = useMemo(
    () =>
      debounce(() => {
        saveDocument()
      }, AUTO_SAVE_DELAY),
    []
  )

  // Trigger debounced save when content changes
  useEffect(() => {
    if (currentFilePath && content !== originalContent) {
      debouncedSave()
    }
  }, [content, currentFilePath, originalContent, debouncedSave])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel()
    }
  }, [debouncedSave])
}
