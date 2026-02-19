import { ipcMain } from 'electron'
import { searchFiles, searchTags } from '../services/searchService'

export function registerSearchHandlers(): void {
  ipcMain.handle(
    'search:files',
    async (
      _,
      query: string,
      targetPath: string,
      caseSensitive: boolean,
      mode: 'notes' | 'tags' = 'notes'
    ) => {
      return mode === 'tags'
        ? searchTags(query, targetPath, caseSensitive)
        : searchFiles(query, targetPath, caseSensitive)
    }
  )
}
