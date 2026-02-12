import { app, Menu, BrowserWindow, MenuItemConstructorOptions } from 'electron'

export function setupMenu(mainWindow: BrowserWindow, isDark: boolean = false): void {
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
          label: 'Export as PDF',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: (): void => {
            mainWindow.webContents.send('menu:exportPdf')
          }
        },
        { type: 'separator' },
        {
          label: 'Clean Up Unused Images',
          click: (): void => {
            mainWindow.webContents.send('menu:cleanupImages')
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
        ...(!isMac ? [{ type: 'separator' as const }, { role: 'quit' as const }] : [])
      ]
    },
    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: (): void => {
            mainWindow.webContents.send('menu:undo')
          }
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Shift+Z',
          click: (): void => {
            mainWindow.webContents.send('menu:redo')
          }
        },
        { type: 'separator' as const },
        {
          label: 'Find',
          accelerator: 'CmdOrCtrl+F',
          click: (): void => {
            mainWindow.webContents.send('menu:find')
          }
        },
        {
          label: 'Replace',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: (): void => {
            mainWindow.webContents.send('menu:replace')
          }
        },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        ...(isMac
          ? [{ role: 'delete' as const }, { role: 'selectAll' as const }]
          : [
              { role: 'delete' as const },
              { type: 'separator' as const },
              { role: 'selectAll' as const }
            ])
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
        {
          label: isDark ? 'Light Mode' : 'Dark Mode',
          click: (): void => {
            mainWindow.webContents.send('menu:toggleDarkMode')
          }
        },
        { type: 'separator' },
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' },
        {
          label: 'Actual Size',
          accelerator: 'CmdOrCtrl+0',
          click: (): void => {
            mainWindow.webContents.setZoomLevel(0)
          }
        },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: (): void => {
            mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 0.5)
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: (): void => {
            mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - 0.5)
          }
        },
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
              { role: 'front' as const }
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
