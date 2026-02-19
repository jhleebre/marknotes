import { create } from 'zustand'
import type { FileEntry, FileSearchResult } from '../../../shared/types'

export interface RecentFile {
  path: string
  name: string
}

export type EditorMode = 'wysiwyg' | 'split'

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

export interface PendingGlobalJump {
  query: string
  matchIndex: number // 0-based index of the clicked match within the file's results
  caseSensitive: boolean
}

export interface DocumentState {
  // File tree
  files: FileEntry[]
  rootPath: string
  isLoadingFiles: boolean

  // Current document
  currentFilePath: string | null
  currentFileName: string | null
  content: string
  originalContent: string // For tracking changes
  isLoadingContent: boolean

  // Editor state
  mode: EditorMode
  saveStatus: SaveStatus
  wordCount: number
  charCount: number
  currentLine: number
  totalLines: number
  editorSelectionKey: number

  // UI state
  isSidebarVisible: boolean
  previousSidebarVisible: boolean
  isDarkMode: boolean
  isMetadataVisible: boolean

  // Recent files
  recentFiles: RecentFile[]

  // Find (in-document) state
  isFindVisible: boolean
  findQuery: string
  replaceText: string
  isReplaceVisible: boolean
  caseSensitive: boolean

  // Global search state
  isGlobalSearchOpen: boolean
  globalSearchTargetPath: string
  globalSearchQuery: string
  globalSearchResults: FileSearchResult[]
  globalSearchTotalMatches: number
  isSearching: boolean
  globalSearchCaseSensitive: boolean
  pendingGlobalJump: PendingGlobalJump | null

  // Actions
  setFiles: (files: FileEntry[]) => void
  setRootPath: (path: string) => void
  setIsLoadingFiles: (loading: boolean) => void

  setCurrentFile: (path: string | null, name: string | null) => void
  setContent: (content: string) => void
  setOriginalContent: (content: string) => void
  setIsLoadingContent: (loading: boolean) => void

  setMode: (mode: EditorMode) => void
  setSaveStatus: (status: SaveStatus) => void
  updateCounts: (content: string) => void
  setLineNumbers: (current: number, total: number) => void
  bumpSelectionKey: () => void

  toggleSidebar: () => void
  setIsDarkMode: (isDark: boolean) => void
  toggleMetadata: () => void

  setFindVisible: (visible: boolean) => void
  setFindQuery: (query: string) => void
  setReplaceText: (text: string) => void
  setReplaceVisible: (visible: boolean) => void
  setCaseSensitive: (sensitive: boolean) => void
  closeFind: () => void

  openGlobalSearch: (targetPath?: string) => void
  closeGlobalSearch: () => void
  closeGlobalSearchAndShowSidebar: () => void
  toggleGlobalSearch: () => void
  setGlobalSearchQuery: (query: string) => void
  setGlobalSearchResults: (results: FileSearchResult[], totalMatches: number) => void
  setIsSearching: (searching: boolean) => void
  setGlobalSearchTargetPath: (path: string) => void
  setGlobalSearchCaseSensitive: (sensitive: boolean) => void
  setPendingGlobalJump: (jump: PendingGlobalJump) => void
  clearPendingGlobalJump: () => void

  removeRecentFile: (path: string) => void

  // Computed
  hasUnsavedChanges: () => boolean
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  // File tree
  files: [],
  rootPath: '',
  isLoadingFiles: false,

  // Current document
  currentFilePath: null,
  currentFileName: null,
  content: '',
  originalContent: '',
  isLoadingContent: false,

  // Editor state
  mode: 'wysiwyg',
  saveStatus: 'saved',
  wordCount: 0,
  charCount: 0,
  currentLine: 1,
  totalLines: 1,
  editorSelectionKey: 0,

  // UI state
  isSidebarVisible: true,
  previousSidebarVisible: true,
  isDarkMode: (() => {
    const stored = localStorage.getItem('darkMode')
    if (stored !== null) return stored === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })(),
  isMetadataVisible: false,

  // Recent files
  recentFiles: (() => {
    try {
      const stored = localStorage.getItem('recentFiles')
      return stored ? (JSON.parse(stored) as RecentFile[]) : []
    } catch {
      return []
    }
  })(),

  // Find (in-document) state
  isFindVisible: false,
  findQuery: '',
  replaceText: '',
  isReplaceVisible: false,
  caseSensitive: false,

  // Global search state
  isGlobalSearchOpen: false,
  globalSearchTargetPath: '',
  globalSearchQuery: '',
  globalSearchResults: [],
  globalSearchTotalMatches: 0,
  isSearching: false,
  globalSearchCaseSensitive: false,
  pendingGlobalJump: null,

  // Actions
  setFiles: (files): void => set({ files }),
  setRootPath: (path): void => set({ rootPath: path }),
  setIsLoadingFiles: (loading): void => set({ isLoadingFiles: loading }),

  setCurrentFile: (path, name): void => {
    if (path && name) {
      const state = get()
      const updated = [{ path, name }, ...state.recentFiles.filter((f) => f.path !== path)].slice(
        0,
        5
      )
      try {
        localStorage.setItem('recentFiles', JSON.stringify(updated))
      } catch {
        // ignore storage errors
      }
      set({
        currentFilePath: path,
        currentFileName: name,
        saveStatus: 'saved',
        recentFiles: updated
      })
    } else {
      set({
        currentFilePath: path,
        currentFileName: name,
        saveStatus: 'saved'
      })
    }
  },

