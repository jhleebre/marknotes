import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Code from '@tiptap/extension-code'
import Blockquote from '@tiptap/extension-blockquote'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import TaskList from '@tiptap/extension-task-list'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { InputRule } from '@tiptap/core'

export const BoldExtended = Bold.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-b': () => {
        if (this.editor.isActive('heading')) {
          return true
        }
        return this.editor.commands.toggleBold()
      }
    }
  }
})

export const ItalicExtended = Italic.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-i': () => {
        if (this.editor.isActive('heading')) {
          return true
        }
        return this.editor.commands.toggleItalic()
      }
    }
  }
})

export const CodeExtended = Code.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-e': () => {
        if (this.editor.isActive('heading')) {
          return true
        }
        return this.editor.commands.toggleCode()
      }
    }
  },

  addInputRules() {
    return [
      new InputRule({
        find: /(?:^|\s)(`([^`]+)`)$/,
        handler: ({ state, range, match }) => {
          const { $from } = state.selection

          if ($from.parent.type.name === 'heading') {
            return
          }

          const attributes = {}
          const { tr } = state
          const captureGroup = match[2]
          const fullMatch = match[0]

          if (captureGroup) {
            const startSpaces = fullMatch.search(/\S/)
            const textStart = range.from + fullMatch.indexOf(captureGroup)
            const textEnd = textStart + captureGroup.length

            if (textEnd < range.to) {
              tr.delete(textEnd, range.to)
            }
            if (textStart > range.from) {
              tr.delete(range.from + startSpaces, textStart)
            }

            const markStart = range.from + startSpaces
            const markEnd = markStart + captureGroup.length

            tr.addMark(markStart, markEnd, this.type.create(attributes))
            tr.removeStoredMark(this.type)
          }
        }
      })
    ]
  }
})

export const BlockquoteExtended = Blockquote.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-b': () => {
        if (this.editor.isActive('heading')) {
          return true
        }
        return this.editor.commands.toggleBlockquote()
      }
    }
  }
})

export const BulletListExtended = BulletList.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-8': () => {
        if (this.editor.isActive('heading')) {
          return true
        }
        return this.editor.commands.toggleBulletList()
      }
    }
  }
})

export const OrderedListExtended = OrderedList.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-7': () => {
        if (this.editor.isActive('heading')) {
          return true
        }
        return this.editor.commands.toggleOrderedList()
      }
    }
  }
})

export const TaskListExtended = TaskList.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-9': () => {
        if (this.editor.isActive('heading')) {
          return true
        }
        return this.editor.commands.toggleTaskList()
      }
    }
  }
})

export const CodeBlockLowlightExtended = CodeBlockLowlight.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-c': () => {
        if (this.editor.isActive('heading')) {
          return true
        }
        return this.editor.commands.toggleCodeBlock()
      }
    }
  }
})
