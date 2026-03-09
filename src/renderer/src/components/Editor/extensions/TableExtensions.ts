import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Slice, Fragment } from '@tiptap/pm/model'
import { isInTable, CellSelection } from 'prosemirror-tables'

// Fixes a prosemirror-tables bug where pasting cell-structured content into a
// TextSelection (regular cursor) inside a table replaces the entire cell content
// instead of inserting at the cursor position.
//
// prosemirror-tables' handlePaste calls insertCells() whenever pastedCells()
// returns non-null — even for a plain text cursor — which overwrites the cell.
// This plugin intercepts paste first: when inside a table with a TextSelection,
// it extracts the inner paragraph content from the cell slice and inserts it at
// the cursor, then returns true to prevent the table plugin from running.
const tablePasteFixPlugin = new Plugin({
  key: new PluginKey('tablePasteFix'),
  props: {
    handlePaste(view, _event, slice) {
      if (!isInTable(view.state)) return false
      // CellSelection paste is handled correctly by prosemirror-tables
      if (view.state.selection instanceof CellSelection) return false

      // Detect whether the pasted slice contains table-cell structured content
      // (mirrors the unwrapping logic inside prosemirror-tables' pastedCells())
      let { content, openStart, openEnd } = slice
      while (
        content.childCount === 1 &&
        (openStart > 0 && openEnd > 0 ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (content.child(0).type.spec as any).tableRole === 'table')
      ) {
        openStart--
        openEnd--
        content = content.child(0).content
      }

      if (content.childCount === 0) return false
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const role = (content.child(0).type.spec as any).tableRole
      if (role !== 'cell' && role !== 'header_cell') return false

      // Collect the inner nodes (paragraphs, etc.) from every pasted cell
      const nodes: ReturnType<typeof content.child>[] = []
      for (let r = 0; r < content.childCount; r++) {
        const cell = content.child(r)
        for (let i = 0; i < cell.content.childCount; i++) {
          nodes.push(cell.content.child(i))
        }
      }
      if (nodes.length === 0) return false

      // openStart=1 / openEnd=1 keeps the first/last paragraphs "open" so their
      // inline content merges with whatever text is already at the cursor position
      const innerSlice = new Slice(Fragment.from(nodes), 1, 1)
      view.dispatch(view.state.tr.replaceSelection(innerSlice))
      return true
    }
  }
})

export const TableExtended = Table.extend({
  addProseMirrorPlugins() {
    // Our fix plugin must come BEFORE the table editing plugin so it wins the
    // handlePaste race (first plugin returning true stops further processing)
    return [tablePasteFixPlugin, ...(this.parent?.() ?? [])]
  },
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
