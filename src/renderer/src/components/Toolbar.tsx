import { useCallback, useEffect } from 'react'
import { useDocumentStore, EditorMode } from '../store/useDocumentStore'
import { useAutoSave } from '../hooks/useAutoSave'
import './Toolbar.css'

export function Toolbar(): React.JSX.Element {
  const {
    mode,
    setMode,
    currentFilePath,
    currentFileName,
    content,
    originalContent,
    saveStatus,
    isSidebarVisible,
    toggleSidebar,
    setCurrentFile,
    setContent,
    setOriginalContent
  } = useDocumentStore()
  const { saveNow } = useAutoSave()

  const handleModeChange = useCallback(
    (newMode: EditorMode): void => {
      setMode(newMode)
    },
    [setMode]
  )

  const handleExportHtml = useCallback(async (): Promise<void> => {
    if (!content || !currentFileName) return
    try {
      await window.api.export.html(content, currentFileName)
    } catch (error) {
      console.error('Failed to export HTML:', error)
    }
  }, [content, currentFileName])

  const handleExportPdf = useCallback(async (): Promise<void> => {
    if (!content || !currentFileName) return
    try {
      await window.api.export.pdf(content, currentFileName)
    } catch (error) {
      console.error('Failed to export PDF:', error)
    }
  }, [content, currentFileName])

  const handleCloseFile = useCallback(async (): Promise<void> => {
    // Save current file if there are unsaved changes
    if (currentFilePath && content !== originalContent) {
      try {
        await window.api.file.write(currentFilePath, content)
      } catch (error) {
        console.error('Failed to save before closing file:', error)
      }
    }

    // Close the file
    setCurrentFile(null, null)
    setContent('')
    setOriginalContent('')
  }, [currentFilePath, content, originalContent, setCurrentFile, setContent, setOriginalContent])

  // Listen for menu commands
  useEffect(() => {
    const unsubscribeSave = window.api.menu.onSave(() => {
      saveNow()
    })
    const unsubscribeExportHtml = window.api.menu.onExportHtml(handleExportHtml)
    const unsubscribeExportPdf = window.api.menu.onExportPdf(handleExportPdf)
    const unsubscribeSetMode = window.api.menu.onSetMode((newMode) => {
      handleModeChange(newMode as EditorMode)
    })
    const unsubscribeCloseFile = window.api.menu.onCloseFile(handleCloseFile)

    return () => {
      unsubscribeSave()
      unsubscribeExportHtml()
      unsubscribeExportPdf()
      unsubscribeSetMode()
      unsubscribeCloseFile()
    }
  }, [saveNow, handleExportHtml, handleExportPdf, handleModeChange, handleCloseFile])

  const isDisabled = !currentFilePath

  return (
    <div className="toolbar">
      <div className={`toolbar-left ${!isSidebarVisible ? 'sidebar-hidden' : ''}`}>
        <button
          className="sidebar-toggle-btn"
          onClick={toggleSidebar}
          data-tooltip={isSidebarVisible ? 'Hide Sidebar (Cmd+.)' : 'Show Sidebar (Cmd+.)'}
        >
          {isSidebarVisible ? <SidebarIcon /> : <SidebarHiddenIcon />}
        </button>
        <div className="file-info">
          {currentFileName ? (
            <>
              <span className="file-name">
                {currentFileName.endsWith('.md') ? currentFileName.slice(0, -3) : currentFileName}
              </span>
              <SaveStatusIndicator status={saveStatus} />
            </>
          ) : (
            <span className="no-file">Select a file to write</span>
          )}
        </div>
      </div>

      <div className="toolbar-center">
        <div className="mode-switcher">
          <button
            className={`mode-btn ${mode === 'wysiwyg' ? 'active' : ''}`}
            onClick={() => handleModeChange('wysiwyg')}
            disabled={isDisabled}
            data-tooltip="WYSIWYG Mode (Cmd+1)"
          >
            <EditIcon />
            <span>Edit</span>
          </button>
          <button
            className={`mode-btn ${mode === 'split' ? 'active' : ''}`}
            onClick={() => handleModeChange('split')}
            disabled={isDisabled}
            data-tooltip="Code Mode (Cmd+2)"
          >
            <CodeIcon />
            <span>Code</span>
          </button>
        </div>
      </div>

      <div className="toolbar-right">
        <div className="export-buttons">
          <button
            className="export-btn"
            onClick={handleExportHtml}
            disabled={isDisabled}
            data-tooltip="Export as HTML (Cmd+Shift+E)"
          >
            <HtmlIcon />
            <span>HTML</span>
          </button>
          <button
            className="export-btn"
            onClick={handleExportPdf}
            disabled={isDisabled}
            data-tooltip="Export as PDF (Cmd+Shift+P)"
          >
            <PdfIcon />
            <span>PDF</span>
          </button>
          <button
            className="close-file-btn"
            onClick={handleCloseFile}
            disabled={isDisabled}
            data-tooltip="Close File (Cmd+W)"
          >
            <CloseIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

function SaveStatusIndicator({ status }: { status: string }): React.JSX.Element {
  const getStatusInfo = (): { icon: React.ReactNode; text: string; className: string } => {
    switch (status) {
      case 'saving':
        return {
          icon: <SavingIcon />,
          text: 'Saving...',
          className: 'saving'
        }
      case 'saved':
        return {
          icon: <CheckIcon />,
          text: 'Saved',
          className: 'saved'
        }
      case 'unsaved':
        return {
          icon: <DotIcon />,
          text: 'Unsaved',
          className: 'unsaved'
        }
      case 'error':
        return {
          icon: <ErrorIcon />,
          text: 'Error',
          className: 'error'
        }
      default:
        return {
          icon: null,
          text: '',
          className: ''
        }
    }
  }

  const { icon, text, className } = getStatusInfo()

  return (
    <span className={`save-status ${className}`}>
      {icon}
      <span>{text}</span>
    </span>
  )
}

// Icons
function EditIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M12.146 1.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1 0 .708l-9.5 9.5a.5.5 0 0 1-.168.11l-4 1.5a.5.5 0 0 1-.65-.65l1.5-4a.5.5 0 0 1 .11-.168l9.5-9.5zM11.207 4L12 4.793 13.793 3 13 2.207 11.207 4z" />
    </svg>
  )
}

function CodeIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z" />
      <path d="M8 1v14" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

function SidebarIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M1 2a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2zm1 0v12h3V2H2zm4 0v12h8V2H6z" />
    </svg>
  )
}

function SidebarHiddenIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M1 2a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2zm13 0H2v12h12V2z" />
      <path d="M5 4h6M5 6h6M5 8h6M5 10h6M5 12h6" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  )
}

function CloseIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
    </svg>
  )
}

function HtmlIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      {/* Export arrow */}
      <path d="M8 12V4M8 4L5 7M8 4L11 7" strokeLinecap="round" strokeLinejoin="round" />
      {/* HTML brackets */}
      <path d="M2 9L4 11L2 13M14 9L12 11L14 13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PdfIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      {/* Export arrow */}
      <path d="M8 12V4M8 4L5 7M8 4L11 7" strokeLinecap="round" strokeLinejoin="round" />
      {/* Document icon */}
      <rect x="2" y="10" width="4" height="5" rx="0.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="10" y="10" width="4" height="5" rx="0.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SavingIcon(): React.JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className="spinning">
      <circle
        cx="6"
        cy="6"
        r="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="20"
        strokeDashoffset="5"
      />
    </svg>
  )
}

function CheckIcon(): React.JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <path d="M10.28 2.22a.75.75 0 0 1 0 1.06l-5.5 5.5a.75.75 0 0 1-1.06 0l-2.5-2.5a.75.75 0 1 1 1.06-1.06L4.5 7.44l4.97-4.97a.75.75 0 0 1 1.06 0z" />
    </svg>
  )
}

function DotIcon(): React.JSX.Element {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
      <circle cx="4" cy="4" r="4" />
    </svg>
  )
}

function ErrorIcon(): React.JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <path d="M6 0a6 6 0 1 0 0 12A6 6 0 0 0 6 0zM5.25 3a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-1.5 0V3zM6 9.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
    </svg>
  )
}
