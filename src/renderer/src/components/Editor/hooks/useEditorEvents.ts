import { useEffect } from 'react'
import { useDocumentStore } from '../../../store/useDocumentStore'

export function useEditorEvents(
  handleLinkButtonClick: () => void,
  handleImageButtonClick: () => void,
  insertTable: () => void,
  editor: { isActive: (name: string) => boolean } | null
): void {
  // Listen for custom events from TitleBar
  useEffect(() => {
    const handleOpenLinkModal = (): void => {
      handleLinkButtonClick()
    }

    const handleOpenImageModal = (): void => {
      handleImageButtonClick()
    }

    const handleInsertTable = (): void => {
      insertTable()
    }

    document.addEventListener('open-link-modal', handleOpenLinkModal)
    document.addEventListener('open-image-modal', handleOpenImageModal)
    document.addEventListener('insert-table', handleInsertTable)

    return () => {
      document.removeEventListener('open-link-modal', handleOpenLinkModal)
      document.removeEventListener('open-image-modal', handleOpenImageModal)
      document.removeEventListener('insert-table', handleInsertTable)
    }
  }, [handleLinkButtonClick, handleImageButtonClick, insertTable])

  // Handle Cmd+K keyboard shortcut for link
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (editor?.isActive('heading')) {
          return
        }
        handleLinkButtonClick()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleLinkButtonClick, editor])

  // Handle link clicks in preview mode
  const {
    mode,
    currentFilePath,
    setCurrentFile,
    setContent,
    setOriginalContent,
    setIsLoadingContent
  } = useDocumentStore()

  useEffect(() => {
    const handlePreviewLinkClick = (e: Event): void => {
      const mouseEvent = e as MouseEvent
      const target = mouseEvent.target as HTMLElement
      const link = target.closest('a')
      if (link) {
        mouseEvent.preventDefault()
        const href = link.getAttribute('href')
        if (href) {
          if (href.startsWith('#')) {
            try {
              const targetId = decodeURIComponent(href.substring(1))
              const targetElement = document.getElementById(targetId)
              if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            } catch (err) {
              console.error('Failed to decode URI:', err)
            }
          } else if (
            href.endsWith('.md') &&
            !href.startsWith('http://') &&
            !href.startsWith('https://') &&
            !href.startsWith('file://') &&
            !href.startsWith('/')
          ) {
            const loadRelativeFile = async (): Promise<void> => {
              try {
                const decodedHref = decodeURIComponent(href)

                const currentPath = currentFilePath
                if (!currentPath) return

                const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/'))
                const targetPath = `${currentDir}/${decodedHref}`

                const exists = await window.api.file.exists(targetPath)
                if (!exists) {
                  console.error('File not found:', targetPath)
                  return
                }

                setIsLoadingContent(true)
                const result = await window.api.file.read(targetPath)
                if (result.success && result.content !== undefined) {
                  const fileName = decodedHref.split('/').pop() || decodedHref
                  setCurrentFile(targetPath, fileName)
                  setContent(result.content)
                  setOriginalContent(result.content)
                } else {
                  console.error('Failed to load file:', result.error)
                }
              } catch (error) {
                console.error('Failed to open relative file:', error)
              } finally {
                setIsLoadingContent(false)
              }
            }
            loadRelativeFile()
          } else {
            window.api.shell.openExternal(href).catch((err) => {
              console.error('Failed to open external link:', err)
            })
          }
        }
      }
    }

    const previewContent = document.querySelector('.preview-content')
    if (previewContent) {
      previewContent.addEventListener('click', handlePreviewLinkClick as EventListener)
      return (): void => {
        previewContent.removeEventListener('click', handlePreviewLinkClick as EventListener)
      }
    }
    return undefined
  }, [mode, currentFilePath, setCurrentFile, setContent, setOriginalContent, setIsLoadingContent])
}
