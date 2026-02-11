import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'

export const TableExtended = Table.extend({
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      Tab: () => {
        // Check if we're in a list FIRST
        const isInList =
          this.editor.isActive('bulletList') ||
          this.editor.isActive('orderedList') ||
          this.editor.isActive('taskList')
        if (isInList) {
          if (this.editor.isActive('taskList')) {
            this.editor.commands.sinkListItem('taskItem')
          } else {
            this.editor.commands.sinkListItem('listItem')
          }
          return true
        }
        // Try to go to next cell
        if (this.editor.commands.goToNextCell()) {
          return true
        }
        // If goToNextCell returns false, we're at the last cell
        // Add a new row and move to its first cell
        this.editor.commands.addRowAfter()
        this.editor.commands.goToNextCell()
        return true
      },
      'Shift-Tab': () => {
        // Check if we're in a list FIRST
        const isInList =
          this.editor.isActive('bulletList') ||
          this.editor.isActive('orderedList') ||
          this.editor.isActive('taskList')
        if (isInList) {
          if (this.editor.isActive('taskList')) {
            this.editor.commands.liftListItem('taskItem')
          } else {
            this.editor.commands.liftListItem('listItem')
          }
          return true
        }
        // Default table behavior: go to previous cell
        return this.editor.commands.goToPreviousCell()
      }
    }
  }
})

export const TableHeaderExtended = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      textAlign: {
        default: 'left',
        parseHTML: (element) => element.style.textAlign || 'left',
        renderHTML: (attributes) => {
          if (!attributes.textAlign || attributes.textAlign === 'left') {
            return {}
          }
          return {
            style: `text-align: ${attributes.textAlign}`
          }
        }
      }
    }
  }
})

export const TableCellExtended = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      textAlign: {
        default: 'left',
        parseHTML: (element) => element.style.textAlign || 'left',
        renderHTML: (attributes) => {
          if (!attributes.textAlign || attributes.textAlign === 'left') {
            return {}
          }
          return {
            style: `text-align: ${attributes.textAlign}`
          }
        }
      }
    }
  }
})

export { TableRow }
