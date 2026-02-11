import type { Editor as TipTapEditor } from '@tiptap/react'
import { DOMSerializer } from '@tiptap/pm/model'
import type { ContextMenuItem } from '../../ContextMenu'
import { turndownService } from '../markdown/htmlToMarkdown'
import {
  CutIcon,
  CopyIcon,
  BoldIcon,
  ItalicIcon,
  StrikeIcon,
  CodeIcon,
  LinkIcon,
  BulletListIcon,
  OrderedListIcon,
  QuoteIcon,
  CodeBlockIcon,
  IndentIcon,
  OutdentIcon,
  TaskListIcon
} from '../../../utils/icons'

export function getTextSelectionMenuItems(editor: TipTapEditor): ContextMenuItem[] {
  return [
    {
      type: 'item',
      label: 'Cut',
      icon: <CutIcon className="icon" />,
      onClick: () => document.execCommand('cut')
    },
    {
      type: 'item',
      label: 'Copy',
      icon: <CopyIcon className="icon" />,
      onClick: () => document.execCommand('copy')
    },
    {
      type: 'item',
      label: 'Copy as Markdown',
      icon: <CopyIcon className="icon" />,
      onClick: async () => {
        const { state } = editor
        const { from, to } = state.selection

        const slice = state.doc.slice(from, to)
        const serializer = DOMSerializer.fromSchema(editor.schema)
        const fragment = serializer.serializeFragment(slice.content)
        const div = document.createElement('div')
        div.appendChild(fragment)
        const html = div.innerHTML

        const markdown = turndownService.turndown(html)

        try {
          await navigator.clipboard.writeText(markdown)
        } catch (err) {
          console.error('Failed to copy as markdown:', err)
        }
      }
    },
    { type: 'divider' },
    {
      type: 'item',
      label: 'Bold',
      icon: <BoldIcon className="icon" />,
      onClick: () => editor.chain().focus().toggleBold().run(),
      disabled: editor.isActive('heading')
    },
    {
      type: 'item',
      label: 'Italic',
      icon: <ItalicIcon className="icon" />,
      onClick: () => editor.chain().focus().toggleItalic().run(),
      disabled: editor.isActive('heading')
    },
    {
      type: 'item',
      label: 'Strikethrough',
      icon: <StrikeIcon className="icon" />,
      onClick: () => editor.chain().focus().toggleStrike().run(),
      disabled: editor.isActive('heading')
    },
    {
      type: 'item',
      label: 'Inline Code',
      icon: <CodeIcon className="icon" />,
      onClick: () => editor.chain().focus().toggleCode().run(),
      disabled: editor.isActive('heading')
    },
    {
      type: 'item',
      label: editor.isActive('link') ? 'Edit Link' : 'Add Link',
      icon: <LinkIcon className="icon" />,
      onClick: () => {
        const event = new CustomEvent('open-link-modal')
        document.dispatchEvent(event)
      },
      disabled: editor.isActive('heading')
    },
    { type: 'divider' },
    {
      type: 'item',
      label: 'Numbered List',
      icon: <OrderedListIcon className="icon" />,
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
      disabled: editor.isActive('heading')
    },
    {
      type: 'item',
      label: 'Bullet List',
      icon: <BulletListIcon className="icon" />,
      onClick: () => editor.chain().focus().toggleBulletList().run(),
      disabled: editor.isActive('heading')
    },
    {
      type: 'item',
      label: 'Task List',
      icon: <TaskListIcon className="icon" />,
      onClick: () => editor.chain().focus().toggleTaskList().run(),
      disabled: editor.isActive('heading')
    },
    {
      type: 'item',
      label: 'Indent',
      icon: <IndentIcon className="icon" />,
      onClick: () => {
        if (editor.isActive('taskList')) {
          editor.chain().focus().sinkListItem('taskItem').run()
        } else {
          editor.chain().focus().sinkListItem('listItem').run()
        }
      },
      disabled: (() => {
        if (editor.isActive('heading')) return true
        const isInList =
          editor.isActive('bulletList') ||
          editor.isActive('orderedList') ||
          editor.isActive('taskList')
        if (!isInList) return true
        if (editor.isActive('taskList')) {
          return !editor.can().sinkListItem('taskItem')
        }
        return !editor.can().sinkListItem('listItem')
      })()
    },
    {
      type: 'item',
      label: 'Outdent',
      icon: <OutdentIcon className="icon" />,
      onClick: () => {
        if (editor.isActive('taskList')) {
          editor.chain().focus().liftListItem('taskItem').run()
        } else {
          editor.chain().focus().liftListItem('listItem').run()
        }
      },
      disabled: (() => {
        if (editor.isActive('heading')) return true
        const isInList =
          editor.isActive('bulletList') ||
          editor.isActive('orderedList') ||
          editor.isActive('taskList')
        if (!isInList) return true
        if (editor.isActive('taskList')) {
          return !editor.can().liftListItem('taskItem')
        }
        return !editor.can().liftListItem('listItem')
      })()
    },
    {
      type: 'item',
      label: 'Blockquote',
      icon: <QuoteIcon className="icon" />,
      onClick: () => editor.chain().focus().toggleBlockquote().run(),
      disabled:
        editor.isActive('heading') ||
        editor.isActive('bulletList') ||
        editor.isActive('orderedList') ||
        editor.isActive('taskList')
    },
    {
      type: 'item',
      label: 'Code Block',
      icon: <CodeBlockIcon className="icon" />,
      onClick: () => editor.chain().focus().toggleCodeBlock().run(),
      disabled: editor.isActive('heading')
    }
  ]
}
