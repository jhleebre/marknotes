import type { Editor as TipTapEditor } from '@tiptap/react'
import type { ContextMenuItem } from '../../ContextMenu'
import {
  PasteIcon,
  SelectAllIcon,
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
  HRIcon,
  TableIcon,
  ImageIcon,
  TaskListIcon
} from '../../../utils/icons'

export function getEmptyAreaMenuItems(editor: TipTapEditor): ContextMenuItem[] {
  return [
    {
      type: 'item',
      label: 'Paste',
      icon: <PasteIcon className="icon" />,
      onClick: async () => {
        try {
          const clipboardItems = await navigator.clipboard.read()

          for (const item of clipboardItems) {
            const imageType = item.types.find((type) => type.startsWith('image/'))
            if (imageType) {
              const blob = await item.getType(imageType)
              const reader = new FileReader()
              reader.onload = (e) => {
                const dataUrl = e.target?.result as string
                editor.chain().focus().setImage({ src: dataUrl }).run()
              }
              reader.readAsDataURL(blob)
              return
            }

            if (item.types.includes('text/html')) {
              const blob = await item.getType('text/html')
              let html = await blob.text()

              const parser = new DOMParser()
              const doc = parser.parseFromString(html, 'text/html')
              const body = doc.body

              if (body.children.length === 1 && body.firstElementChild?.tagName === 'P') {
                const p = body.firstElementChild
                const hasBlockElements = Array.from(p.querySelectorAll('*')).some((child) => {
                  const tagName = child.tagName
                  return [
                    'DIV',
                    'P',
                    'H1',
                    'H2',
                    'H3',
                    'H4',
                    'H5',
                    'H6',
                    'UL',
                    'OL',
                    'BLOCKQUOTE',
                    'PRE',
                    'TABLE'
                  ].includes(tagName)
                })

                if (!hasBlockElements) {
                  html = p.innerHTML
                }
              }

              editor.chain().focus().insertContent(html).run()
              return
            }

            if (item.types.includes('text/plain')) {
              const blob = await item.getType('text/plain')
              const text = await blob.text()

              const { state, view } = editor
              const { from, to } = state.selection
              const tr = state.tr.insertText(text, from, to)
              view.dispatch(tr)
              editor.commands.focus()
              return
            }
          }
        } catch (err) {
          console.error('Failed to paste:', err)
        }
      }
    },
    {
      type: 'item',
      label: 'Select All',
      icon: <SelectAllIcon className="icon" />,
      onClick: () => {
        const scrollable = document.querySelector('.wysiwyg-editor')
        const scrollTop = scrollable?.scrollTop ?? 0
        editor.chain().focus().selectAll().run()
        requestAnimationFrame(() => {
          if (scrollable) scrollable.scrollTop = scrollTop
        })
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
    },
    { type: 'divider' },
    {
      type: 'item',
      label: 'Horizontal Rule',
      icon: <HRIcon className="icon" />,
      onClick: () => editor.chain().focus().setHorizontalRule().run(),
      disabled: editor.isActive('heading')
    },
    {
      type: 'item',
      label: 'Insert Table',
      icon: <TableIcon className="icon" />,
      onClick: () =>
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      disabled: editor.isActive('heading') || editor.isActive('table')
    },
    {
      type: 'item',
      label: 'Insert Image',
      icon: <ImageIcon className="icon" />,
      onClick: () => {
        const event = new CustomEvent('open-image-modal')
        document.dispatchEvent(event)
      },
      disabled: editor.isActive('heading')
    }
  ]
}
