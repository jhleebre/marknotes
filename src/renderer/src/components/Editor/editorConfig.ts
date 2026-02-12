import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Strike from '@tiptap/extension-strike'
import TaskItem from '@tiptap/extension-task-item'
import ListItem from '@tiptap/extension-list-item'
import { common, createLowlight } from 'lowlight'
import type { Extensions } from '@tiptap/core'

import {
  TabHandling,
  HeadingWithId,
  BoldExtended,
  ItalicExtended,
  CodeExtended,
  BlockquoteExtended,
  BulletListExtended,
  OrderedListExtended,
  TaskListExtended,
  CodeBlockLowlightExtended,
  CustomImage,
  TableExtended,
  TableHeaderExtended,
  TableCellExtended,
  TableRow
} from './extensions'
import { SearchHighlight } from './extensions/SearchHighlight'

const lowlight = createLowlight(common)

export function getEditorExtensions(): Extensions {
  return [
    StarterKit.configure({
      codeBlock: false,
      heading: false,
      link: false,
      strike: false,
      bold: false,
      italic: false,
      code: false,
      blockquote: false,
      bulletList: false,
      orderedList: false,
      listItem: false
    }),
    HeadingWithId,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'editor-link',
        target: null,
        rel: null
      }
    }),
    Strike.extend({
      addKeyboardShortcuts() {
        return {
          'Mod-Shift-x': () => {
            if (this.editor.isActive('heading')) {
              return true
            }
            return this.editor.commands.toggleStrike()
          }
        }
      }
    }),
    BoldExtended,
    ItalicExtended,
    CodeExtended,
    BlockquoteExtended,
    BulletListExtended,
    OrderedListExtended,
    TaskListExtended,
    TaskItem.configure({
      nested: true,
      HTMLAttributes: {
        class: 'task-list-item'
      }
    }),
    ListItem,
    CustomImage.configure({
      inline: false,
      allowBase64: true
    }),
    CodeBlockLowlightExtended.configure({
      lowlight
    }),
    Placeholder.configure({
      placeholder: 'Start writing...'
    }),
    TableExtended.configure({
      resizable: false,
      HTMLAttributes: {
        class: 'editor-table'
      }
    }),
    TableRow,
    TableHeaderExtended,
    TableCellExtended,
    TabHandling,
    SearchHighlight
  ]
}
