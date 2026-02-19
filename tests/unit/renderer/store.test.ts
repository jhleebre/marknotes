import { describe, it, expect, beforeEach } from 'vitest'
import { useDocumentStore } from '../../../src/renderer/src/store/useDocumentStore'

// 각 테스트 전에 store 초기 상태로 리셋
beforeEach(() => {
  useDocumentStore.setState({
    files: [],
    rootPath: '',
    isLoadingFiles: false,
    currentFilePath: null,
    currentFileName: null,
    content: '',
    originalContent: '',
    isLoadingContent: false,
    mode: 'wysiwyg',
    saveStatus: 'saved',
    wordCount: 0,
    charCount: 0,
    currentLine: 1,
    totalLines: 1,
    editorSelectionKey: 0,
    isSidebarVisible: true,
    previousSidebarVisible: true,
    isDarkMode: false,
    isMetadataVisible: false,
    recentFiles: [],
    isFindVisible: false,
    findQuery: '',
    replaceText: '',
    isReplaceVisible: false,
    caseSensitive: false,
    isGlobalSearchOpen: false,
    globalSearchTargetPath: '',
    globalSearchQuery: '',
    globalSearchResults: [],
    globalSearchTotalMatches: 0,
    isSearching: false,
    globalSearchCaseSensitive: false,
    pendingGlobalJump: null
  })
})

// ─────────────────────────────────────────────
describe('setContent — 변경 감지', () => {
  it('originalContent와 다르면 saveStatus가 unsaved가 된다', () => {
    const store = useDocumentStore.getState()
    store.setOriginalContent('# Original')
    store.setContent('# Modified')
    expect(useDocumentStore.getState().saveStatus).toBe('unsaved')
  })

  it('originalContent와 같으면 saveStatus가 saved가 된다', () => {
    const store = useDocumentStore.getState()
    store.setOriginalContent('# Same Content')
    store.setContent('# Same Content')
    expect(useDocumentStore.getState().saveStatus).toBe('saved')
  })

  it('빈 문자열로 설정해도 originalContent와 비교한다', () => {
    const store = useDocumentStore.getState()
    store.setOriginalContent('not empty')
    store.setContent('')
    expect(useDocumentStore.getState().saveStatus).toBe('unsaved')
  })
})

// ─────────────────────────────────────────────
describe('hasUnsavedChanges', () => {
  it('content와 originalContent가 같으면 false를 반환한다', () => {
    useDocumentStore.setState({ content: 'abc', originalContent: 'abc' })
    expect(useDocumentStore.getState().hasUnsavedChanges()).toBe(false)
  })

  it('content와 originalContent가 다르면 true를 반환한다', () => {
    useDocumentStore.setState({ content: 'modified', originalContent: 'original' })
    expect(useDocumentStore.getState().hasUnsavedChanges()).toBe(true)
  })
})

// ─────────────────────────────────────────────
describe('setCurrentFile', () => {
  it('파일 경로와 이름을 설정하고 saveStatus를 saved로 초기화한다', () => {
    const store = useDocumentStore.getState()
    store.setSaveStatus('unsaved') // 먼저 unsaved 상태로
    store.setCurrentFile('/root/note.md', 'note')
    const state = useDocumentStore.getState()
    expect(state.currentFilePath).toBe('/root/note.md')
    expect(state.currentFileName).toBe('note')
    expect(state.saveStatus).toBe('saved')
  })

  it('null로 설정하면 파일을 닫는다', () => {
    const store = useDocumentStore.getState()
    store.setCurrentFile(null, null)
    const state = useDocumentStore.getState()
    expect(state.currentFilePath).toBeNull()
    expect(state.currentFileName).toBeNull()
  })

  it('파일 열기 시 recentFiles에 추가된다', () => {
    useDocumentStore.getState().setCurrentFile('/root/note.md', 'note')
    const files = useDocumentStore.getState().recentFiles
    expect(files[0].path).toBe('/root/note.md')
    expect(files[0].name).toBe('note')
  })

  it('recentFiles는 최대 5개를 유지한다', () => {
    const store = useDocumentStore.getState()
    for (let i = 0; i < 7; i++) {
      store.setCurrentFile(`/root/note${i}.md`, `note${i}`)
    }
    expect(useDocumentStore.getState().recentFiles.length).toBeLessThanOrEqual(5)
  })

  it('같은 파일을 다시 열면 recentFiles 맨 앞으로 이동한다', () => {
    const store = useDocumentStore.getState()
    store.setCurrentFile('/root/a.md', 'a')
    store.setCurrentFile('/root/b.md', 'b')
    store.setCurrentFile('/root/a.md', 'a') // 다시 a 열기
    const files = useDocumentStore.getState().recentFiles
    expect(files[0].path).toBe('/root/a.md')
    // 중복 없이 하나만 존재해야 함
    expect(files.filter((f) => f.path === '/root/a.md').length).toBe(1)
  })
})

