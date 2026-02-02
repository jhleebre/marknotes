import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

export interface FileEntry {
  name: string
  isDirectory: boolean
  path: string
  children?: FileEntry[]
}

export interface FileResult {
  success: boolean
  content?: string
  files?: FileEntry[]
  error?: string
}

// Custom APIs for renderer
const api = {
  file: {
    getRootPath: (): Promise<string> => ipcRenderer.invoke('file:getRootPath'),
    read: (path: string): Promise<FileResult> => ipcRenderer.invoke('file:read', path),
    write: (path: string, content: string): Promise<FileResult> =>
      ipcRenderer.invoke('file:write', path, content),
    list: (): Promise<FileResult> => ipcRenderer.invoke('file:list'),
    create: (fileName: string, dirPath?: string): Promise<FileResult> =>
      ipcRenderer.invoke('file:create', fileName, dirPath),
    createFolder: (folderName: string, parentPath?: string): Promise<FileResult> =>
      ipcRenderer.invoke('file:createFolder', folderName, parentPath),
    delete: (path: string): Promise<FileResult> => ipcRenderer.invoke('file:delete', path),
    rename: (oldPath: string, newName: string): Promise<FileResult> =>
      ipcRenderer.invoke('file:rename', oldPath, newName),
    exists: (path: string): Promise<boolean> => ipcRenderer.invoke('file:exists', path),
    move: (sourcePath: string, targetDir: string): Promise<FileResult> =>
      ipcRenderer.invoke('file:move', sourcePath, targetDir),
    watch: (): Promise<FileResult> => ipcRenderer.invoke('file:watch'),
    unwatch: (): Promise<FileResult> => ipcRenderer.invoke('file:unwatch'),
    onChanged: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('file:changed', listener)
      return () => ipcRenderer.removeListener('file:changed', listener)
    },
    onExternalChange: (callback: (path: string) => void): (() => void) => {
      const listener = (_: unknown, path: string): void => callback(path)
      ipcRenderer.on('file:externalChange', listener)
      return () => ipcRenderer.removeListener('file:externalChange', listener)
    }
  },
  export: {
    html: (markdown: string, defaultName: string): Promise<FileResult> =>
      ipcRenderer.invoke('export:html', markdown, defaultName),
    pdf: (markdown: string, defaultName: string): Promise<FileResult> =>
      ipcRenderer.invoke('export:pdf', markdown, defaultName)
  },
  menu: {
    onNewFile: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('menu:newFile', listener)
      return () => ipcRenderer.removeListener('menu:newFile', listener)
    },
    onNewFolder: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('menu:newFolder', listener)
      return () => ipcRenderer.removeListener('menu:newFolder', listener)
    },
    onSave: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('menu:save', listener)
      return () => ipcRenderer.removeListener('menu:save', listener)
    },
    onExportHtml: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('menu:exportHtml', listener)
      return () => ipcRenderer.removeListener('menu:exportHtml', listener)
    },
    onExportPdf: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('menu:exportPdf', listener)
      return () => ipcRenderer.removeListener('menu:exportPdf', listener)
    },
    onSetMode: (callback: (mode: string) => void): (() => void) => {
      const listener = (_: unknown, mode: string): void => callback(mode)
      ipcRenderer.on('menu:setMode', listener)
      return () => ipcRenderer.removeListener('menu:setMode', listener)
    },
    onToggleSidebar: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('menu:toggleSidebar', listener)
      return () => ipcRenderer.removeListener('menu:toggleSidebar', listener)
    },
    onCloseFile: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('menu:closeFile', listener)
      return () => ipcRenderer.removeListener('menu:closeFile', listener)
    },
    onAbout: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('menu:about', listener)
      return () => ipcRenderer.removeListener('menu:about', listener)
    },
    onShortcuts: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('menu:shortcuts', listener)
      return () => ipcRenderer.removeListener('menu:shortcuts', listener)
    },
    onCleanupImages: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('menu:cleanupImages', listener)
      return () => ipcRenderer.removeListener('menu:cleanupImages', listener)
    }
  },
  theme: {
    onChanged: (callback: (isDark: boolean) => void): (() => void) => {
      const listener = (_: unknown, isDark: boolean): void => callback(isDark)
      ipcRenderer.on('theme:changed', listener)
      return () => ipcRenderer.removeListener('theme:changed', listener)
    }
  },
  shell: {
    openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url)
  },
  image: {
    upload: (): Promise<FileResult> => ipcRenderer.invoke('image:upload'),
    embedBase64: (imagePath: string): Promise<FileResult> =>
      ipcRenderer.invoke('image:embedBase64', imagePath),
    resolveAssetPath: (imagePath: string): Promise<FileResult> =>
      ipcRenderer.invoke('image:resolveAssetPath', imagePath),
    saveBase64: (filename: string, base64Data: string): Promise<FileResult> =>
      ipcRenderer.invoke('image:saveBase64', filename, base64Data),
    cleanup: (): Promise<FileResult> => ipcRenderer.invoke('image:cleanup')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
