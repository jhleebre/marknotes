import { useEffect, useState } from 'react'
import { FileTree } from './components/FileTree'
import { TitleBar } from './components/TitleBar'
import { Editor } from './components/Editor'
import { StatusBar } from './components/StatusBar'
import { useDocumentStore } from './store/useDocumentStore'
import { useAutoSave } from './hooks/useAutoSave'
import type { Editor as TipTapEditor } from '@tiptap/react'
import appIcon from './assets/app-icon.png'
import './App.css'

function App(): React.JSX.Element {
  const {
    isSidebarVisible,
    toggleSidebar,
    isDarkMode,
    setIsDarkMode,
    currentFilePath,
    content,
    originalContent,
    setMode
  } = useDocumentStore()
  const { saveNow } = useAutoSave()
  const [editor, setEditor] = useState<TipTapEditor | null>(null)

  // Apply dark mode class to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode)
  }, [isDarkMode])

  // Listen for system theme changes
  useEffect(() => {
    const unsubscribe = window.api.theme.onChanged((dark) => {
      setIsDarkMode(dark)
    })

    return () => {
      unsubscribe()
    }
  }, [setIsDarkMode])

  // Listen for save command (Cmd+S)
  useEffect(() => {
    const unsubscribe = window.api.menu.onSave(() => {
      saveNow()
    })

    return () => {
      unsubscribe()
    }
  }, [saveNow])

  // Listen for toggle sidebar menu command
  useEffect(() => {
    const unsubscribe = window.api.menu.onToggleSidebar(() => {
      toggleSidebar()
    })

    return () => {
      unsubscribe()
    }
  }, [toggleSidebar])

  // Listen for mode change menu command (Cmd+1 / Cmd+2)
  useEffect(() => {
    const unsubscribe = window.api.menu.onSetMode((mode) => {
      setMode(mode as 'wysiwyg' | 'split')
    })

    return () => {
      unsubscribe()
    }
  }, [setMode])

  // Listen for cleanup images menu command
  useEffect(() => {
    const unsubscribe = window.api.menu.onCleanupImages(async () => {
      const result = await window.api.image.cleanup()
      if (result.success) {
        alert(result.content || 'Cleanup completed successfully')
      } else {
        alert(`Cleanup failed: ${result.error}`)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Listen for app quit - save before quitting
  useEffect(() => {
    const unsubscribe = window.api.app.onSaveBeforeQuit(async () => {
      // Save if there are unsaved changes
      if (currentFilePath && content !== originalContent) {
        try {
          await window.api.file.write(currentFilePath, content)
        } catch (error) {
          console.error('Failed to save before quit:', error)
        }
      }

      // Notify main process that save is complete
      window.api.app.saveComplete()
    })

    return () => {
      unsubscribe()
    }
  }, [currentFilePath, content, originalContent])

  return (
    <div className="app">
      <TitleBar editor={editor} />
      <div className="app-body">
        {isSidebarVisible && <FileTree />}
        <div className="main-content">
          <div className="editor-area">
            {currentFilePath ? <Editor onEditorReady={setEditor} /> : <WelcomeScreen />}
          </div>
          <StatusBar />
        </div>
      </div>
    </div>
  )
}

function WelcomeScreen(): React.JSX.Element {
  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="welcome-icon">
          <img src={appIcon} alt="MarkNotes" width="64" height="64" />
        </div>
        <h1>MarkNotes</h1>
        <p>Just write, forget syntax</p>
        <div className="welcome-shortcuts">
          <div className="shortcut">
            <kbd>Cmd</kbd> + <kbd>N</kbd>
            <span>New File</span>
          </div>
          <div className="shortcut">
            <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>N</kbd>
            <span>New Folder</span>
          </div>
          <div className="shortcut">
            <kbd>Cmd</kbd> + <kbd>S</kbd>
            <span>Force Save</span>
          </div>
          <div className="shortcut">
            <kbd>Cmd</kbd> + <kbd>.</kbd>
            <span>Toggle Sidebar</span>
          </div>
          <div className="shortcut">
            <kbd>Cmd</kbd> + <kbd>1/2</kbd>
            <span>Switch Mode</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
