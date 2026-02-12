import { create } from 'zustand'
import type { FileEntry } from '../../../shared/types'

export type EditorMode = 'wysiwyg' | 'split'

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

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
  isDarkMode: boolean

  // Search state
  isSearchVisible: boolean
  searchQuery: string
  replaceText: string
  isReplaceVisible: boolean
  caseSensitive: boolean

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

  setSearchVisible: (visible: boolean) => void
  setSearchQuery: (query: string) => void
  setReplaceText: (text: string) => void
  setReplaceVisible: (visible: boolean) => void
  setCaseSensitive: (sensitive: boolean) => void
  closeSearch: () => void

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
  isDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,

  // Search state
  isSearchVisible: false,
  searchQuery: '',
  replaceText: '',
  isReplaceVisible: false,
  caseSensitive: false,

  // Actions
  setFiles: (files): void => set({ files }),
  setRootPath: (path): void => set({ rootPath: path }),
  setIsLoadingFiles: (loading): void => set({ isLoadingFiles: loading }),

  setCurrentFile: (path, name): void =>
    set({
      currentFilePath: path,
      currentFileName: name,
      saveStatus: 'saved'
    }),

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

  setIsDarkMode: (isDark): void => set({ isDarkMode: isDark }),

  setSearchVisible: (visible): void => set({ isSearchVisible: visible }),
  setSearchQuery: (query): void => set({ searchQuery: query }),
  setReplaceText: (text): void => set({ replaceText: text }),
  setReplaceVisible: (visible): void => set({ isReplaceVisible: visible }),
  setCaseSensitive: (sensitive): void => set({ caseSensitive: sensitive }),
  closeSearch: (): void =>
    set({
      isSearchVisible: false,
      isReplaceVisible: false,
      searchQuery: '',
      replaceText: ''
    }),

  // Computed
  hasUnsavedChanges: (): boolean => {
    const state = get()
    return state.content !== state.originalContent
  }
}))
