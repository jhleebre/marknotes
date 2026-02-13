import { ElectronAPI } from '@electron-toolkit/preload'

export type { FileEntry, FileResult } from '../shared/types'
import type { FileResult } from '../shared/types'

export interface FileAPI {
  getRootPath: () => Promise<string>
  read: (path: string) => Promise<FileResult>
  write: (path: string, content: string) => Promise<FileResult>
  list: () => Promise<FileResult>
  create: (fileName: string, dirPath?: string) => Promise<FileResult>
  createFolder: (folderName: string, parentPath?: string) => Promise<FileResult>
  delete: (path: string) => Promise<FileResult>
  rename: (oldPath: string, newName: string) => Promise<FileResult>
  exists: (path: string) => Promise<boolean>
  move: (sourcePath: string, targetDir: string) => Promise<FileResult>
  duplicate: (path: string) => Promise<FileResult>
  watch: () => Promise<FileResult>
  unwatch: () => Promise<FileResult>
  onChanged: (callback: () => void) => () => void
  onExternalChange: (callback: (path: string) => void) => () => void
}

export interface ExportAPI {
  pdf: (markdown: string, defaultName: string) => Promise<FileResult>
}

export interface MenuAPI {
  onNewFile: (callback: () => void) => () => void
  onNewFolder: (callback: () => void) => () => void
  onSave: (callback: () => void) => () => void
  onExportPdf: (callback: () => void) => () => void
  onSetMode: (callback: (mode: string) => void) => () => void
  onToggleSidebar: (callback: () => void) => () => void
  onCloseFile: (callback: () => void) => () => void
  onAbout: (callback: () => void) => () => void
  onShortcuts: (callback: () => void) => () => void
  onCleanupImages: (callback: () => void) => () => void
  onUndo: (callback: () => void) => () => void
  onRedo: (callback: () => void) => () => void
  onFind: (callback: () => void) => () => void
  onReplace: (callback: () => void) => () => void
  onToggleDarkMode: (callback: () => void) => () => void
}

export interface ThemeAPI {
  onChanged: (callback: (isDark: boolean) => void) => () => void
  update: (isDark: boolean) => void
}

export interface ShellAPI {
  openExternal: (url: string) => Promise<void>
  showInFinder: (path: string) => Promise<FileResult>
  copyPath: (path: string) => Promise<FileResult>
}

export interface ImageAPI {
  upload: () => Promise<FileResult>
  embedBase64: (imagePath: string) => Promise<FileResult>
  resolveAssetPath: (imagePath: string) => Promise<FileResult>
  saveBase64: (filename: string, base64Data: string) => Promise<FileResult>
  cleanup: () => Promise<FileResult>
}

export interface ZoomAPI {
  zoomIn: () => Promise<void>
  zoomOut: () => Promise<void>
  reset: () => Promise<void>
}

export interface AppAPI {
  onSaveBeforeQuit: (callback: () => void) => () => void
  saveComplete: () => void
}

export interface API {
  file: FileAPI
  export: ExportAPI
  menu: MenuAPI
  theme: ThemeAPI
  shell: ShellAPI
  image: ImageAPI
  zoom: ZoomAPI
  app: AppAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
