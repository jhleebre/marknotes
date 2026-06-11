import { ipcMain, BrowserWindow } from 'electron'
import { ROOT_PATH } from '../utils'
import {
  readFile,
  writeFile,
  listFiles,
  createFile,
  createFolder,
  deleteFile,
  renameFile,
  fileExists,
  moveFile,
  duplicateFile,
  statFile
} from '../services/fileOperations'
import { startWatching, stopWatching } from '../services/fileWatcher'
import { updateLinksAfterMove } from '../services/linkUpdater'
import { updateReferencesAfterMove } from '../services/imageManager'

export function registerFileHandlers(): void {
  ipcMain.handle('file:getRootPath', () => {
    return ROOT_PATH
  })

  ipcMain.handle('file:read', async (_, filePath: string) => {
    return readFile(filePath)
  })

  ipcMain.handle('file:write', async (_, filePath: string, content: string) => {
    return writeFile(filePath, content)
  })

  ipcMain.handle('file:list', async () => {
    return listFiles()
  })

  ipcMain.handle('file:create', async (_, fileName: string, dirPath?: string) => {
    return createFile(fileName, dirPath)
  })

  ipcMain.handle('file:createFolder', async (_, folderName: string, parentPath?: string) => {
    return createFolder(folderName, parentPath)
  })

  ipcMain.handle('file:delete', async (_, filePath: string) => {
    return deleteFile(filePath)
  })

  ipcMain.handle('file:rename', async (event, oldPath: string, newName: string) => {
    const result = await renameFile(oldPath, newName)
    if (result.success && result.content) {
      const win = BrowserWindow.fromWebContents(event.sender)
      const newPath = result.content
      win?.webContents.send('file:itemMoved', { oldPath, newPath })
      updateReferencesAfterMove(oldPath, newPath).catch((err) => {
        console.error('[imageManager] renameFile reference update failed:', err)
      })
      updateLinksAfterMove(oldPath, newPath)
        .then((changedPaths) => {
          if (changedPaths.length > 0 && win && !win.isDestroyed()) {
            win.webContents.send('file:linksUpdated', changedPaths)
          }
        })
        .catch((err) => {
          console.error('[linkUpdater] renameFile link update failed:', err)
        })
    }
    return result
  })

  ipcMain.handle('file:exists', async (_, filePath: string) => {
    return fileExists(filePath)
  })

  ipcMain.handle('file:move', async (event, sourcePath: string, targetDir: string) => {
    const result = await moveFile(sourcePath, targetDir)
    if (result.success && result.content) {
      const win = BrowserWindow.fromWebContents(event.sender)
      const newPath = result.content
      win?.webContents.send('file:itemMoved', { oldPath: sourcePath, newPath })
      updateReferencesAfterMove(sourcePath, newPath).catch((err) => {
        console.error('[imageManager] moveFile reference update failed:', err)
      })
      updateLinksAfterMove(sourcePath, newPath)
        .then((changedPaths) => {
          if (changedPaths.length > 0 && win && !win.isDestroyed()) {
            win.webContents.send('file:linksUpdated', changedPaths)
          }
        })
        .catch((err) => {
          console.error('[linkUpdater] moveFile link update failed:', err)
        })
    }
    return result
  })

  ipcMain.handle('file:duplicate', async (_, filePath: string) => {
    return duplicateFile(filePath)
  })

  ipcMain.handle('file:stat', async (_, filePath: string) => {
    return statFile(filePath)
  })

  ipcMain.handle('file:watch', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) {
      return { success: false, error: 'No window associated with this request' }
    }
    return startWatching(win)
  })

  ipcMain.handle('file:unwatch', async () => {
    return stopWatching()
  })
}
