import { useState, useCallback, useRef, useEffect } from 'react'
import { X, Search, CaseSensitive, Folder, ChevronRight, ChevronDown, Loader } from 'lucide-react'
import { useDocumentStore } from '../../store/useDocumentStore'
import type { FileSearchResult } from '../../../../shared/types'
import { SearchFolderModal } from '../modals/SearchFolderModal'
import { markWrite } from '../../utils/writeTracker'
import './GlobalSearch.css'

type SearchMode = 'notes' | 'tags'

// ─── Tag search result components ──────────────────────────────────────────

function TagChip({
  tag,
  matchStart,
  matchEnd
}: {
  tag: string
  matchStart: number
  matchEnd: number
}): React.JSX.Element {
  const before = tag.slice(0, matchStart)
  const highlighted = tag.slice(matchStart, matchEnd)
  const after = tag.slice(matchEnd)
  return (
    <span className="gs-tag-chip">
      {before && <span>{before}</span>}
      <mark className="gs-highlight">{highlighted}</mark>
      {after && <span>{after}</span>}
    </span>
  )
}

function TagFileResult({
  result,
  onClick
}: {
  result: FileSearchResult
  onClick: (filePath: string, fileName: string) => void
}): React.JSX.Element {
  const parts = result.relativePath.split('/')
  const dirPart = parts.length > 1 ? parts.slice(0, -1).join('/') : ''
  const displayName = result.fileName.endsWith('.md')
    ? result.fileName.slice(0, -3)
    : result.fileName

  return (
    <div className="gs-tag-file-item" onClick={() => onClick(result.filePath, result.fileName)}>
      <div className="gs-tag-file-header">
        <span className="gs-file-name">{displayName}</span>
        {dirPart && <span className="gs-file-dir">{dirPart}</span>}
      </div>
      <div className="gs-tag-chips">
        {result.matches.map((m, i) => (
          <TagChip key={i} tag={m.lineContent} matchStart={m.matchStart} matchEnd={m.matchEnd} />
        ))}
      </div>
    </div>
  )
}

// ─── Notes search result components ────────────────────────────────────────

function MatchItem({
  lineContent,
  matchStart,
  matchEnd,
  onClick
}: {
  lineContent: string
  matchStart: number
  matchEnd: number
  onClick: () => void
}): React.JSX.Element {
  const before = lineContent.slice(0, matchStart)
  const highlighted = lineContent.slice(matchStart, matchEnd)
  const after = lineContent.slice(matchEnd)

  return (
    <div className="gs-match-item" onClick={onClick}>
      <span className="gs-match-content">
        <span>{before}</span>
        <mark className="gs-highlight">{highlighted}</mark>
        <span>{after}</span>
      </span>
    </div>
  )
}

