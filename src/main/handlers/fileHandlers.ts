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

export function registerFileHandlers(mainWindow: BrowserWindow): void {
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

  ipcMain.handle('file:rename', async (_, oldPath: string, newName: string) => {
    const result = await renameFile(oldPath, newName)
    if (result.success && result.content) {
      const newPath = result.content
      mainWindow.webContents.send('file:itemMoved', { oldPath, newPath })
      updateLinksAfterMove(oldPath, newPath)
        .then((changedPaths) => {
          if (changedPaths.length > 0) {
            mainWindow.webContents.send('file:linksUpdated', changedPaths)
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

  ipcMain.handle('file:move', async (_, sourcePath: string, targetDir: string) => {
    const result = await moveFile(sourcePath, targetDir)
    if (result.success && result.content) {
      const newPath = result.content
      mainWindow.webContents.send('file:itemMoved', { oldPath: sourcePath, newPath })
      updateLinksAfterMove(sourcePath, newPath)
        .then((changedPaths) => {
          if (changedPaths.length > 0) {
            mainWindow.webContents.send('file:linksUpdated', changedPaths)
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

  ipcMain.handle('file:watch', async () => {
    return startWatching(mainWindow)
  })

  ipcMain.handle('file:unwatch', async () => {
    return stopWatching()
  })
}
