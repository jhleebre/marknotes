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
  duplicateFile
} from '../services/fileOperations'
import { startWatching, stopWatching } from '../services/fileWatcher'

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
    return renameFile(oldPath, newName)
  })

  ipcMain.handle('file:exists', async (_, filePath: string) => {
    return fileExists(filePath)
  })

  ipcMain.handle('file:move', async (_, sourcePath: string, targetDir: string) => {
    return moveFile(sourcePath, targetDir)
  })

  ipcMain.handle('file:duplicate', async (_, filePath: string) => {
    return duplicateFile(filePath)
  })

  ipcMain.handle('file:watch', async () => {
    return startWatching(mainWindow)
  })

  ipcMain.handle('file:unwatch', async () => {
    return stopWatching()
  })
}
