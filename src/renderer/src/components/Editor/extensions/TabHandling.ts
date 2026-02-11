import { Extension } from '@tiptap/core'

export const TabHandling = Extension.create({
  name: 'tabHandling',

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        const { state } = this.editor
        const { selection } = state
        const { $from } = selection

        // Check if we're in a list FIRST (higher priority than table navigation)
        const isInList =
          this.editor.isActive('bulletList') ||
          this.editor.isActive('orderedList') ||
          this.editor.isActive('taskList')
        if (isInList) {
          // Try to sink list item (indent)
          if (this.editor.isActive('taskList')) {
            this.editor.commands.sinkListItem('taskItem')
          } else {
            this.editor.commands.sinkListItem('listItem')
          }
          // Always return true to prevent table navigation
          return true
        }

        // Check if we're inside a table
        const isInTable =
          $from.node(-1)?.type.name === 'tableCell' || $from.node(-1)?.type.name === 'tableHeader'
        if (isInTable) {
          // Let table extension handle it (go to next cell)
          return false
        }

        // For regular text, insert tab character
        return this.editor.commands.insertContent('\t')
      },
      'Shift-Tab': () => {
        const { state } = this.editor
        const { selection } = state
        const { $from } = selection

        // Check if we're in a list FIRST (higher priority than table navigation)
        const isInList =
          this.editor.isActive('bulletList') ||
          this.editor.isActive('orderedList') ||
          this.editor.isActive('taskList')
        if (isInList) {
          // Try to lift list item (outdent)
          if (this.editor.isActive('taskList')) {
            this.editor.commands.liftListItem('taskItem')
          } else {
            this.editor.commands.liftListItem('listItem')
          }
          // Always return true to prevent table navigation
          return true
        }

        // Check if we're inside a table
        const isInTable =
          $from.node(-1)?.type.name === 'tableCell' || $from.node(-1)?.type.name === 'tableHeader'
        if (isInTable) {
          // Let table extension handle it (go to previous cell)
          return false
        }

        // For regular text, try to remove leading tab/spaces
        const { $anchor } = selection
        const textBefore = $anchor.parent.textContent.slice(0, $anchor.parentOffset)

        if (textBefore.match(/[\t ]$/)) {
          // Remove one tab or up to 4 spaces before cursor
          const match = textBefore.match(/([\t]| {1,4})$/)
          if (match) {
            const deleteCount = match[1].length
            return this.editor.commands.deleteRange({
              from: $anchor.pos - deleteCount,
              to: $anchor.pos
            })
          }
        }

        // Important: always return true to prevent browser default focus behavior
        return true
      }
    }
  }
})
