import { useEffect, useState, useCallback } from 'react'
import { Editor } from '@tiptap/react'
import { useDocumentStore } from '../../store/useDocumentStore'
import { SearchHighlightPluginKey } from '../Editor/extensions/SearchHighlight'

interface SearchMatch {
  from: number
  to: number
}

interface UseSearchResult {
  currentMatch: number
  totalMatches: number
  findNext: () => void
  findPrevious: () => void
  replace: () => void
  replaceAll: () => void
}

export function useSearch(editor: Editor | null, onScrollToMatch?: () => void): UseSearchResult {
  const { searchQuery, replaceText, caseSensitive, isSearchVisible } = useDocumentStore()

  const [matches, setMatches] = useState<SearchMatch[]>([])
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)

  // Update decorations in the editor
  const updateDecorations = useCallback(
    (searchResults: SearchMatch[], currentIndex: number) => {
      if (!editor) return

      editor.view.dispatch(
        editor.state.tr.setMeta(SearchHighlightPluginKey, {
          searchResults,
          currentIndex
        })
      )
    },
    [editor]
  )

  // Scroll to a specific match
  const scrollToMatch = useCallback(
    (match: SearchMatch, shouldRestoreFocus = true): void => {
      if (!editor) return

      if (shouldRestoreFocus) {
        // When navigating (Enter, buttons), focus editor then restore
        editor
          .chain()
          .focus()
          .setTextSelection({
            from: match.from,
            to: match.to
          })
          .scrollIntoView()
          .run()

        // Return focus to search input after a brief delay
        if (onScrollToMatch) {
          setTimeout(onScrollToMatch, 50)
        }
      } else {
        // When typing in search input, only scroll without focus/selection change
        // (Changing focus breaks Korean/CJK IME composition)
        const coords = editor.view.coordsAtPos(match.from)
        const editorDom = editor.view.dom
        const scrollParent = editorDom.closest('.wysiwyg-editor') || editorDom.parentElement
        if (scrollParent) {
          const rect = scrollParent.getBoundingClientRect()
          if (coords.top < rect.top || coords.top > rect.bottom) {
            scrollParent.scrollTop += coords.top - rect.top - rect.height / 3
          }
        }
      }
    },
    [editor, onScrollToMatch]
  )

  // Find all matches in the editor (returns found matches for caller to use)
  const findMatches = useCallback((): SearchMatch[] => {
    if (!editor || !searchQuery) {
      setMatches([])
      setCurrentMatchIndex(0)
      return []
    }

    const foundMatches: SearchMatch[] = []

    // Build regex pattern
    const pattern = searchQuery
    const flags = caseSensitive ? 'g' : 'gi'
    let regex: RegExp

    try {
      regex = new RegExp(pattern, flags)
    } catch {
      // Invalid regex, no matches
      setMatches([])
      setCurrentMatchIndex(0)
      return []
    }

    // Search through the document
    const { doc } = editor.state
    doc.descendants((node, pos) => {
      if (node.isText && node.text) {
        const text = node.text
        regex.lastIndex = 0 // Reset regex

        let match: RegExpExecArray | null
        while ((match = regex.exec(text)) !== null) {
          const from = pos + match.index
          const to = from + match[0].length
          foundMatches.push({ from, to })

          // Prevent infinite loop for zero-length matches
          if (match.index === regex.lastIndex) {
            regex.lastIndex++
          }
        }
      }
      return true
    })

    setMatches(foundMatches)
    const newIndex = foundMatches.length > 0 ? 1 : 0
    setCurrentMatchIndex(newIndex)

    // Update decorations
    updateDecorations(foundMatches, newIndex)

    return foundMatches
  }, [editor, searchQuery, caseSensitive, updateDecorations])

  // Re-search when query or options change — scroll to first match
  useEffect(() => {
    if (isSearchVisible) {
      const foundMatches = findMatches()
      if (foundMatches.length > 0) {
        scrollToMatch(foundMatches[0], false)
      }
    } else {
      setMatches([])
      setCurrentMatchIndex(0)
      // Clear decorations when search is closed
      updateDecorations([], 0)
    }
  }, [findMatches, isSearchVisible, updateDecorations, scrollToMatch])

  // Re-search when editor content changes (e.g., typing, undo/redo) — no scroll
  useEffect(() => {
    if (!editor || !isSearchVisible || !searchQuery) return

    let timeoutId: NodeJS.Timeout

    const handleUpdate = (): void => {
      // Debounce to avoid too frequent updates
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        findMatches()
      }, 100)
    }

    editor.on('update', handleUpdate)

    return () => {
      editor.off('update', handleUpdate)
      clearTimeout(timeoutId)
    }
  }, [editor, isSearchVisible, searchQuery, findMatches])

  // Navigate to next match
  const findNext = useCallback(() => {
    if (matches.length === 0) return

    const nextIndex = currentMatchIndex >= matches.length ? 1 : currentMatchIndex + 1
    setCurrentMatchIndex(nextIndex)
    updateDecorations(matches, nextIndex)
    scrollToMatch(matches[nextIndex - 1], true)
  }, [matches, currentMatchIndex, updateDecorations, scrollToMatch])

  // Navigate to previous match
  const findPrevious = useCallback(() => {
    if (matches.length === 0) return

    const prevIndex = currentMatchIndex <= 1 ? matches.length : currentMatchIndex - 1
    setCurrentMatchIndex(prevIndex)
    updateDecorations(matches, prevIndex)
    scrollToMatch(matches[prevIndex - 1], true)
  }, [matches, currentMatchIndex, updateDecorations, scrollToMatch])

  // Replace current match
  const replace = useCallback(() => {
    if (!editor || matches.length === 0 || currentMatchIndex === 0) return

    const match = matches[currentMatchIndex - 1]
    const savedIndex = currentMatchIndex // Save current index to restore after re-search

    // Replace the text
    editor.commands.setTextSelection({
      from: match.from,
      to: match.to
    })
    editor.commands.insertContent(replaceText)

    // Re-search to update matches and move to next match (same index)
    setTimeout(() => {
      if (!editor || !searchQuery) {
        setMatches([])
        setCurrentMatchIndex(0)
        return
      }

      const foundMatches: SearchMatch[] = []
      const pattern = searchQuery
      const flags = caseSensitive ? 'g' : 'gi'
      let regex: RegExp

      try {
        regex = new RegExp(pattern, flags)
      } catch {
        setMatches([])
        setCurrentMatchIndex(0)
        updateDecorations([], 0)
        return
      }

      const { doc } = editor.state
      doc.descendants((node, pos) => {
        if (node.isText && node.text) {
          const text = node.text
          regex.lastIndex = 0
          let match: RegExpExecArray | null
          while ((match = regex.exec(text)) !== null) {
            const from = pos + match.index
            const to = from + match[0].length
            foundMatches.push({ from, to })
            if (match.index === regex.lastIndex) {
              regex.lastIndex++
            }
          }
        }
        return true
      })

      setMatches(foundMatches)

      // Keep the same index (which now points to the next match after replacement)
      const newIndex =
        foundMatches.length > 0
          ? savedIndex <= foundMatches.length
            ? savedIndex
            : foundMatches.length
          : 0

      setCurrentMatchIndex(newIndex)
      updateDecorations(foundMatches, newIndex)

      if (foundMatches.length > 0 && newIndex > 0) {
        scrollToMatch(foundMatches[newIndex - 1], true)
      }

      // Ensure focus is restored after all operations
      setTimeout(() => {
        onScrollToMatch?.()
      }, 100)
    }, 10)
  }, [
    editor,
    matches,
    currentMatchIndex,
    replaceText,
    searchQuery,
    caseSensitive,
    updateDecorations,
    scrollToMatch,
    onScrollToMatch
  ])

  // Replace all matches
  const replaceAll = useCallback(() => {
    if (!editor || matches.length === 0) return

    // Replace from end to start to maintain positions
    const sortedMatches = [...matches].sort((a, b) => b.from - a.from)

    editor.chain().focus()

    for (const match of sortedMatches) {
      editor
        .chain()
        .setTextSelection({
          from: match.from,
          to: match.to
        })
        .insertContent(replaceText)
        .run()
    }

    // Re-search to update matches (no scroll needed)
    setTimeout(() => findMatches(), 10)
  }, [editor, matches, replaceText, findMatches])

  return {
    currentMatch: currentMatchIndex,
    totalMatches: matches.length,
    findNext,
    findPrevious,
    replace,
    replaceAll
  }
}
