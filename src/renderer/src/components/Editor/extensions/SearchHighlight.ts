import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface SearchResult {
  from: number
  to: number
}

export interface SearchHighlightOptions {
  searchResults: SearchResult[]
  currentIndex: number
}

export const SearchHighlightPluginKey = new PluginKey('searchHighlight')

export const SearchHighlight = Extension.create({
  name: 'searchHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: SearchHighlightPluginKey,
        state: {
          init() {
            return DecorationSet.empty
          },
          apply(tr, oldState) {
            // Get search metadata from transaction
            const meta = tr.getMeta(SearchHighlightPluginKey) as SearchHighlightOptions | undefined

            if (meta) {
              // Create decorations for all search results
              const decorations: Decoration[] = []

              meta.searchResults.forEach((result, index) => {
                const isCurrentMatch = index === meta.currentIndex - 1
                const decoration = Decoration.inline(result.from, result.to, {
                  class: isCurrentMatch ? 'search-result-current' : 'search-result'
                })
                decorations.push(decoration)
              })

              return DecorationSet.create(tr.doc, decorations)
            }

            // Map decorations through document changes
            return oldState.map(tr.mapping, tr.doc)
          }
        },
        props: {
          decorations(state) {
            return this.getState(state)
          }
        }
      })
    ]
  }
})
