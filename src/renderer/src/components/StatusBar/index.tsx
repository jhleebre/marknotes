import { useDocumentStore } from '../../store/useDocumentStore'
import './StatusBar.css'

export function StatusBar(): React.JSX.Element {
  const { wordCount, charCount, currentFilePath, rootPath, currentLine, totalLines } =
    useDocumentStore()

  const getDisplayPath = (): string => {
    if (!currentFilePath || !rootPath) return ''
    // Get relative path from root
    let relativePath = currentFilePath.replace(rootPath, '').replace(/^[/\\]/, '')
    // Remove .md extension
    if (relativePath.endsWith('.md')) {
      relativePath = relativePath.slice(0, -3)
    }
    return relativePath
  }

  return (
    <div className="status-bar">
      <div className="status-left">
        {currentFilePath && <span className="status-item file-name">{getDisplayPath()}</span>}
      </div>
      <div className="status-right">
        {currentFilePath && (
          <>
            <span className="status-item">
              Line {currentLine}/{totalLines}
            </span>
            <span className="status-divider">|</span>
            <span className="status-item">{wordCount} words</span>
            <span className="status-divider">|</span>
            <span className="status-item">{charCount} characters</span>
          </>
        )}
      </div>
    </div>
  )
}
