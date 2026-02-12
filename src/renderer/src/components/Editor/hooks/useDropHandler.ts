import { useEffect, useRef } from 'react'
import { ALLOWED_IMAGE_EXTENSIONS } from '../../../../../shared/constants'

function isImageFile(filename: string): boolean {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase()
  return ALLOWED_IMAGE_EXTENSIONS.includes(ext)
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (): void => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1]
      resolve(base64)
    }
    reader.onerror = (): void => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function useDropHandler(
  handleImageInsert: (src: string, alt: string) => Promise<void>,
  currentFilePath: string | null
): void {
  const dragCounter = useRef(0)

  useEffect(() => {
    const editorElement = document.querySelector('.wysiwyg-editor')
    if (!editorElement) return

    const handleDragOver = (e: Event): void => {
      const dragEvent = e as DragEvent
      dragEvent.preventDefault()
      dragEvent.stopPropagation()
    }

    const handleDragEnter = (e: Event): void => {
      const dragEvent = e as DragEvent
      dragEvent.preventDefault()
      dragEvent.stopPropagation()
      dragCounter.current++
      if (dragCounter.current === 1) {
        editorElement.classList.add('drag-over')
      }
    }

    const handleDragLeave = (e: Event): void => {
      const dragEvent = e as DragEvent
      dragEvent.preventDefault()
      dragEvent.stopPropagation()
      dragCounter.current--
      if (dragCounter.current === 0) {
        editorElement.classList.remove('drag-over')
      }
    }

    const handleDrop = (e: Event): void => {
      const dragEvent = e as DragEvent
      dragEvent.preventDefault()
      dragEvent.stopPropagation()
      dragCounter.current = 0
      editorElement.classList.remove('drag-over')

      if (!currentFilePath || !dragEvent.dataTransfer?.files.length) return

      const files = Array.from(dragEvent.dataTransfer.files)
      const imageFiles = files.filter((f) => isImageFile(f.name))

      if (imageFiles.length === 0) return

      const processFiles = async (): Promise<void> => {
        for (const file of imageFiles) {
          try {
            const base64 = await readFileAsBase64(file)
            const result = await window.api.image.saveBase64(file.name, base64)
            if (result.success && result.content) {
              await handleImageInsert(result.content, '')
            }
          } catch (error) {
            console.error('Failed to insert dropped image:', error)
          }
        }
      }

      processFiles()
    }

    editorElement.addEventListener('dragover', handleDragOver)
    editorElement.addEventListener('dragenter', handleDragEnter)
    editorElement.addEventListener('dragleave', handleDragLeave)
    editorElement.addEventListener('drop', handleDrop)

    return (): void => {
      editorElement.removeEventListener('dragover', handleDragOver)
      editorElement.removeEventListener('dragenter', handleDragEnter)
      editorElement.removeEventListener('dragleave', handleDragLeave)
      editorElement.removeEventListener('drop', handleDrop)
    }
  }, [handleImageInsert, currentFilePath])
}
