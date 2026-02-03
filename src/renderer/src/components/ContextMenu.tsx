import { useEffect, useRef, useState } from 'react'
import './ContextMenu.css'

export interface ContextMenuItem {
  type: 'item' | 'divider' | 'section-label'
  label?: string
  icon?: React.ReactNode
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
  zIndex?: number
}

export function ContextMenu({ x, y, items, onClose, zIndex = 1000 }: ContextMenuProps): React.JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x, y })
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)

  // Adjust position to stay within viewport
  useEffect(() => {
    if (menuRef.current) {
      const menu = menuRef.current
      const rect = menu.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let adjustedX = x
      let adjustedY = y

      // Adjust horizontal position
      if (x + rect.width > viewportWidth) {
        adjustedX = Math.max(8, viewportWidth - rect.width - 8)
      }

      // Adjust vertical position - show above if too close to bottom
      if (y + rect.height > viewportHeight) {
        adjustedY = Math.max(8, y - rect.height)
      }

      // Ensure minimum distance from edges
      adjustedX = Math.max(8, adjustedX)
      adjustedY = Math.max(8, adjustedY)

      setPosition({ x: adjustedX, y: adjustedY })
    }
  }, [x, y])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Get all clickable items
      const clickableItems = items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.type === 'item' && !item.disabled)

      if (clickableItems.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex((prev) => {
            if (prev === -1) return clickableItems[0].index
            const currentPos = clickableItems.findIndex(({ index }) => index === prev)
            const nextPos = (currentPos + 1) % clickableItems.length
            return clickableItems[nextPos].index
          })
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex((prev) => {
            if (prev === -1) return clickableItems[clickableItems.length - 1].index
            const currentPos = clickableItems.findIndex(({ index }) => index === prev)
            const nextPos = (currentPos - 1 + clickableItems.length) % clickableItems.length
            return clickableItems[nextPos].index
          })
          break
        case 'Enter':
          e.preventDefault()
          if (focusedIndex !== -1 && items[focusedIndex].type === 'item') {
            items[focusedIndex].onClick?.()
            onClose()
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [items, focusedIndex, onClose])

  // Focus menu item when focusedIndex changes
  useEffect(() => {
    if (focusedIndex !== -1 && menuRef.current) {
      const buttons = menuRef.current.querySelectorAll('.context-menu-item')
      const button = buttons[focusedIndex] as HTMLButtonElement
      button?.focus()
    }
  }, [focusedIndex])

  const handleItemClick = (item: ContextMenuItem): void => {
    if (item.type === 'item' && !item.disabled) {
      item.onClick?.()
      onClose()
    }
  }

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex
      }}
      onClick={(e) => e.stopPropagation()}
      role="menu"
      aria-label="Context menu"
    >
      {items.map((item, index) => {
        if (item.type === 'divider') {
          return <div key={index} className="context-menu-divider" role="separator" />
        }

        if (item.type === 'section-label') {
          return (
            <div key={index} className="context-menu-section-label" role="presentation">
              {item.label}
            </div>
          )
        }

        return (
          <button
            key={index}
            className={`context-menu-item ${item.danger ? 'context-menu-item-danger' : ''} ${
              focusedIndex === index ? 'focused' : ''
            }`}
            onClick={() => handleItemClick(item)}
            onMouseEnter={() => setFocusedIndex(index)}
            disabled={item.disabled}
            role="menuitem"
            aria-disabled={item.disabled}
          >
            {item.icon && <span className="context-menu-icon">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
