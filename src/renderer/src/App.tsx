import { useEffect } from 'react'
import { FileTree } from './components/FileTree'
import { Toolbar } from './components/Toolbar'
import { Editor } from './components/Editor'
import { StatusBar } from './components/StatusBar'
import { useDocumentStore } from './store/useDocumentStore'
import './App.css'

function App(): React.JSX.Element {
  const { isSidebarVisible, toggleSidebar, isDarkMode, setIsDarkMode, currentFilePath } = useDocumentStore()

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

  // Listen for toggle sidebar menu command
  useEffect(() => {
    const unsubscribe = window.api.menu.onToggleSidebar(() => {
      toggleSidebar()
    })

    return () => {
      unsubscribe()
    }
  }, [toggleSidebar])

  return (
    <div className="app">
      {isSidebarVisible && <FileTree />}
      <div className="main-content">
        <Toolbar />
        <div className="editor-area">
          {currentFilePath ? (
            <Editor />
          ) : (
            <WelcomeScreen />
          )}
        </div>
        <StatusBar />
      </div>
    </div>
  )
}

function WelcomeScreen(): React.JSX.Element {
  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="welcome-icon">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="currentColor">
            <path d="M8 8a4 4 0 0 1 4-4h28.686a4 4 0 0 1 2.828 1.172l10.314 10.314A4 4 0 0 1 55 18.314V56a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V8z" opacity="0.2" />
            <path d="M12 6a2 2 0 0 0-2 2v48a2 2 0 0 0 2 2h40a2 2 0 0 0 2-2V18.828a2 2 0 0 0-.586-1.414L43.586 7.586A2 2 0 0 0 42.172 7H12zM8 8a4 4 0 0 1 4-4h28.686a4 4 0 0 1 2.828 1.172l10.314 10.314A4 4 0 0 1 55 18.314V56a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V8z" />
            <path d="M42 7v10a2 2 0 0 0 2 2h10" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M18 28h28M18 36h28M18 44h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h1>Welcome to MarkNotes</h1>
        <p>A lightweight markdown editor for your notes</p>
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
            <span>Save</span>
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
