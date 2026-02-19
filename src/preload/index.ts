import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { FileResult, SearchResult } from '../shared/types'

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
    duplicate: (path: string): Promise<FileResult> => ipcRenderer.invoke('file:duplicate', path),
    stat: (path: string): Promise<FileResult> => ipcRenderer.invoke('file:stat', path),
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
    },
    onLinksUpdated: (callback: (paths: string[]) => void): (() => void) => {
      const listener = (_: unknown, paths: string[]): void => callback(paths)
      ipcRenderer.on('file:linksUpdated', listener)
      return () => ipcRenderer.removeListener('file:linksUpdated', listener)
    },
    onItemMoved: (
      callback: (payload: { oldPath: string; newPath: string }) => void
    ): (() => void) => {
      const listener = (
        _: unknown,
        payload: { oldPath: string; newPath: string }
      ): void => callback(payload)
      ipcRenderer.on('file:itemMoved', listener)
      return () => ipcRenderer.removeListener('file:itemMoved', listener)
    }
  },
  export: {
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
    },
    onUndo: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('menu:undo', listener)
      return () => ipcRenderer.removeListener('menu:undo', listener)
    },
    onRedo: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('menu:redo', listener)
      return () => ipcRenderer.removeListener('menu:redo', listener)
    },
    onFind: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('menu:find', listener)
      return () => ipcRenderer.removeListener('menu:find', listener)
    },
    onReplace: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('menu:replace', listener)
      return () => ipcRenderer.removeListener('menu:replace', listener)
    },
    onToggleDarkMode: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('menu:toggleDarkMode', listener)
      return () => ipcRenderer.removeListener('menu:toggleDarkMode', listener)
    },
    onGlobalSearch: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('menu:globalSearch', listener)
      return () => ipcRenderer.removeListener('menu:globalSearch', listener)
    }
  },
  theme: {
    onChanged: (callback: (isDark: boolean) => void): (() => void) => {
      const listener = (_: unknown, isDark: boolean): void => callback(isDark)
      ipcRenderer.on('theme:changed', listener)
      return () => ipcRenderer.removeListener('theme:changed', listener)
    },
    update: (isDark: boolean): void => {
      ipcRenderer.send('theme:update', isDark)
    }
  },
  shell: {
    openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url),
    showInFinder: (path: string): Promise<FileResult> =>
      ipcRenderer.invoke('shell:showInFinder', path),
    copyPath: (path: string): Promise<FileResult> => ipcRenderer.invoke('shell:copyPath', path)
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
  },
  zoom: {
    zoomIn: (): Promise<void> => ipcRenderer.invoke('zoom:in'),
    zoomOut: (): Promise<void> => ipcRenderer.invoke('zoom:out'),
    reset: (): Promise<void> => ipcRenderer.invoke('zoom:reset')
  },
  search: {
    files: (
      query: string,
      targetPath: string,
      caseSensitive: boolean,
      mode: 'notes' | 'tags' = 'notes'
    ): Promise<SearchResult> =>
      ipcRenderer.invoke('search:files', query, targetPath, caseSensitive, mode)
  },
  app: {
    onSaveBeforeQuit: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('app:save-before-quit', listener)
      return () => ipcRenderer.removeListener('app:save-before-quit', listener)
    },
    saveComplete: (): void => {
      ipcRenderer.send('app:save-complete')
    }
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
