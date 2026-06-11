// Shared logic for jumping to a global-search match inside the editor.
// Used both when the match is in the already-open file and right after a
// different file finishes loading.
import type { Editor as TipTapEditor } from '@tiptap/react'
import { SearchHighlightPluginKey } from './extensions/SearchHighlight'
import type { PendingGlobalJump } from '../../store/useDocumentStore'

export interface MatchRange {
  from: number
  to: number
}

/** Find all literal matches of query in the editor document. Returns null on invalid input. */
export function findQueryMatches(
  editor: TipTapEditor,
  query: string,
  caseSensitive: boolean
): MatchRange[] | null {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const flags = caseSensitive ? 'g' : 'gi'
  let regex: RegExp
  try {
    regex = new RegExp(escaped, flags)
  } catch {
    return null
  }

  const matches: MatchRange[] = []
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      const text = node.text
      regex.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = regex.exec(text)) !== null) {
        matches.push({ from: pos + match.index, to: pos + match.index + match[0].length })
        if (match[0].length === 0) regex.lastIndex++
      }
    }
    return true
  })
  return matches
}

/**
 * Highlight all matches for the pending jump, select/scroll to the target one,
 * then clear the pending jump. `isCancelled` lets callers abort the deferred
 * selection when the effect that scheduled it has been cleaned up.
 */
export function executeGlobalJump(
  editor: TipTapEditor,
  jump: PendingGlobalJump,
  clearPendingGlobalJump: () => void,
  isCancelled: () => boolean = () => false
): void {
  const matches = findQueryMatches(editor, jump.query, jump.caseSensitive)
  if (!matches || matches.length === 0) {
    clearPendingGlobalJump()
    return
  }

  const targetIdx = Math.min(jump.matchIndex, matches.length - 1)
  const targetMatch = matches[targetIdx]

  editor.view.dispatch(
    editor.state.tr.setMeta(SearchHighlightPluginKey, {
      searchResults: matches,
      currentIndex: targetIdx + 1
    })
  )

  requestAnimationFrame(() => {
    if (isCancelled()) return
    editor
      .chain()
      .focus()
      .setTextSelection({ from: targetMatch.from, to: targetMatch.to })
      .scrollIntoView()
      .run()
    clearPendingGlobalJump()
  })
}
