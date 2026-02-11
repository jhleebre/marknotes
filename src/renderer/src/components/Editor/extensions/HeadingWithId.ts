import Heading from '@tiptap/extension-heading'
import { Plugin, PluginKey } from '@tiptap/pm/state'

function generateIdFromText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w\s가-힣-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const HeadingWithId = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('id'),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {}
          }
          return {
            id: attributes.id
          }
        }
      }
    }
  },

  addProseMirrorPlugins() {
    let composing = false
    const updateTimeout: NodeJS.Timeout | null = null

    return [
      new Plugin({
        key: new PluginKey('autoHeadingId'),
        props: {
          handleDOMEvents: {
            compositionstart: () => {
              composing = true
              return false
            },
            compositionend: () => {
              composing = false
              return false
            }
          }
        },
        appendTransaction: (transactions, _oldState, newState) => {
          if (composing) {
            return null
          }

          if (updateTimeout) {
            clearTimeout(updateTimeout)
          }

          const tr = newState.tr
          let modified = false

          if (transactions.some((transaction) => transaction.docChanged)) {
            newState.doc.descendants((node, pos) => {
              if (node.type.name === 'heading') {
                const textContent = node.textContent
                const currentId = node.attrs.id

                if (textContent) {
                  const newId = generateIdFromText(textContent)

                  if (newId && newId !== currentId) {
                    tr.setNodeMarkup(pos, undefined, {
                      ...node.attrs,
                      id: newId
                    })
                    modified = true
                  }
                }
              }
            })
          }

          return modified ? tr : null
        }
      })
    ]
  }
})

export { generateIdFromText }
