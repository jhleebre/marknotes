import { ipcMain, shell } from 'electron'
import path from 'path'
import type { FileResult } from '../../shared/types'
import { ROOT_PATH } from '../utils'

export function registerShellHandlers(): void {
  ipcMain.handle('shell:openExternal', async (_, url: string): Promise<void> => {
    try {
      await shell.openExternal(url)
    } catch (error) {
      console.error('Failed to open external URL:', error)
    }
  })

  ipcMain.handle('shell:showInFinder', async (_, filePath: string): Promise<FileResult> => {
    try {
      const resolvedPath = path.resolve(filePath)
      if (!resolvedPath.startsWith(ROOT_PATH)) {
        return { success: false, error: 'Access denied: path outside root directory' }
      }

      shell.showItemInFolder(resolvedPath)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('shell:copyPath', async (_, filePath: string): Promise<FileResult> => {
    try {
      const resolvedPath = path.resolve(filePath)
      if (!resolvedPath.startsWith(ROOT_PATH)) {
        return { success: false, error: 'Access denied: path outside root directory' }
      }

      const { clipboard } = await import('electron')
      clipboard.writeText(resolvedPath)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })
}
