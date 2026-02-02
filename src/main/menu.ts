import { app, Menu, BrowserWindow, MenuItemConstructorOptions } from 'electron'

export function setupMenu(mainWindow: BrowserWindow): void {
  const isMac = process.platform === 'darwin'

  const template: MenuItemConstructorOptions[] = [
    // App Menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),
    // File Menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New File',
          accelerator: 'CmdOrCtrl+N',
          click: (): void => {
            mainWindow.webContents.send('menu:newFile')
          }
        },
        {
          label: 'New Folder',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: (): void => {
            mainWindow.webContents.send('menu:newFolder')
          }
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: (): void => {
            mainWindow.webContents.send('menu:save')
          }
        },
        { type: 'separator' },
        {
          label: 'Export as HTML',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: (): void => {
            mainWindow.webContents.send('menu:exportHtml')
          }
        },
        {
          label: 'Export as PDF',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: (): void => {
            mainWindow.webContents.send('menu:exportPdf')
          }
        },
        { type: 'separator' },
        {
          label: 'Close File',
          accelerator: 'CmdOrCtrl+W',
          click: (): void => {
            mainWindow.webContents.send('menu:closeFile')
          }
        },
        { type: 'separator' },
        isMac ? { role: 'quit' as const } : { role: 'quit' as const }
      ]
    },
    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const }
            ]
          : [{ role: 'delete' as const }, { type: 'separator' as const }, { role: 'selectAll' as const }])
      ]
    },
    // View Menu
    {
      label: 'View',
      submenu: [
        {
          label: 'Edit Mode',
          accelerator: 'CmdOrCtrl+1',
          click: (): void => {
            mainWindow.webContents.send('menu:setMode', 'wysiwyg')
          }
        },
        {
          label: 'Code Mode',
          accelerator: 'CmdOrCtrl+2',
          click: (): void => {
            mainWindow.webContents.send('menu:setMode', 'split')
          }
        },
        { type: 'separator' },
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+.',
          click: (): void => {
            mainWindow.webContents.send('menu:toggleSidebar')
          }
        },
        { type: 'separator' },
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' },
        { role: 'togglefullscreen' as const }
      ]
    },
    // Window Menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'close' as const },
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const }
            ]
          : [{ role: 'close' as const }])
      ]
    },
    // Help Menu
    {
      role: 'help' as const,
      submenu: [
        {
          label: 'About MarkNotes',
          click: (): void => {
            mainWindow.webContents.send('menu:about')
          }
        },
        { type: 'separator' },
        {
          label: 'Keyboard Shortcuts',
          accelerator: 'CmdOrCtrl+/',
          click: (): void => {
            mainWindow.webContents.send('menu:shortcuts')
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
