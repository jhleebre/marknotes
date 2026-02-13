import { useCallback } from 'react'
import { FileText } from 'lucide-react'
import appIcon from '../assets/app-icon.png'
import { useDocumentStore } from '../store/useDocumentStore'

function getRelativePath(fullPath: string): string {
  const markNotesIndex = fullPath.indexOf('MarkNotes/')
  if (markNotesIndex === -1) return fullPath
  return fullPath.slice(markNotesIndex + 'MarkNotes/'.length)
}

export function WelcomeScreen(): React.JSX.Element {
  const recentFiles = useDocumentStore((s) => s.recentFiles)
  const setCurrentFile = useDocumentStore((s) => s.setCurrentFile)
  const setContent = useDocumentStore((s) => s.setContent)
  const setOriginalContent = useDocumentStore((s) => s.setOriginalContent)
  const setIsLoadingContent = useDocumentStore((s) => s.setIsLoadingContent)
  const removeRecentFile = useDocumentStore((s) => s.removeRecentFile)

  const openRecentFile = useCallback(
    async (path: string, name: string) => {
      setIsLoadingContent(true)
      const result = await window.api.file.read(path)
      if (result.success && result.content !== undefined) {
        setCurrentFile(path, name)
        setContent(result.content)
        setOriginalContent(result.content)
      } else {
        removeRecentFile(path)
      }
      setIsLoadingContent(false)
    },
    [setCurrentFile, setContent, setOriginalContent, setIsLoadingContent, removeRecentFile]
  )

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="welcome-icon">
          <img src={appIcon} alt="MarkNotes" width="64" height="64" />
        </div>
        <h1>MarkNotes</h1>
        <p>Just write, forget syntax</p>
        {recentFiles.length > 0 && (
          <div className="welcome-recent">
            <h3>Recent Documents</h3>
            <ul className="recent-list">
              {recentFiles.map((file) => (
                <li key={file.path}>
                  <button
                    className="recent-item"
                    onClick={() => openRecentFile(file.path, file.name)}
                  >
                    <FileText className="icon" />
                    <span className="recent-item-name">{file.name}</span>
                    <span className="recent-item-path">{getRelativePath(file.path)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
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
