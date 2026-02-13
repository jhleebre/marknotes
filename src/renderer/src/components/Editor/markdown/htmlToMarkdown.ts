import TurndownService from 'turndown'

// Configure turndown for better markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**'
})

// Strip trailing newlines from code blocks to prevent accumulation on round-trip
turndownService.addRule('fencedCodeBlock', {
  filter: function (node) {
    return node.nodeName === 'PRE' && !!node.querySelector('code')
  },
  replacement: function (_content, node) {
    const codeNode = node.querySelector('code')
    if (!codeNode) return ''

    const className = codeNode.getAttribute('class') || ''
    const language = (className.match(/language-(\S+)/) || [null, ''])[1] || ''
    const code = (codeNode.textContent || '').replace(/\n+$/, '')

    return '\n\n```' + language + '\n' + code + '\n```\n\n'
  }
})

// Add strikethrough conversion rule
turndownService.addRule('strikethrough', {
  filter: function (node) {
    return node.nodeName === 'S' || node.nodeName === 'STRIKE' || node.nodeName === 'DEL'
  },
  replacement: function (content) {
    return '~~' + content + '~~'
  }
})

// Keep heading IDs when converting HTML to markdown
turndownService.addRule('headingWithId', {
  filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  replacement: function (_content, node) {
    const level = Number(node.nodeName.charAt(1))
    const hashes = '#'.repeat(level)
    const text = node.textContent || ''
    return '\n\n' + hashes + ' ' + text + '\n\n'
  }
})

// Add table to markdown conversion rules
turndownService.addRule('table', {
  filter: 'table',
  replacement: function (_content, node) {
    const table = node as HTMLTableElement
    const rows = Array.from(table.querySelectorAll('tr'))

    if (rows.length === 0) return ''

    const markdownRows: string[] = []

    rows.forEach((row, index) => {
      const cells = Array.from(row.querySelectorAll('th, td'))
      const cellContents = cells.map((cell) => {
        const cellHtml = (cell as HTMLElement).innerHTML

        const hasBlockElements = /<(ul|ol|pre|blockquote|h[1-6]|div)[\s>]/i.test(cellHtml)

        let cellContent: string

        if (hasBlockElements) {
          cellContent = cellHtml.trim().replace(/\n/g, '&#10;').replace(/\r/g, '')
        } else {
          let processedHtml = cellHtml

          processedHtml = processedHtml.replace(/<\/p>\s*<p>/gi, '<br>')
          processedHtml = processedHtml.replace(/<\/?p>/gi, '')

          cellContent = turndownService.turndown(processedHtml).trim()

          cellContent = cellContent.replace(/\n/g, '<br>')
        }

        // Escape pipe characters
        cellContent = cellContent.split('\\|').join('<!ESCAPED_PIPE!>')
        cellContent = cellContent.split('|').join('\\|')
        cellContent = cellContent.split('<!ESCAPED_PIPE!>').join('\\|')

        return cellContent
      })

      markdownRows.push('| ' + cellContents.join(' | ') + ' |')

      // Add separator after first row (header) with alignment info
      if (index === 0) {
        const separator =
          '| ' +
          cells
            .map((cell) => {
              const align = (cell as HTMLElement).style.textAlign || 'left'
              if (align === 'center') {
                return ':---:'
              } else if (align === 'right') {
                return '---:'
              } else {
                return ':---'
              }
            })
            .join(' | ') +
          ' |'
        markdownRows.push(separator)
      }
    })

    return '\n\n' + markdownRows.join('\n') + '\n\n'
  }
})

turndownService.addRule('tableSection', {
  filter: ['thead', 'tbody', 'tfoot'],
  replacement: function () {
    return ''
  }
})

turndownService.addRule('tableRow', {
  filter: 'tr',
  replacement: function () {
    return ''
  }
})

turndownService.addRule('tableCell', {
  filter: ['th', 'td'],
  replacement: function () {
    return ''
  }
})

// Add rules for better list handling
turndownService.addRule('listItem', {
  filter: 'li',
  replacement: function (content, node) {
    content = content.replace(/^\n+/, '').replace(/\n+$/, '\n').replace(/\n/gm, '\n    ')

    let prefix = '- '
    const parent = node.parentNode
    if (parent && parent.nodeName === 'OL') {
      const siblings = Array.from(parent.children)
      const index = siblings.indexOf(node as Element) + 1
      prefix = `${index}. `
    }

    return prefix + content + (node.nextSibling ? '\n' : '')
  }
})

// Task list conversion rules
turndownService.addRule('taskList', {
  filter: function (node) {
    return node.nodeName === 'UL' && node.getAttribute('data-type') === 'taskList'
  },
  replacement: function (content) {
    return content
  }
})

turndownService.addRule('taskItem', {
  filter: function (node) {
    return node.nodeName === 'LI' && node.getAttribute('data-type') === 'taskItem'
  },
  replacement: function (content, node) {
    content = content.replace(/^\n+/, '').replace(/\n+$/, '\n').replace(/\n/gm, '\n    ')

    const checkbox = node.querySelector('input[type="checkbox"]') as HTMLInputElement | null
    const checked = checkbox ? checkbox.checked : false
    const prefix = checked ? '- [x] ' : '- [ ] '

    return prefix + content + (node.nextSibling ? '\n' : '')
  }
})

// Add rule for images with size classes
turndownService.addRule('imageWithSize', {
  filter: 'img',
  replacement: function (_content, node) {
    const img = node as HTMLImageElement
    const alt = img.alt || ''
    let src = img.src || ''

    if (!src) return ''

    // Check if this is a resolved .assets path (stored in data-asset-path)
    const assetPath = img.getAttribute('data-asset-path')
    if (assetPath) {
      src = assetPath
    }

    // Get size class from wrapper
    const wrapper = img.closest('.image-wrapper')
    let sizeClass = 'original'
    if (wrapper) {
      const dataSize = wrapper.getAttribute('data-size')
      if (dataSize) {
        sizeClass = dataSize
      }
    }

    const markdown = `![${alt}](${src})`

    if (sizeClass && sizeClass !== 'original') {
      return `${markdown}<!-- size:${sizeClass} -->`
    }

    return markdown
  }
})

export { turndownService }
