import { BrowserWindow } from 'electron'
import { registerFileHandlers } from './handlers/fileHandlers'
import { registerImageHandlers } from './handlers/imageHandlers'
import { registerExportHandlers } from './handlers/exportHandlers'
import { registerShellHandlers } from './handlers/shellHandlers'
import { registerSearchHandlers } from './handlers/searchHandlers'

export function setupFileHandlers(mainWindow: BrowserWindow): void {
  registerFileHandlers(mainWindow)
  registerImageHandlers()
  registerExportHandlers()
  registerShellHandlers()
  registerSearchHandlers()
}

export { cleanupOnQuit } from './services/imageManager'
