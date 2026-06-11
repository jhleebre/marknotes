import { useEffect, useState, useCallback } from 'react'
import { useDocumentStore } from '../store/useDocumentStore'
import { saveDocument } from '../utils/saveDocument'

interface MenuModals {
  aboutOpen: boolean
  shortcutsOpen: boolean
  closeAbout: () => void
  closeShortcuts: () => void
}

export function useMenuListeners(): MenuModals {
  const {
    toggleSidebar,
    setIsDarkMode,
    setMode,
    isFindVisible,
    isReplaceVisible,
    setFindVisible,
    setReplaceVisible,
    closeFind,
    isGlobalSearchOpen,
    closeGlobalSearchAndShowSidebar,
    toggleGlobalSearch
  } = useDocumentStore()

  // Apply dark mode class to document
  const isDarkMode = useDocumentStore((s) => s.isDarkMode)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode)
  }, [isDarkMode])

  // Listen for system theme changes
  useEffect(() => {
    const unsubscribe = window.api.theme.onChanged((dark) => {
      setIsDarkMode(dark)
    })

    return () => {
      unsubscribe()
    }
  }, [setIsDarkMode])

  // Listen for save command (Cmd+S)
  useEffect(() => {
    const unsubscribe = window.api.menu.onSave(() => {
      saveDocument({ force: true })
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Listen for toggle sidebar menu command
  useEffect(() => {
    const unsubscribe = window.api.menu.onToggleSidebar(() => {
      if (isGlobalSearchOpen) {
        closeGlobalSearchAndShowSidebar()
      } else {
        toggleSidebar()
      }
    })

    return () => {
      unsubscribe()
    }
  }, [isGlobalSearchOpen, closeGlobalSearchAndShowSidebar, toggleSidebar])

  // Listen for mode change menu command (Cmd+1 / Cmd+2)
  useEffect(() => {
    const unsubscribe = window.api.menu.onSetMode((mode) => {
      setMode(mode as 'wysiwyg' | 'split')
    })

    return () => {
      unsubscribe()
    }
  }, [setMode])

  // Listen for find command (Cmd+F) - toggle find bar
  useEffect(() => {
    const unsubscribe = window.api.menu.onFind(() => {
      if (isFindVisible) {
        closeFind()
      } else {
        setFindVisible(true)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [isFindVisible, setFindVisible, closeFind])

  // Listen for replace command (Cmd+Shift+F) - toggle find bar with replace
  useEffect(() => {
    const unsubscribe = window.api.menu.onReplace(() => {
      if (isFindVisible && isReplaceVisible) {
        closeFind()
      } else {
        setFindVisible(true)
        setReplaceVisible(true)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [isFindVisible, isReplaceVisible, setFindVisible, setReplaceVisible, closeFind])

  // Listen for global search menu command (Cmd+Shift+H) - toggle open/close
  useEffect(() => {
    const unsubscribe = window.api.menu.onGlobalSearch(() => toggleGlobalSearch())
    return () => {
      unsubscribe()
    }
  }, [toggleGlobalSearch])

  // Listen for toggle dark mode menu command
  useEffect(() => {
    const unsubscribe = window.api.menu.onToggleDarkMode(() => {
      const newDark = !isDarkMode
      setIsDarkMode(newDark)
      window.api.theme.update(newDark)
    })
    return () => {
      unsubscribe()
    }
  }, [isDarkMode, setIsDarkMode])

  // Listen for cleanup images menu command
  useEffect(() => {
    const unsubscribe = window.api.menu.onCleanupImages(async () => {
      const result = await window.api.image.cleanup()
      if (result.success) {
        alert(result.content || 'Cleanup completed successfully')
      } else {
        alert(`Cleanup failed: ${result.error}`)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // About and Shortcuts modals
  const [aboutOpen, setAboutOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  const closeAbout = useCallback(() => setAboutOpen(false), [])
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), [])

  // Listen for about menu command
  useEffect(() => {
    const unsubscribe = window.api.menu.onAbout(() => {
      setAboutOpen(true)
    })
    return () => {
      unsubscribe()
    }
  }, [])

  // Listen for shortcuts menu command
  useEffect(() => {
    const unsubscribe = window.api.menu.onShortcuts(() => {
      setShortcutsOpen(true)
    })
    return () => {
      unsubscribe()
    }
  }, [])

  // Listen for app quit - save before quitting
  useEffect(() => {
    const unsubscribe = window.api.app.onSaveBeforeQuit(async () => {
      try {
        await saveDocument()
      } catch (error) {
        console.error('Failed to save before quit:', error)
      }

      // Always notify main process so the quit sequence can proceed
      window.api.app.saveComplete()
    })

    return () => {
      unsubscribe()
    }
  }, [])

  return { aboutOpen, shortcutsOpen, closeAbout, closeShortcuts }
}