// ─────────────────────────────────────────────
describe('toggleSidebar', () => {
  it('사이드바를 숨긴다', () => {
    useDocumentStore.setState({ isSidebarVisible: true })
    useDocumentStore.getState().toggleSidebar()
    expect(useDocumentStore.getState().isSidebarVisible).toBe(false)
  })

  it('사이드바를 다시 표시한다', () => {
    useDocumentStore.setState({ isSidebarVisible: false })
    useDocumentStore.getState().toggleSidebar()
    expect(useDocumentStore.getState().isSidebarVisible).toBe(true)
  })
})

// ─────────────────────────────────────────────
describe('모드 전환', () => {
  it('wysiwyg에서 split 모드로 전환한다', () => {
    useDocumentStore.getState().setMode('split')
    expect(useDocumentStore.getState().mode).toBe('split')
  })

  it('split에서 wysiwyg 모드로 전환한다', () => {
    useDocumentStore.setState({ mode: 'split' })
    useDocumentStore.getState().setMode('wysiwyg')
    expect(useDocumentStore.getState().mode).toBe('wysiwyg')
  })
})

// ─────────────────────────────────────────────
describe('찾기/바꾸기 상태', () => {
  it('setFindVisible로 찾기 바를 표시한다', () => {
    useDocumentStore.getState().setFindVisible(true)
    expect(useDocumentStore.getState().isFindVisible).toBe(true)
  })

  it('closeFind로 찾기+바꾸기를 닫고 쿼리를 초기화한다', () => {
    useDocumentStore.setState({
      isFindVisible: true,
      isReplaceVisible: true,
      findQuery: 'search',
      replaceText: 'replace'
    })
    useDocumentStore.getState().closeFind()
    const state = useDocumentStore.getState()
    expect(state.isFindVisible).toBe(false)
    expect(state.isReplaceVisible).toBe(false)
    expect(state.findQuery).toBe('')
    expect(state.replaceText).toBe('')
  })

  it('caseSensitive를 토글한다', () => {
    useDocumentStore.getState().setCaseSensitive(true)
    expect(useDocumentStore.getState().caseSensitive).toBe(true)
    useDocumentStore.getState().setCaseSensitive(false)
    expect(useDocumentStore.getState().caseSensitive).toBe(false)
  })
})

// ─────────────────────────────────────────────
describe('전역 검색 상태', () => {
  it('openGlobalSearch가 사이드바를 숨기고 검색을 연다', () => {
    useDocumentStore.setState({ isSidebarVisible: true, rootPath: '/root' })
    useDocumentStore.getState().openGlobalSearch()
    const state = useDocumentStore.getState()
    expect(state.isGlobalSearchOpen).toBe(true)
    expect(state.isSidebarVisible).toBe(false)
    expect(state.previousSidebarVisible).toBe(true)
  })

  it('openGlobalSearch에 targetPath를 전달하면 globalSearchTargetPath가 설정된다', () => {
    useDocumentStore.getState().openGlobalSearch('/root/folder')
    expect(useDocumentStore.getState().globalSearchTargetPath).toBe('/root/folder')
  })

  it('closeGlobalSearch가 사이드바를 이전 상태로 복원한다', () => {
    useDocumentStore.setState({
      isGlobalSearchOpen: true,
      isSidebarVisible: false,
      previousSidebarVisible: true
    })
    useDocumentStore.getState().closeGlobalSearch()
    const state = useDocumentStore.getState()
    expect(state.isGlobalSearchOpen).toBe(false)
    expect(state.isSidebarVisible).toBe(true) // 이전 상태 복원
  })

  it('closeGlobalSearch가 검색 결과를 초기화한다', () => {
    useDocumentStore.setState({
      globalSearchResults: [{ filePath: '/a.md', relativePath: 'a.md', fileName: 'a.md', matches: [] }],
      globalSearchTotalMatches: 5,
      isSearching: true
    })
    useDocumentStore.getState().closeGlobalSearch()
    const state = useDocumentStore.getState()
    expect(state.globalSearchResults).toHaveLength(0)
    expect(state.globalSearchTotalMatches).toBe(0)
    expect(state.isSearching).toBe(false)
  })

  it('toggleGlobalSearch가 열기/닫기를 전환한다', () => {
    useDocumentStore.setState({ isGlobalSearchOpen: false, rootPath: '/root' })
    useDocumentStore.getState().toggleGlobalSearch()
    expect(useDocumentStore.getState().isGlobalSearchOpen).toBe(true)

    useDocumentStore.getState().toggleGlobalSearch()
    expect(useDocumentStore.getState().isGlobalSearchOpen).toBe(false)
  })

  it('closeGlobalSearchAndShowSidebar가 사이드바를 강제로 표시한다', () => {
    useDocumentStore.setState({ previousSidebarVisible: false, isSidebarVisible: false })
    useDocumentStore.getState().closeGlobalSearchAndShowSidebar()
    expect(useDocumentStore.getState().isSidebarVisible).toBe(true) // 이전 상태 무관하게 true
  })
})

