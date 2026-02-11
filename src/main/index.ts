import { app, shell, BrowserWindow, nativeTheme, clipboard, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { setupFileHandlers, cleanupOnQuit } from './setupHandlers'
import { setupMenu } from './menu'

// Set app name early for macOS menu bar
app.name = 'MarkNotes'

let mainWindow: BrowserWindow | null = null
let isQuitting = false

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Handle Cmd+- for zoom out via before-input-event
  // Electron's menu accelerator for 'CmdOrCtrl+-' does not reliably register on macOS
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && (input.meta || input.control) && input.key === '-') {
      mainWindow!.webContents.setZoomLevel(mainWindow!.webContents.getZoomLevel() - 0.5)
      event.preventDefault()
    }
  })

  // Setup file system handlers
  setupFileHandlers(mainWindow)

  // Setup native menu
  setupMenu(mainWindow)

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.marknotes')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed
// Modified to quit on macOS as well for single-window app behavior
app.on('window-all-closed', () => {
  app.quit()
})

// Handle save-complete message from renderer
ipcMain.on('app:save-complete', async () => {
  if (!isQuitting) return

  console.log('[Quit] Received save-complete from renderer')

  // Clear clipboard to prevent pasting deleted images after app restart
  clipboard.clear()
  console.log('[Cleanup] Clipboard cleared')

  // Cleanup unreferenced image files
  await cleanupOnQuit()

  console.log('[Quit] Cleanup complete, quitting app')

  // Quit the app (will trigger before-quit again but isQuitting is true so it will proceed)
  app.quit()
})

// Save before quitting and cleanup
app.on('before-quit', (event) => {
  if (isQuitting) {
    // Already in quitting process, allow it to proceed
    return
  }

  // First quit attempt - prevent and save first
  event.preventDefault()
  isQuitting = true

  console.log('[Quit] Requesting renderer to save before quit')

  // Ask renderer to save any unsaved changes
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app:save-before-quit')
  } else {
    // No window or window destroyed, proceed with quit
    app.quit()
  }
})

// Handle theme changes
nativeTheme.on('updated', () => {
  if (mainWindow) {
    mainWindow.webContents.send('theme:changed', nativeTheme.shouldUseDarkColors)
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
