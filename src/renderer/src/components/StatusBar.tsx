import { useDocumentStore } from '../store/useDocumentStore'
import './StatusBar.css'

export function StatusBar(): React.JSX.Element {
  const { wordCount, charCount, currentFilePath, mode } = useDocumentStore()

  const getModeLabel = (): string => {
    switch (mode) {
      case 'wysiwyg':
        return 'Edit'
      case 'split':
        return 'Split'
      default:
        return ''
    }
  }

  return (
    <div className="status-bar">
      <div className="status-left">
        {currentFilePath && (
          <span className="status-item mode">{getModeLabel()}</span>
        )}
      </div>
      <div className="status-right">
        {currentFilePath && (
          <>
            <span className="status-item">{wordCount} words</span>
            <span className="status-divider">|</span>
            <span className="status-item">{charCount} characters</span>
          </>
        )}
      </div>
    </div>
  )
}
