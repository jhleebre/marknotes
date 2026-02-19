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

export interface SearchMatchResult {
  lineNumber: number
  lineContent: string
  matchStart: number
  matchEnd: number
}

export interface FileSearchResult {
  filePath: string
  relativePath: string
  fileName: string
  matches: SearchMatchResult[]
}

export interface SearchResult {
  success: boolean
  results?: FileSearchResult[]
  totalMatches?: number
  error?: string
}
