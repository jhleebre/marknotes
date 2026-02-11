import type { Editor as TipTapEditor } from '@tiptap/react'
import type { ContextMenuItem } from '../../ContextMenu'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  TrashIcon
} from '../../../utils/icons'

function ensureFirstRowIsHeader(editor: TipTapEditor): void {
  const { state, view } = editor
  const { $from } = state.selection

  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth)
    if (node.type.name === 'table') {
      const tableStart = $from.start(depth)
      const tr = state.tr
      let modified = false
      let currentPos = tableStart

      for (let i = 0; i < node.childCount; i++) {
        const row = node.child(i)
        let cellPos = currentPos + 1

        for (let j = 0; j < row.childCount; j++) {
          const cell = row.child(j)

          if (i === 0 && cell.type.name === 'tableCell') {
            tr.setNodeMarkup(cellPos, state.schema.nodes.tableHeader, cell.attrs)
            modified = true
          } else if (i > 0 && cell.type.name === 'tableHeader') {
            tr.setNodeMarkup(cellPos, state.schema.nodes.tableCell, cell.attrs)
            modified = true
          }

          cellPos += cell.nodeSize
        }

        currentPos += row.nodeSize
      }

      if (modified) {
        view.dispatch(tr)
      }
      break
    }
  }
}

export function getTableMenuItems(editor: TipTapEditor): ContextMenuItem[] {
  const setCellAlignment = (alignment: 'left' | 'center' | 'right'): void => {
    const { state, view } = editor
    const { selection } = state

    let colIndex = -1
    let tableStart = -1
    let foundTable = false

    state.doc.descendants((node, pos) => {
      if (foundTable) return false

      if (
        node.type.name === 'table' &&
        pos < selection.from &&
        pos + node.nodeSize > selection.from
      ) {
        tableStart = pos
        foundTable = true

        let currentPos = pos + 1
        let foundRow = false

        for (let i = 0; i < node.childCount; i++) {
          const row = node.child(i)
          if (currentPos < selection.from && currentPos + row.nodeSize > selection.from) {
            let cellIndex = 0
            let cellPos = currentPos + 1

            for (let j = 0; j < row.childCount; j++) {
              const cell = row.child(j)
              if (cellPos <= selection.from && cellPos + cell.nodeSize > selection.from) {
                colIndex = cellIndex
                foundRow = true
                break
              }
              cellIndex++
              cellPos += cell.nodeSize
            }

            if (foundRow) break
          }
          currentPos += row.nodeSize
        }

        return false
      }
      return true
    })

    if (colIndex === -1 || tableStart === -1) return

    const table = state.doc.nodeAt(tableStart)
    if (!table) return

    const tr = state.tr

    let currentPos = tableStart + 1
    for (let i = 0; i < table.childCount; i++) {
      const row = table.child(i)
      let cellIndex = 0
      let cellPos = currentPos + 1

      for (let j = 0; j < row.childCount; j++) {
        const cell = row.child(j)
        if (cellIndex === colIndex) {
          tr.setNodeMarkup(cellPos, undefined, {
            ...cell.attrs,
            textAlign: alignment
          })
        }
        cellIndex++
        cellPos += cell.nodeSize
      }
      currentPos += row.nodeSize
    }

    view.dispatch(tr)
  }

  return [
    {
      type: 'item',
      label: 'Add Row Above',
      icon: <ArrowUpIcon className="icon" />,
      onClick: () => {
        editor.chain().focus().addRowBefore().run()
        ensureFirstRowIsHeader(editor)
      }
    },
    {
      type: 'item',
      label: 'Add Row Below',
      icon: <ArrowDownIcon className="icon" />,
      onClick: () => editor.chain().focus().addRowAfter().run()
    },
    { type: 'divider' },
    {
      type: 'item',
      label: 'Add Column Left',
      icon: <ArrowLeftIcon className="icon" />,
      onClick: () => editor.chain().focus().addColumnBefore().run()
    },
    {
      type: 'item',
      label: 'Add Column Right',
      icon: <ArrowRightIcon className="icon" />,
      onClick: () => editor.chain().focus().addColumnAfter().run()
    },
    { type: 'divider' },
    {
      type: 'item',
      label: 'Align Left',
      icon: <AlignLeftIcon className="icon" />,
      onClick: () => setCellAlignment('left')
    },
    {
      type: 'item',
      label: 'Align Center',
      icon: <AlignCenterIcon className="icon" />,
      onClick: () => setCellAlignment('center')
    },
    {
      type: 'item',
      label: 'Align Right',
      icon: <AlignRightIcon className="icon" />,
      onClick: () => setCellAlignment('right')
    },
    { type: 'divider' },
    {
      type: 'item',
      label: 'Delete Row',
      icon: <TrashIcon className="icon" />,
      onClick: () => {
        const { state } = editor
        const { selection } = state
        const { $from } = selection

        const table = $from.node(-3)
        if (table && table.type.name === 'table') {
          const rowCount = table.childCount

          if (rowCount <= 1) {
            editor.chain().focus().deleteTable().run()
            return
          }
        }

        editor.chain().focus().deleteRow().run()
        ensureFirstRowIsHeader(editor)
      },
      danger: true
    },
    {
      type: 'item',
      label: 'Delete Column',
      icon: <TrashIcon className="icon" />,
      onClick: () => editor.chain().focus().deleteColumn().run(),
      danger: true
    },
    {
      type: 'item',
      label: 'Delete Table',
      icon: <TrashIcon className="icon" />,
      onClick: () => editor.chain().focus().deleteTable().run(),
      danger: true
    }
  ]
}
