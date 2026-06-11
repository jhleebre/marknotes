import { ipcMain, shell } from 'electron'
import path from 'path'
import type { FileResult } from '../../shared/types'
import { validatePath } from '../utils'

const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

export function isAllowedExternalUrl(url: string): boolean {
  try {
    return ALLOWED_EXTERNAL_PROTOCOLS.has(new URL(url).protocol)
  } catch {
    return false
  }
}

export function registerShellHandlers(): void {
  ipcMain.handle('shell:openExternal', async (_, url: string): Promise<void> => {
    try {
      if (!isAllowedExternalUrl(url)) {
        console.error('Blocked external URL with disallowed protocol:', url)
        return
      }
      await shell.openExternal(url)
    } catch (error) {
      console.error('Failed to open external URL:', error)
    }
  })

  ipcMain.handle('shell:showInFinder', async (_, filePath: string): Promise<FileResult> => {
    try {
      const resolvedPath = path.resolve(filePath)
      if (!validatePath(resolvedPath)) {
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
      if (!validatePath(resolvedPath)) {
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
