// Post-process HTML to convert marked checkboxes to TipTap task lists (for editor)
export function processTaskListsForEditor(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  doc.querySelectorAll('ul').forEach((ul) => {
    const firstLi = ul.querySelector('li')
    if (firstLi && firstLi.querySelector('input[type="checkbox"]')) {
      ul.setAttribute('data-type', 'taskList')

      ul.querySelectorAll('li').forEach((li) => {
        const checkbox = li.querySelector('input[type="checkbox"]') as HTMLInputElement | null
        if (checkbox) {
          li.setAttribute('data-type', 'taskItem')
          li.setAttribute('data-checked', checkbox.checked ? 'true' : 'false')
          checkbox.removeAttribute('disabled')
        }
      })
    }
  })

  return doc.body.innerHTML
}

// Post-process HTML to convert marked checkboxes for preview mode (wraps content in div)
export function processTaskListsForPreview(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const processTaskList = (ul: Element): void => {
    const firstLi = ul.querySelector('li')
    if (!firstLi || !firstLi.querySelector('input[type="checkbox"]')) {
      return
    }

    ul.setAttribute('data-type', 'taskList')

    Array.from(ul.children).forEach((child) => {
      if (child.nodeName !== 'LI') return
      const li = child as HTMLElement

      const checkbox = li.querySelector('input[type="checkbox"]') as HTMLInputElement | null
      if (!checkbox) return

      li.setAttribute('data-type', 'taskItem')
      li.setAttribute('data-checked', checkbox.checked ? 'true' : 'false')
      checkbox.removeAttribute('disabled')

      // First, recursively process any nested task lists
      const nestedUls = Array.from(li.children).filter((el) => el.nodeName === 'UL')
      nestedUls.forEach((nestedUl) => processTaskList(nestedUl))

      // Wrap text content and nested lists in a div for proper flex layout
      const contentWrapper = doc.createElement('div')
      const nodes = Array.from(li.childNodes)

      nodes.forEach((node) => {
        if (node === checkbox) return
        contentWrapper.appendChild(node)
      })

      li.innerHTML = ''
      li.appendChild(checkbox)
      if (contentWrapper.childNodes.length > 0) {
        li.appendChild(contentWrapper)
      }
    })
  }

  doc.querySelectorAll('ul').forEach((ul) => {
    processTaskList(ul)
  })

  return doc.body.innerHTML
}
