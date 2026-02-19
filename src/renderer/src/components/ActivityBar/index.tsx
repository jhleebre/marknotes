import { useCallback } from 'react'
import { useDocumentStore } from '../../store/useDocumentStore'
import { extractBody } from '../../utils/frontmatter'
import {
  SidebarIcon,
  SidebarHiddenIcon,
  ExpandAllIcon,
  CollapseAllIcon,
  FolderPlusIcon,
  FilePlusIcon,
  SearchIcon,
  ZoomInIcon,
  ZoomOutIcon,
  ZoomResetIcon,
  PdfExportIcon,
  SunIcon,
  MoonIcon
} from '../../utils/icons'
import { Tooltip } from './Tooltip'
import './ActivityBar.css'

export function ActivityBar(): React.JSX.Element {
  const {
    isSidebarVisible,
    toggleSidebar,
    currentFilePath,
    currentFileName,
    content,
    isDarkMode,
    setIsDarkMode,
    isGlobalSearchOpen,
    closeGlobalSearchAndShowSidebar,
    toggleGlobalSearch
  } = useDocumentStore()

  // Sidebar button: if global search is open, close it and show sidebar;
  // otherwise toggle sidebar normally
  const handleToggleSidebar = useCallback((): void => {
    if (isGlobalSearchOpen) {
      closeGlobalSearchAndShowSidebar()
    } else {
      toggleSidebar()
    }
  }, [isGlobalSearchOpen, closeGlobalSearchAndShowSidebar, toggleSidebar])

  const handleExpandAll = useCallback(() => {
    document.dispatchEvent(new CustomEvent('filetree-expand-all'))
  }, [])

  const handleCollapseAll = useCallback(() => {
    document.dispatchEvent(new CustomEvent('filetree-collapse-all'))
  }, [])

  const handleNewFile = useCallback(() => {
    document.dispatchEvent(new CustomEvent('request-new-file'))
  }, [])

  const handleNewFolder = useCallback(() => {
    document.dispatchEvent(new CustomEvent('request-new-folder'))
  }, [])

  const handleZoomIn = useCallback(() => {
    window.api.zoom.zoomIn()
  }, [])

  const handleZoomOut = useCallback(() => {
    window.api.zoom.zoomOut()
  }, [])

  const handleZoomReset = useCallback(() => {
    window.api.zoom.reset()
  }, [])

  const handleExportPdf = useCallback(async (): Promise<void> => {
    if (!content || !currentFileName) return
    try {
      await window.api.export.pdf(extractBody(content), currentFileName)
    } catch (error) {
      console.error('Failed to export PDF:', error)
    }
  }, [content, currentFileName])

  const handleToggleDarkMode = useCallback(() => {
    const newDark = !isDarkMode
    setIsDarkMode(newDark)
    window.api.theme.update(newDark)
  }, [isDarkMode, setIsDarkMode])

  const hasFile = !!currentFilePath
  const sidebarActive = isSidebarVisible && !isGlobalSearchOpen

  return (
    <div className="activity-bar">
      {/* File tree controls */}
      <Tooltip label={sidebarActive ? 'Hide Sidebar (Cmd+.)' : 'Show Sidebar (Cmd+.)'}>
        <button className="activity-bar-btn" onClick={handleToggleSidebar}>
          {sidebarActive ? (
            <SidebarIcon className="icon" />
          ) : (
            <SidebarHiddenIcon className="icon" />
          )}
        </button>
      </Tooltip>
      <Tooltip label="Expand All Folders">
        <button
          className="activity-bar-btn"
          onClick={handleExpandAll}
          disabled={!isSidebarVisible || isGlobalSearchOpen}
        >
          <ExpandAllIcon className="icon" />
        </button>
      </Tooltip>
      <Tooltip label="Collapse All Folders">
        <button
          className="activity-bar-btn"
          onClick={handleCollapseAll}
          disabled={!isSidebarVisible || isGlobalSearchOpen}
        >
          <CollapseAllIcon className="icon" />
        </button>
      </Tooltip>

      <div className="activity-bar-divider" />

      {/* File creation */}
      <Tooltip label="New Folder (Cmd+Shift+N)">
        <button
          className="activity-bar-btn"
          onClick={handleNewFolder}
          disabled={isGlobalSearchOpen}
        >
          <FolderPlusIcon className="icon" />
        </button>
      </Tooltip>
      <Tooltip label="New File (Cmd+N)">
        <button className="activity-bar-btn" onClick={handleNewFile} disabled={isGlobalSearchOpen}>
          <FilePlusIcon className="icon" />
        </button>
      </Tooltip>

      <div className="activity-bar-divider" />

      {/* Global search */}
      <Tooltip label={isGlobalSearchOpen ? 'Close Search' : 'Search in Files (Cmd+Shift+H)'}>
        <button
          className={`activity-bar-btn${isGlobalSearchOpen ? ' activity-bar-btn-active' : ''}`}
          onClick={toggleGlobalSearch}
        >
          <SearchIcon className="icon" />
        </button>
      </Tooltip>

      <div className="activity-bar-divider" />

      {/* Export */}
      <Tooltip label="Export PDF (Cmd+Shift+P)">
        <button className="activity-bar-btn" onClick={handleExportPdf} disabled={!hasFile}>
          <PdfExportIcon className="icon" />
        </button>
      </Tooltip>

      <div className="activity-bar-spacer" />

      {/* Zoom controls */}
      <Tooltip label="Zoom In (Cmd+=)">
        <button className="activity-bar-btn" onClick={handleZoomIn}>
          <ZoomInIcon className="icon" />
        </button>
      </Tooltip>
      <Tooltip label="Zoom Out (Cmd+-)">
        <button className="activity-bar-btn" onClick={handleZoomOut}>
          <ZoomOutIcon className="icon" />
        </button>
      </Tooltip>
      <Tooltip label="Reset Zoom (Cmd+0)">
        <button className="activity-bar-btn" onClick={handleZoomReset}>
          <ZoomResetIcon className="icon" />
        </button>
      </Tooltip>

      <div className="activity-bar-divider" />

      {/* Bottom controls */}
      <Tooltip label={isDarkMode ? 'Light Mode' : 'Dark Mode'}>
        <button className="activity-bar-btn" onClick={handleToggleDarkMode}>
          {isDarkMode ? <SunIcon className="icon" /> : <MoonIcon className="icon" />}
        </button>
      </Tooltip>
    </div>
  )
}
