import { useEffect, useCallback, useRef } from 'react'
import debounce from 'lodash.debounce'
import { useDocumentStore } from '../store/useDocumentStore'

const AUTO_SAVE_DELAY = 5000 // 5 seconds

export function useAutoSave(): {
  saveNow: () => Promise<void>
} {
  const { currentFilePath, content, originalContent, setSaveStatus, setOriginalContent } =
    useDocumentStore()

  const contentRef = useRef(content)
  const pathRef = useRef(currentFilePath)

  // Keep refs updated
  useEffect(() => {
    contentRef.current = content
    pathRef.current = currentFilePath
  }, [content, currentFilePath])

  const performSave = useCallback(async (): Promise<void> => {
    const filePath = pathRef.current
    const fileContent = contentRef.current

    if (!filePath || fileContent === originalContent) {
      return
    }

    setSaveStatus('saving')

    try {
      const result = await window.api.file.write(filePath, fileContent)
      if (result.success) {
        setOriginalContent(fileContent)
        setSaveStatus('saved')
      } else {
        console.error('Save failed:', result.error)
        setSaveStatus('error')
      }
    } catch (error) {
      console.error('Save error:', error)
      setSaveStatus('error')
    }
  }, [originalContent, setSaveStatus, setOriginalContent])

  // Debounced auto-save
  const debouncedSave = useCallback(
    debounce(() => {
      performSave()
    }, AUTO_SAVE_DELAY),
    [performSave]
  )

  // Trigger debounced save when content changes
  useEffect(() => {
    if (currentFilePath && content !== originalContent) {
      debouncedSave()
    }

    return () => {
      debouncedSave.cancel()
    }
  }, [content, currentFilePath, originalContent, debouncedSave])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel()
    }
  }, [debouncedSave])

  // Manual save function
  const saveNow = useCallback(async (): Promise<void> => {
    debouncedSave.cancel()
    await performSave()
  }, [debouncedSave, performSave])

  return { saveNow }
}
