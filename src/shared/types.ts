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
