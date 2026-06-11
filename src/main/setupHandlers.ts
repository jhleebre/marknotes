import { registerFileHandlers } from './handlers/fileHandlers'
import { registerImageHandlers } from './handlers/imageHandlers'
import { registerExportHandlers } from './handlers/exportHandlers'
import { registerShellHandlers } from './handlers/shellHandlers'
import { registerSearchHandlers } from './handlers/searchHandlers'

// Register all IPC handlers. Must be called exactly once (ipcMain.handle
// throws on duplicate registration), independent of window creation.
export function setupFileHandlers(): void {
  registerFileHandlers()
  registerImageHandlers()
  registerExportHandlers()
  registerShellHandlers()
  registerSearchHandlers()
}

export { cleanupOnQuit } from './services/imageManager'
