import { useState, useCallback, useEffect, useRef } from 'react'

const STORAGE_KEY = 'sidebar-width'
const DEFAULT_WIDTH = 260
const MIN_WIDTH = 200
const MAX_WIDTH = 400
const DIVIDER_WIDTH = 4
const MIN_MAIN_CONTENT_WIDTH = 540

function getMaxAllowed(): number {
  return Math.min(MAX_WIDTH, window.innerWidth - MIN_MAIN_CONTENT_WIDTH - DIVIDER_WIDTH)
}

interface SidebarResize {
  sidebarWidth: number
  isDragging: boolean
  handleMouseDown: (e: React.MouseEvent) => void
}

export function useSidebarResize(): SidebarResize {
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = Number(stored)
      if (!Number.isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
        return Math.min(parsed, getMaxAllowed())
      }
    }
    return DEFAULT_WIDTH
  })

  const [isDragging, setIsDragging] = useState(false)
  const widthRef = useRef(sidebarWidth)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  // Clamp sidebar when window is resized
  useEffect(() => {
    const handleResize = (): void => {
      const maxAllowed = getMaxAllowed()
      setSidebarWidth((prev) => {
        const clamped = Math.min(prev, maxAllowed)
        widthRef.current = clamped
        return clamped
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Drag logic
  useEffect(() => {
    if (!isDragging) return

    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'

    const handleMouseMove = (e: MouseEvent): void => {
      const maxAllowed = getMaxAllowed()
      const newWidth = Math.min(maxAllowed, Math.max(MIN_WIDTH, e.clientX))
      widthRef.current = newWidth
      setSidebarWidth(newWidth)
    }

    const handleMouseUp = (): void => {
      setIsDragging(false)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      localStorage.setItem(STORAGE_KEY, String(widthRef.current))
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [isDragging])

  return { sidebarWidth, isDragging, handleMouseDown }
}
