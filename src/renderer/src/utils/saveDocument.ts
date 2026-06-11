// Single source of truth for writing the current document to disk.
// Every save path (auto-save, Cmd+S, file switch, close, quit) goes through
// here so the `updated` frontmatter stamp and store bookkeeping stay consistent.
import { useDocumentStore } from '../store/useDocumentStore'
import { markWrite } from './writeTracker'
import { stampUpdated } from './frontmatter'

interface SaveOptions {
  /** Write even when the content is unchanged (explicit Cmd+S). */
  force?: boolean
}

export async function saveDocument(options: SaveOptions = {}): Promise<void> {
  const { currentFilePath, content, originalContent, setSaveStatus, setOriginalContent } =
    useDocumentStore.getState()

  if (!currentFilePath) return
  if (!options.force && content === originalContent) return

  // Stamp the updated date in frontmatter (only if frontmatter exists)
  const stamped = stampUpdated(content)

  setSaveStatus('saving')

  try {
    markWrite()
    const result = await window.api.file.write(currentFilePath, stamped)
    if (!result.success) {
      console.error('Save failed:', result.error)
      setSaveStatus('error')
      return
    }

    setOriginalContent(stamped)

    const after = useDocumentStore.getState()
    if (after.currentFilePath === currentFilePath && after.content === content) {
      // Keep the in-memory content in sync with what was written (date stamp),
      // unless the user kept typing while the write was in flight
      if (stamped !== content) {
        useDocumentStore.setState({ content: stamped })
      }
      setSaveStatus('saved')
    } else if (after.currentFilePath === currentFilePath) {
      setSaveStatus('unsaved')
    }
  } catch (error) {
    console.error('Save error:', error)
    setSaveStatus('error')
  }
}
