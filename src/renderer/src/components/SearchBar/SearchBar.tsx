import { useEffect, useRef, useCallback, useState } from 'react'
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  CaseSensitive,
  Replace,
  ArrowRight,
  ChevronsRight
} from 'lucide-react'
import type { Editor } from '@tiptap/react'
import { useDocumentStore } from '../../store/useDocumentStore'
import { useSearch } from './useSearch'
import './SearchBar.css'

interface SearchBarProps {
  editor: Editor | null
}

export function SearchBar({ editor }: SearchBarProps): React.JSX.Element | null {
  const {
    isSearchVisible,
    searchQuery,
    replaceText,
    isReplaceVisible,
    caseSensitive,
    setSearchQuery,
    setReplaceText,
    setReplaceVisible,
    setCaseSensitive,
    closeSearch
  } = useDocumentStore()

  const searchInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  // Function to restore focus to appropriate input
  const restoreFocus = useCallback((): void => {
    // If replace is visible, focus replace input; otherwise focus search input
    if (isReplaceVisible && replaceInputRef.current) {
      replaceInputRef.current.focus()
    } else {
      searchInputRef.current?.focus()
    }
  }, [isReplaceVisible])

  // Hook: search functionality with focus restoration
  const { currentMatch, totalMatches, findNext, findPrevious, replace, replaceAll } = useSearch(
    editor,
    restoreFocus
  )

  // Focus editor when search is closed (handles both Esc and Cmd+F toggle)
  const [wasVisible, setWasVisible] = useState(false)
  useEffect(() => {
    if (wasVisible && !isSearchVisible) {
      editor?.commands.focus()
    }
    setWasVisible(isSearchVisible)
  }, [isSearchVisible, editor])

  // Auto-focus search input and fill with selected text when opened
  useEffect(() => {
    if (isSearchVisible && editor && searchInputRef.current) {
      // Get selected text from editor
      const { from, to } = editor.state.selection
      const selectedText = editor.state.doc.textBetween(from, to, ' ')

      // Fill search query with selected text if available
      if (selectedText && selectedText.trim()) {
        setSearchQuery(selectedText.trim())
      }

      // Focus and select input
      searchInputRef.current.focus()
      searchInputRef.current.select()
    }
  }, [isSearchVisible, editor, setSearchQuery])

  if (!isSearchVisible) return null

  const handleClose = (): void => {
    closeSearch()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        findPrevious()
      } else {
        findNext()
      }
    } else if (e.key === 'Escape') {
      handleClose()
    } else if (e.key === 'Tab' && isReplaceVisible) {
      e.preventDefault()
      // Tab or Shift+Tab from Find: go to Replace
      replaceInputRef.current?.focus()
    }
  }

  const handleReplaceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        replaceAll()
      } else {
        replace()
      }
    } else if (e.key === 'Escape') {
      handleClose()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      // Tab or Shift+Tab from Replace: go to Find
      searchInputRef.current?.focus()
    }
  }

  return (
    <div className="search-bar">
      <div className="search-row">
        <div className="search-input-group">
          <Search className="search-icon" size={16} />
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            placeholder="Find"
            value={searchQuery}
            onChange={(e): void => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {searchQuery && (
            <span className="match-count">
              {totalMatches > 0 ? `${currentMatch}/${totalMatches}` : 'No results'}
            </span>
          )}
        </div>

        <div className="search-controls">
          <button
            className="search-button"
            onClick={findPrevious}
            disabled={totalMatches === 0}
            data-tooltip="Previous (Shift+Enter)"
          >
            <ChevronUp size={16} />
          </button>
          <button
            className="search-button"
            onClick={findNext}
            disabled={totalMatches === 0}
            data-tooltip="Next (Enter)"
          >
            <ChevronDown size={16} />
          </button>

          <div className="search-divider" />

          <button
            className={`search-button toggle ${caseSensitive ? 'active' : ''}`}
            onClick={(): void => setCaseSensitive(!caseSensitive)}
            data-tooltip="Match Case"
          >
            <CaseSensitive size={16} />
          </button>

          <div className="search-divider" />

          <button
            className={`search-button toggle ${isReplaceVisible ? 'active' : ''}`}
            onClick={(): void => setReplaceVisible(!isReplaceVisible)}
            data-tooltip="Toggle Replace"
          >
            <Replace size={16} />
          </button>

          <button className="search-button close" onClick={handleClose} data-tooltip="Close (Esc)">
            <X size={16} />
          </button>
        </div>
      </div>

      {isReplaceVisible && (
        <div className="replace-row">
          <div className="search-input-group">
            <Replace className="search-icon" size={16} />
            <input
              ref={replaceInputRef}
              type="text"
              className="search-input"
              placeholder="Replace"
              value={replaceText}
              onChange={(e): void => setReplaceText(e.target.value)}
              onKeyDown={handleReplaceKeyDown}
            />
          </div>

          <div className="replace-controls">
            <button
              className="replace-button"
              onClick={replace}
              disabled={totalMatches === 0}
              data-tooltip="Replace (Enter)"
            >
              <ArrowRight size={16} />
            </button>
            <button
              className="replace-button"
              onClick={replaceAll}
              disabled={totalMatches === 0}
              data-tooltip="Replace All (Shift+Enter)"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
