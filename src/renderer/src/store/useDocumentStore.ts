import { create } from 'zustand'
import type { FileEntry } from '../../../preload/index.d'

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

  // UI state
  isSidebarVisible: boolean
  isDarkMode: boolean

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

  toggleSidebar: () => void
  setIsDarkMode: (isDark: boolean) => void

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

  // UI state
  isSidebarVisible: true,
  isDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,

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
    const text = content.trim()
    const words = text ? text.split(/\s+/).length : 0
    const chars = text.length
    set({ wordCount: words, charCount: chars })
  },

  toggleSidebar: (): void => set((state) => ({ isSidebarVisible: !state.isSidebarVisible })),

  setIsDarkMode: (isDark): void => set({ isDarkMode: isDark }),

  // Computed
  hasUnsavedChanges: (): boolean => {
    const state = get()
    return state.content !== state.originalContent
  }
}))