// ─────────────────────────────────────────────
describe('updateCounts — 워드/문자 카운트', () => {
  it('단순 텍스트의 단어 수를 계산한다', () => {
    useDocumentStore.getState().updateCounts('Hello world foo')
    expect(useDocumentStore.getState().wordCount).toBe(3)
  })

  it('이미지 마크다운을 카운트에서 제외한다', () => {
    useDocumentStore.getState().updateCounts('Hello ![alt](img.png) world')
    expect(useDocumentStore.getState().wordCount).toBe(2)
  })

  it('테이블 구분자 행(| --- |)을 제외한다', () => {
    const tableContent = '| Col1 | Col2 |\n| --- | --- |\n| a | b |'
    useDocumentStore.getState().updateCounts(tableContent)
    // 구분자 행이 제외되어야 함
    const wc = useDocumentStore.getState().wordCount
    expect(wc).toBeGreaterThan(0)
    // 실제 단어: Col1, Col2, a, b → 4개 (파이프 처리 후 공백 분리)
    expect(wc).toBeLessThanOrEqual(4)
  })

  it('HTML 주석을 카운트에서 제외한다', () => {
    useDocumentStore.getState().updateCounts('Hello <!-- comment --> world')
    expect(useDocumentStore.getState().wordCount).toBe(2)
  })

  it('[text](url) 링크에서 텍스트만 카운트에 포함한다', () => {
    useDocumentStore.getState().updateCounts('[Click here](https://example.com)')
    expect(useDocumentStore.getState().wordCount).toBe(2) // 'Click', 'here'
  })

  it('빈 문자열이면 wordCount가 0이다', () => {
    useDocumentStore.getState().updateCounts('')
    expect(useDocumentStore.getState().wordCount).toBe(0)
  })
})

// ─────────────────────────────────────────────
describe('pendingGlobalJump', () => {
  it('setPendingGlobalJump로 점프 정보를 설정한다', () => {
    const jump = { query: 'test', matchIndex: 2, caseSensitive: false }
    useDocumentStore.getState().setPendingGlobalJump(jump)
    expect(useDocumentStore.getState().pendingGlobalJump).toEqual(jump)
  })

  it('clearPendingGlobalJump로 초기화한다', () => {
    useDocumentStore.setState({ pendingGlobalJump: { query: 'x', matchIndex: 0, caseSensitive: false } })
    useDocumentStore.getState().clearPendingGlobalJump()
    expect(useDocumentStore.getState().pendingGlobalJump).toBeNull()
  })
})

// ─────────────────────────────────────────────
describe('removeRecentFile', () => {
  it('특정 경로의 파일을 recentFiles에서 제거한다', () => {
    useDocumentStore.setState({
      recentFiles: [
        { path: '/root/a.md', name: 'a' },
        { path: '/root/b.md', name: 'b' }
      ]
    })
    useDocumentStore.getState().removeRecentFile('/root/a.md')
    const files = useDocumentStore.getState().recentFiles
    expect(files.length).toBe(1)
    expect(files[0].path).toBe('/root/b.md')
  })
})

// ─────────────────────────────────────────────
describe('bumpSelectionKey', () => {
  it('editorSelectionKey를 1씩 증가시킨다', () => {
    useDocumentStore.setState({ editorSelectionKey: 0 })
    useDocumentStore.getState().bumpSelectionKey()
    expect(useDocumentStore.getState().editorSelectionKey).toBe(1)
    useDocumentStore.getState().bumpSelectionKey()
    expect(useDocumentStore.getState().editorSelectionKey).toBe(2)
  })
})

// ─────────────────────────────────────────────
describe('setSaveStatus', () => {
  it('저장 상태를 saving으로 설정한다', () => {
    useDocumentStore.getState().setSaveStatus('saving')
    expect(useDocumentStore.getState().saveStatus).toBe('saving')
  })

  it('저장 상태를 error로 설정한다', () => {
    useDocumentStore.getState().setSaveStatus('error')
    expect(useDocumentStore.getState().saveStatus).toBe('error')
  })
})
