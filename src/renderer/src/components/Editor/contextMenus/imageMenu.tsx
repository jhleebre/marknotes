import type { Editor as TipTapEditor } from '@tiptap/react'
import type { ContextMenuItem } from '../../ContextMenu'
import {
  CutIcon,
  CopyIcon,
  EditIcon,
  ResizeIcon,
  ImageUpIcon,
  TrashIcon
} from '../../../utils/icons'

export function getImageMenuItems(
  editor: TipTapEditor,
  canEmbed: boolean,
  setAltTextModal: (value: { isOpen: boolean; currentAlt: string; imagePos: number }) => void
): ContextMenuItem[] {
  const handleResize = (sizeClass: string): void => {
    const { state, view } = editor
    const { selection } = state

    let imagePos = -1
    let imageAttrs: Record<string, unknown> | null = null

    state.doc.descendants((node, pos) => {
      if (node.type.name === 'image') {
        const nodeStart = pos
        const nodeEnd = pos + node.nodeSize

        if (selection.from >= nodeStart && selection.from <= nodeEnd) {
          imagePos = pos
          imageAttrs = node.attrs
          return false
        }
      }
      return true
    })

    if (imagePos !== -1 && imageAttrs) {
      const tr = state.tr
      tr.setNodeMarkup(imagePos, undefined, {
        ...(imageAttrs as object),
        sizeClass
      })
      view.dispatch(tr)
    }
  }

  const handleEditAltText = (): void => {
    const { state } = editor
    const { selection } = state

    let imagePos = -1
    let currentAlt = ''

    state.doc.descendants((node, pos) => {
      if (node.type.name === 'image') {
        const nodeStart = pos
        const nodeEnd = pos + node.nodeSize

        if (selection.from >= nodeStart && selection.from <= nodeEnd) {
          imagePos = pos
          currentAlt = (node.attrs.alt as string) || ''
          return false
        }
      }
      return true
    })

    if (imagePos !== -1) {
      setAltTextModal({ isOpen: true, currentAlt, imagePos })
    }
  }

  const handleEmbedImage = async (): Promise<void> => {
    const { state, view } = editor
    const { selection } = state

    let imagePos = -1
    let imageAttrs: Record<string, unknown> | null = null

    state.doc.descendants((node, pos) => {
      if (node.type.name === 'image') {
        const nodeStart = pos
        const nodeEnd = pos + node.nodeSize

        if (selection.from >= nodeStart && selection.from <= nodeEnd) {
          imagePos = pos
          imageAttrs = node.attrs
          return false
        }
      }
      return true
    })

    if (imagePos !== -1 && imageAttrs) {
      const assetPathValue = imageAttrs['assetPath']
      const srcValue = imageAttrs['src']

      let pathToEmbed: string | null = null

      if (typeof assetPathValue === 'string') {
        const assetPath: string = assetPathValue
        if (assetPath.startsWith('.assets/')) {
          pathToEmbed = assetPath
        }
      } else if (typeof srcValue === 'string') {
        const src: string = srcValue
        if (src.startsWith('.assets/')) {
          pathToEmbed = src
        }
      }

      if (pathToEmbed) {
        try {
          const result = await window.api.image.embedBase64(pathToEmbed)
          if (result.success && result.content) {
            const tr = state.tr
            tr.setNodeMarkup(imagePos, undefined, {
              ...(imageAttrs as object),
              src: result.content,
              assetPath: null
            })
            view.dispatch(tr)
            alert('Image embedded successfully. The document now contains the full image data.')
          } else {
            alert(result.error || 'Failed to embed image')
          }
        } catch {
          alert('Failed to embed image')
        }
      } else {
        alert('Only local .assets images can be embedded')
      }
    }
  }

  const handleDeleteImage = (): void => {
    const { state, view } = editor
    const { selection } = state

    let imagePos = -1

    state.doc.descendants((node, pos) => {
      if (node.type.name === 'image') {
        const nodeStart = pos
        const nodeEnd = pos + node.nodeSize

        if (selection.from >= nodeStart && selection.from <= nodeEnd) {
          imagePos = pos
          return false
        }
      }
      return true
    })

    if (imagePos !== -1) {
      const tr = state.tr
      tr.delete(imagePos, imagePos + 1)
      view.dispatch(tr)
    }
  }

  return [
    {
      type: 'item',
      label: 'Cut Image',
      icon: <CutIcon className="icon" />,
      onClick: () => document.execCommand('cut')
    },
    {
      type: 'item',
      label: 'Copy Image',
      icon: <CopyIcon className="icon" />,
      onClick: () => document.execCommand('copy')
    },
    { type: 'divider' },
    {
      type: 'item',
      label: 'Small (300px)',
      icon: <ResizeIcon className="icon" />,
      onClick: () => handleResize('small')
    },
    {
      type: 'item',
      label: 'Medium (600px)',
      icon: <ResizeIcon className="icon" />,
      onClick: () => handleResize('medium')
    },
    {
      type: 'item',
      label: 'Large (900px)',
      icon: <ResizeIcon className="icon" />,
      onClick: () => handleResize('large')
    },
    {
      type: 'item',
      label: 'Original Size',
      icon: <ResizeIcon className="icon" />,
      onClick: () => handleResize('original')
    },
    { type: 'divider' },
    {
      type: 'item',
      label: 'Edit Alt Text',
      icon: <EditIcon className="icon" />,
      onClick: handleEditAltText
    },
    {
      type: 'item',
      label: 'Embed in Document',
      icon: <ImageUpIcon className="icon" />,
      onClick: handleEmbedImage,
      disabled: !canEmbed
    },
    { type: 'divider' },
    {
      type: 'item',
      label: 'Delete Image',
      icon: <TrashIcon className="icon" />,
      onClick: handleDeleteImage,
      danger: true
    }
  ]
}
