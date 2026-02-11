import TipTapImage from '@tiptap/extension-image'

export const CustomImage = TipTapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute('src'),
        renderHTML: (attributes) => {
          if (!attributes.src) return {}
          return { src: attributes.src }
        }
      },
      alt: {
        default: null,
        parseHTML: (element) => element.getAttribute('alt'),
        renderHTML: (attributes) => {
          if (!attributes.alt) return {}
          return { alt: attributes.alt }
        }
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('title'),
        renderHTML: (attributes) => {
          if (!attributes.title) return {}
          return { title: attributes.title }
        }
      },
      sizeClass: {
        default: 'original',
        parseHTML: (element) => {
          const wrapper = element.closest('.image-wrapper')
          if (wrapper) {
            const classList = Array.from(wrapper.classList)
            const sizeClass = classList.find((c) => c.startsWith('image-size-'))
            if (sizeClass) {
              return sizeClass.replace('image-size-', '')
            }
          }
          return 'original'
        },
        renderHTML: () => {
          return {}
        }
      },
      assetPath: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-asset-path'),
        renderHTML: (attributes) => {
          if (!attributes.assetPath) return {}
          return { 'data-asset-path': attributes.assetPath }
        }
      }
    }
  },

  renderHTML({ HTMLAttributes, node }) {
    const sizeClass = node.attrs.sizeClass || 'original'
    return [
      'div',
      { class: `image-wrapper image-size-${sizeClass}`, 'data-size': sizeClass },
      ['img', HTMLAttributes]
    ]
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (element) => {
          if (typeof element === 'string') return false
          const el = element as HTMLElement
          return {
            src: el.getAttribute('src'),
            alt: el.getAttribute('alt'),
            title: el.getAttribute('title')
          }
        }
      }
    ]
  }
})
