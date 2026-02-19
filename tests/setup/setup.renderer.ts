import { vi, beforeEach } from 'vitest'

// ── localStorage mock ─────────────────────────────────────────────────
let localStorageStore: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => {
    localStorageStore[key] = value
  },
  removeItem: (key: string) => {
    delete localStorageStore[key]
  },
  clear: () => {
    localStorageStore = {}
  },
  get length() {
    return Object.keys(localStorageStore).length
  },
  key: (index: number) => Object.keys(localStorageStore)[index] ?? null
}

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
})

// ── window.matchMedia mock ────────────────────────────────────────────
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

// ── window.api mock (Electron preload bridge) ─────────────────────────
Object.defineProperty(window, 'api', {
  writable: true,
  value: {
    file: {
      getRootPath: vi.fn(),
      read: vi.fn(),
      write: vi.fn(),
      list: vi.fn(),
      create: vi.fn(),
      createFolder: vi.fn(),
      delete: vi.fn(),
      rename: vi.fn(),
      move: vi.fn(),
      duplicate: vi.fn(),
      stat: vi.fn(),
      exists: vi.fn(),
      watch: vi.fn(),
      unwatch: vi.fn(),
      onChanged: vi.fn(),
      onExternalChange: vi.fn()
    },
    image: {
      upload: vi.fn(),
      embedBase64: vi.fn(),
      resolveAssetPath: vi.fn().mockResolvedValue({ success: false }),
      saveBase64: vi.fn(),
      cleanup: vi.fn()
    },
    export: { pdf: vi.fn() },
    search: { files: vi.fn() },
    shell: {
      openExternal: vi.fn(),
      showInFinder: vi.fn(),
      copyPath: vi.fn()
    },
    theme: {
      update: vi.fn(),
      onChanged: vi.fn()
    },
    menu: {
      onNewFile: vi.fn(),
      onNewFolder: vi.fn(),
      onSave: vi.fn(),
      onExportPdf: vi.fn(),
      onSetMode: vi.fn(),
      onToggleSidebar: vi.fn(),
      onCloseFile: vi.fn(),
      onAbout: vi.fn(),
      onShortcuts: vi.fn(),
      onCleanupImages: vi.fn(),
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onFind: vi.fn(),
      onReplace: vi.fn(),
      onToggleDarkMode: vi.fn(),
      onGlobalSearch: vi.fn()
    }
  }
})

// ── 각 테스트 전 localStorage 초기화 ─────────────────────────────────
beforeEach(() => {
  localStorageMock.clear()
})
