import { useCallback } from 'react'
import type { Editor as TipTapEditor } from '@tiptap/react'

export function useImageHandlers(
  editor: TipTapEditor | null,
  setImageModalData: (data: { alt: string }) => void,
  setImageModalOpen: (open: boolean) => void
): {
  handleImageButtonClick: () => void
  handleImageInsert: (src: string, alt: string) => Promise<void>
} {
  const handleImageButtonClick = useCallback((): void => {
    setImageModalData({ alt: '' })
    setImageModalOpen(true)
  }, [setImageModalData, setImageModalOpen])

  const handleImageInsert = useCallback(
    async (src: string, alt: string): Promise<void> => {
      if (!editor) return
      let displaySrc = src
      let assetPath: string | null = null

      if (src.startsWith('.assets/')) {
        assetPath = src
        const result = await window.api.image.resolveAssetPath(src)
        if (result.success && result.content) {
          displaySrc = result.content
        }
      }

      editor.chain().focus().setImage({ src: displaySrc, alt }).run()

      if (assetPath) {
        const { state } = editor
        let imagePos = -1

        state.doc.descendants((node, pos) => {
          if (node.type.name === 'image' && node.attrs.src === displaySrc) {
            imagePos = pos
            return false
          }
          return true
        })

        if (imagePos !== -1) {
          const tr = state.tr
          const node = state.doc.nodeAt(imagePos)
          if (node) {
            tr.setNodeMarkup(imagePos, undefined, {
              ...(node.attrs as object),
              assetPath
            })
            editor.view.dispatch(tr)
          }
        }
      }
    },
    [editor]
  )

  return { handleImageButtonClick, handleImageInsert }
}