  setContent: (content): void => {
    const state = get()
    const hasChanges = content !== state.originalContent
    set({
      content,
      saveStatus: hasChanges ? 'unsaved' : 'saved'
    })
  },

  setOriginalContent: (content): void => set({ originalContent: content }),

  setIsLoadingContent: (loading): void => set({ isLoadingContent: loading }),

  setMode: (mode): void => set({ mode }),

  setSaveStatus: (status): void => set({ saveStatus: status }),

  updateCounts: (content): void => {
    let text = content
    // Strip images (including base64 data URLs)
    text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    // Strip HTML comments (e.g., <!-- size:small -->)
    text = text.replace(/<!--[\s\S]*?-->/g, '')
    // Strip table separator rows (e.g., | --- | --- |)
    text = text.replace(/^\|[\s:|-]+\|$/gm, '')
    // Strip table pipes
    text = text.replace(/\|/g, ' ')
    // Keep link text, strip URL: [text](url) → text
    text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')

    text = text.trim()
    const words = text ? text.split(/\s+/).length : 0
    const chars = text.length
    set({ wordCount: words, charCount: chars })
  },

  setLineNumbers: (current, total): void => set({ currentLine: current, totalLines: total }),

  bumpSelectionKey: (): void =>
    set((state) => ({ editorSelectionKey: state.editorSelectionKey + 1 })),

  toggleSidebar: (): void => set((state) => ({ isSidebarVisible: !state.isSidebarVisible })),

  setIsDarkMode: (isDark): void => {
    localStorage.setItem('darkMode', String(isDark))
    set({ isDarkMode: isDark })
  },

  toggleMetadata: (): void => set((state) => ({ isMetadataVisible: !state.isMetadataVisible })),

  setFindVisible: (visible): void => set({ isFindVisible: visible }),
  setFindQuery: (query): void => set({ findQuery: query }),
  setReplaceText: (text): void => set({ replaceText: text }),
  setReplaceVisible: (visible): void => set({ isReplaceVisible: visible }),
  setCaseSensitive: (sensitive): void => set({ caseSensitive: sensitive }),
  closeFind: (): void =>
    set({
      isFindVisible: false,
      isReplaceVisible: false,
      findQuery: '',
      replaceText: ''
    }),

  openGlobalSearch: (targetPath): void => {
    const state = get()
    set({
      isGlobalSearchOpen: true,
      previousSidebarVisible: state.isSidebarVisible,
      isSidebarVisible: false,
      globalSearchTargetPath: targetPath ?? (state.globalSearchTargetPath || state.rootPath),
      globalSearchQuery: '',
      globalSearchResults: [],
      globalSearchTotalMatches: 0
    })
  },

  closeGlobalSearch: (): void => {
    const state = get()
    set({
      isGlobalSearchOpen: false,
      isSidebarVisible: state.previousSidebarVisible,
      globalSearchQuery: '',
      globalSearchResults: [],
      isSearching: false,
      globalSearchTotalMatches: 0,
      pendingGlobalJump: null
    })
  },

  closeGlobalSearchAndShowSidebar: (): void =>
    set({
      isGlobalSearchOpen: false,
      isSidebarVisible: true,
      globalSearchQuery: '',
      globalSearchResults: [],
      isSearching: false,
      globalSearchTotalMatches: 0,
      pendingGlobalJump: null
    }),

  toggleGlobalSearch: (): void => {
    const state = get()
    if (state.isGlobalSearchOpen) {
      // Restore sidebar to previous state
      set({
        isGlobalSearchOpen: false,
        isSidebarVisible: state.previousSidebarVisible,
        globalSearchQuery: '',
        globalSearchResults: [],
        isSearching: false,
        globalSearchTotalMatches: 0,
        pendingGlobalJump: null
      })
    } else {
      set({
        isGlobalSearchOpen: true,
        previousSidebarVisible: state.isSidebarVisible,
        isSidebarVisible: false,
        globalSearchTargetPath: state.globalSearchTargetPath || state.rootPath,
        globalSearchQuery: '',
        globalSearchResults: [],
        globalSearchTotalMatches: 0
      })
    }
  },

  setGlobalSearchQuery: (query): void => set({ globalSearchQuery: query }),

  setGlobalSearchResults: (results, totalMatches): void =>
    set({ globalSearchResults: results, globalSearchTotalMatches: totalMatches }),

  setIsSearching: (searching): void => set({ isSearching: searching }),

  setGlobalSearchTargetPath: (path): void => set({ globalSearchTargetPath: path }),

  setGlobalSearchCaseSensitive: (sensitive): void => set({ globalSearchCaseSensitive: sensitive }),

  setPendingGlobalJump: (jump): void => set({ pendingGlobalJump: jump }),

  clearPendingGlobalJump: (): void => set({ pendingGlobalJump: null }),

  removeRecentFile: (path): void => {
    const state = get()
    const updated = state.recentFiles.filter((f) => f.path !== path)
    try {
      localStorage.setItem('recentFiles', JSON.stringify(updated))
    } catch {
      // ignore storage errors
    }
    set({ recentFiles: updated })
  },

  // Computed
  hasUnsavedChanges: (): boolean => {
    const state = get()
    return state.content !== state.originalContent
  }
}))
