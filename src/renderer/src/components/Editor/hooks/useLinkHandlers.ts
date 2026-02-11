import { useCallback } from 'react'
import type { Editor as TipTapEditor } from '@tiptap/react'

interface LinkModalData {
  text: string
  url: string
  isEditing: boolean
}

export function useLinkHandlers(
  editor: TipTapEditor | null,
  setLinkModalData: (data: LinkModalData) => void,
  setLinkModalOpen: (open: boolean) => void
): {
  handleLinkButtonClick: () => void
  handleLinkInsert: (text: string, url: string) => void
  handleLinkDelete: () => void
} {
  const handleLinkButtonClick = useCallback((): void => {
    if (!editor) return
    const { state } = editor
    const { from, to, $from } = state.selection
    let selectedText = state.doc.textBetween(from, to, '')

    const linkAttrs = editor.getAttributes('link')
    const existingUrl = linkAttrs.href || ''

    if (!selectedText && editor.isActive('link')) {
      const marks = $from.marks()
      const linkMark = marks.find((mark) => mark.type.name === 'link')

      if (linkMark) {
        let linkStart = from
        let linkEnd = from

        let pos = from - 1
        while (pos >= 0) {
          const resolvedPos = state.doc.resolve(pos)
          const marksAtPos = resolvedPos.marks()
          if (
            !marksAtPos.some((m) => m.type.name === 'link' && m.attrs.href === linkMark.attrs.href)
          ) {
            linkStart = pos + 1
            break
          }
          pos--
        }
        if (pos < 0) linkStart = 0

        pos = from
        const docSize = state.doc.content.size
        while (pos < docSize) {
          const resolvedPos = state.doc.resolve(pos)
          const marksAtPos = resolvedPos.marks()
          if (
            !marksAtPos.some((m) => m.type.name === 'link' && m.attrs.href === linkMark.attrs.href)
          ) {
            linkEnd = pos
            break
          }
          pos++
        }
        if (pos >= docSize) linkEnd = docSize

        selectedText = state.doc.textBetween(linkStart, linkEnd, '')
      }
    }

    setLinkModalData({
      text: selectedText,
      url: existingUrl,
      isEditing: editor.isActive('link')
    })
    setLinkModalOpen(true)
  }, [editor, setLinkModalData, setLinkModalOpen])

  const handleLinkInsert = useCallback(
    (text: string, url: string): void => {
      if (!editor) return
      const { state } = editor
      const { from, to, $from } = state.selection
      const hasSelection = from !== to

      const isEditingLink = editor.isActive('link')

      if (isEditingLink && !hasSelection) {
        const marks = $from.marks()
        const linkMark = marks.find((mark) => mark.type.name === 'link')

        if (linkMark) {
          let linkStart = from
          let linkEnd = from

          let pos = from - 1
          while (pos >= 0) {
            const resolvedPos = state.doc.resolve(pos)
            const marksAtPos = resolvedPos.marks()
            if (
              !marksAtPos.some(
                (m) => m.type.name === 'link' && m.attrs.href === linkMark.attrs.href
              )
            ) {
              linkStart = pos + 1
              break
            }
            pos--
          }
          if (pos < 0) linkStart = 0

          pos = from
          const docSize = state.doc.content.size
          while (pos < docSize) {
            const resolvedPos = state.doc.resolve(pos)
            const marksAtPos = resolvedPos.marks()
            if (
              !marksAtPos.some(
                (m) => m.type.name === 'link' && m.attrs.href === linkMark.attrs.href
              )
            ) {
              linkEnd = pos
              break
            }
            pos++
          }
          if (pos >= docSize) linkEnd = docSize

          const tr = state.tr
          tr.removeMark(linkStart, linkEnd, editor.schema.marks.link)
          tr.insertText(text, linkStart, linkEnd)
          tr.addMark(
            linkStart,
            linkStart + text.length,
            editor.schema.marks.link.create({ href: url })
          )
          editor.view.dispatch(tr)

          editor.commands.focus()
          editor.commands.setTextSelection(linkStart + text.length)
          return
        }
      }

      if (hasSelection) {
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
      } else {
        editor.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run()
      }
    },
    [editor]
  )

  const handleLinkDelete = useCallback((): void => {
    if (!editor || !editor.isActive('link')) return
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
  }, [editor])

  return { handleLinkButtonClick, handleLinkInsert, handleLinkDelete }
}