function FileResultGroup({
  result,
  onMatchClick
}: {
  result: FileSearchResult
  onMatchClick: (filePath: string, fileName: string, matchIndex: number) => void
}): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false)

  const parts = result.relativePath.split('/')
  const dirPart = parts.length > 1 ? parts.slice(0, -1).join('/') : ''
  const displayName = result.fileName.endsWith('.md')
    ? result.fileName.slice(0, -3)
    : result.fileName

  return (
    <div className="gs-file-group">
      <div className="gs-file-header" onClick={() => setCollapsed((c) => !c)}>
        <span className="gs-chevron">
          {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
        </span>
        <span className="gs-file-name">{displayName}</span>
        {dirPart && <span className="gs-file-dir">{dirPart}</span>}
        <span className="gs-match-badge">{result.matches.length}</span>
      </div>
      {!collapsed && (
        <div className="gs-match-list">
          {result.matches.map((m, i) => (
            <MatchItem
              key={i}
              lineContent={m.lineContent}
              matchStart={m.matchStart}
              matchEnd={m.matchEnd}
              onClick={() => onMatchClick(result.filePath, result.fileName, i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

export function GlobalSearch(): React.JSX.Element {
  const {
    closeGlobalSearch,
    globalSearchQuery,
    setGlobalSearchQuery,
    globalSearchResults,
    globalSearchTotalMatches,
    isSearching,
    setIsSearching,
    setGlobalSearchResults,
    globalSearchCaseSensitive,
    setGlobalSearchCaseSensitive,
    globalSearchTargetPath,
    setGlobalSearchTargetPath,
    rootPath,
    currentFilePath,
    content,
    originalContent,
    setCurrentFile,
    setContent,
    setOriginalContent,
    setIsLoadingContent,
    setPendingGlobalJump,
    clearPendingGlobalJump
  } = useDocumentStore()

  const inputRef = useRef<HTMLInputElement>(null)
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [files, setFiles] = useState<import('../../../../shared/types').FileEntry[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [mode, setMode] = useState<SearchMode>('notes')

  // Focus input when opened
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  // Load file tree for folder modal
  useEffect(() => {
    window.api.file.list().then((result) => {
      if (result.success && result.files) {
        setFiles(result.files)
      }
    })
  }, [])

  // Reset hasSearched when query changes
  useEffect(() => {
    setHasSearched(false)
  }, [globalSearchQuery])

  // Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        closeGlobalSearch()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [closeGlobalSearch])

  // Core search — mode passed explicitly so there's never a stale-closure issue
  const doSearch = useCallback(
    async (searchMode: SearchMode): Promise<void> => {
      if (!globalSearchQuery.trim()) return

      const targetPath = globalSearchTargetPath || rootPath
      setIsSearching(true)
      try {
        const result = await window.api.search.files(
          globalSearchQuery,
          targetPath,
          globalSearchCaseSensitive,
          searchMode
        )
        if (result.success && result.results !== undefined) {
          setGlobalSearchResults(result.results, result.totalMatches ?? 0)
        }
      } finally {
        setIsSearching(false)
        setHasSearched(true)
      }
    },
    [
      globalSearchQuery,
      globalSearchTargetPath,
      rootPath,
      globalSearchCaseSensitive,
      setIsSearching,
      setGlobalSearchResults
    ]
  )

  // Called by Enter key / Search button — uses current mode state
  const handleSearch = useCallback(async (): Promise<void> => {
    await doSearch(mode)
  }, [doSearch, mode])

  // Called by mode pill buttons — switches mode AND immediately re-searches
  const handleModeChange = useCallback(
    (newMode: SearchMode): void => {
      setMode(newMode)
      if (globalSearchQuery.trim()) {
        doSearch(newMode)
      } else {
        setHasSearched(false)
        setGlobalSearchResults([], 0)
      }
    },
    [globalSearchQuery, doSearch, setGlobalSearchResults]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // Notes mode: open file and scroll to the clicked match
  const handleMatchClick = useCallback(
    async (filePath: string, fileName: string, matchIndex: number): Promise<void> => {
      if (currentFilePath && content !== originalContent) {
        try {
          markWrite()
          await window.api.file.write(currentFilePath, content)
        } catch (error) {
          console.error('Failed to save before switching files:', error)
        }
      }

      setPendingGlobalJump({
        query: globalSearchQuery,
        matchIndex,
        caseSensitive: globalSearchCaseSensitive
      })

      setIsLoadingContent(true)
      try {
        const result = await window.api.file.read(filePath)
        if (result.success && result.content !== undefined) {
          setCurrentFile(filePath, fileName)
          setContent(result.content)
          setOriginalContent(result.content)
        } else {
          clearPendingGlobalJump()
        }
      } catch {
        clearPendingGlobalJump()
      } finally {
        setIsLoadingContent(false)
      }
    },
    [
      currentFilePath,
      content,
      originalContent,
      globalSearchQuery,
      globalSearchCaseSensitive,
      setCurrentFile,
      setContent,
      setOriginalContent,
      setIsLoadingContent,
      setPendingGlobalJump,
      clearPendingGlobalJump
    ]
  )

  // Tags mode: just open the file (no specific scroll target)
  const handleTagFileClick = useCallback(
    async (filePath: string, fileName: string): Promise<void> => {
      if (currentFilePath && content !== originalContent) {
        try {
          markWrite()
          await window.api.file.write(currentFilePath, content)
        } catch (error) {
          console.error('Failed to save before switching files:', error)
        }
      }

      setIsLoadingContent(true)
      try {
        const result = await window.api.file.read(filePath)
        if (result.success && result.content !== undefined) {
          setCurrentFile(filePath, fileName)
          setContent(result.content)
          setOriginalContent(result.content)
        }
      } catch {
        // ignore
      } finally {
        setIsLoadingContent(false)
      }
    },
    [
      currentFilePath,
      content,
      originalContent,
      setCurrentFile,
      setContent,
      setOriginalContent,
      setIsLoadingContent
    ]
  )

  const targetName = globalSearchTargetPath
    ? globalSearchTargetPath === rootPath
      ? 'MarkNotes'
      : globalSearchTargetPath.split('/').pop() || 'MarkNotes'
    : 'MarkNotes'

  const hasResults = globalSearchResults.length > 0
  const exceedsLimit = globalSearchTotalMatches >= 500

  return (
    <div className="global-search">
      {/* Header */}
      <div className="gs-header">
        <span className="gs-title">SEARCH</span>
        <button className="gs-close-btn" onClick={closeGlobalSearch} aria-label="Close search">
          <X size={14} />
        </button>
      </div>

      {/* Controls */}
      <div className="gs-controls">
        <button
          className="gs-folder-btn"
          onClick={() => setFolderModalOpen(true)}
          title="Choose search folder"
        >
          <Folder size={12} />
          <span className="gs-folder-name">{targetName}</span>
        </button>

        <div className="gs-input-row">
          <div className="gs-input-wrap">
            <input
              ref={inputRef}
              type="text"
              className="gs-input"
              placeholder="Search in files"
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button
            className={`gs-case-btn ${globalSearchCaseSensitive ? 'active' : ''}`}
            onClick={() => setGlobalSearchCaseSensitive(!globalSearchCaseSensitive)}
            title="Match Case"
          >
            <CaseSensitive size={14} />
          </button>
          <button
            className="gs-search-btn"
            onClick={handleSearch}
            disabled={!globalSearchQuery.trim() || isSearching}
            title="Search (Enter)"
          >
            {isSearching ? <Loader size={14} className="gs-spinner" /> : <Search size={14} />}
          </button>
        </div>

        {/* Notes / Tags mode toggle */}
        <div className="gs-mode-toggle">
          <button
            className={`gs-mode-btn${mode === 'notes' ? ' active' : ''}`}
            onClick={() => handleModeChange('notes')}
          >
            Notes
          </button>
          <button
            className={`gs-mode-btn${mode === 'tags' ? ' active' : ''}`}
            onClick={() => handleModeChange('tags')}
          >
            Tags
          </button>
        </div>
      </div>

      {/* Results summary */}
      {hasResults && (
        <div className="gs-summary">
          {mode === 'tags' ? (
            <>
              {globalSearchResults.length} file{globalSearchResults.length !== 1 ? 's' : ''}
            </>
          ) : (
            <>
              {globalSearchResults.length} file{globalSearchResults.length !== 1 ? 's' : ''},{' '}
              {globalSearchTotalMatches} match{globalSearchTotalMatches !== 1 ? 'es' : ''}
              {exceedsLimit && ' (limit reached)'}
            </>
          )}
        </div>
      )}

      {/* Results */}
      <div className="gs-results">
        {globalSearchResults.map((result) =>
          mode === 'tags' ? (
            <TagFileResult
              key={result.filePath}
              result={result}
              onClick={handleTagFileClick}
            />
          ) : (
            <FileResultGroup
              key={result.filePath}
              result={result}
              onMatchClick={handleMatchClick}
            />
          )
        )}
        {!isSearching && globalSearchQuery && !hasSearched && (
          <div className="gs-empty">Press Enter to search</div>
        )}
        {!isSearching && hasSearched && globalSearchQuery && globalSearchResults.length === 0 && (
          <div className="gs-empty">No results found</div>
        )}
      </div>

      {folderModalOpen && (
        <SearchFolderModal
          files={files}
          rootPath={rootPath}
          currentTargetPath={globalSearchTargetPath || rootPath}
          onSelect={(selectedPath) => {
            setGlobalSearchTargetPath(selectedPath)
            setFolderModalOpen(false)
          }}
          onClose={() => setFolderModalOpen(false)}
        />
      )}
    </div>
  )
}
