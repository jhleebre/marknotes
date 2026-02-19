import { useState } from 'react'
import { FileTree } from './components/FileTree'
import { TitleBar } from './components/TitleBar'
import { ActivityBar } from './components/ActivityBar'
import { Editor } from './components/Editor'
import { StatusBar } from './components/StatusBar'
import { WelcomeScreen } from './components/WelcomeScreen'
import { GlobalSearch } from './components/GlobalSearch'
import { AboutModal } from './components/modals/AboutModal'
import { ShortcutsModal } from './components/modals/ShortcutsModal'
import { useDocumentStore } from './store/useDocumentStore'
import { useMenuListeners } from './hooks/useMenuListeners'
import { useSidebarResize } from './hooks/useSidebarResize'
import type { Editor as TipTapEditor } from '@tiptap/react'
import './App.css'

function App(): React.JSX.Element {
  const { isSidebarVisible, currentFilePath, isGlobalSearchOpen } = useDocumentStore()
  const [editor, setEditor] = useState<TipTapEditor | null>(null)

  const { aboutOpen, shortcutsOpen, closeAbout, closeShortcuts } = useMenuListeners()
  const { sidebarWidth, isDragging, handleMouseDown } = useSidebarResize()

  return (
    <div className="app">
      <TitleBar editor={editor} />
      <div className="app-body">
        <ActivityBar />
        {isGlobalSearchOpen && (
          <>
            <div className="file-tree-wrapper" style={{ width: sidebarWidth }}>
              <GlobalSearch />
            </div>
            <div
              className={`sidebar-divider${isDragging ? ' sidebar-divider-active' : ''}`}
              onMouseDown={handleMouseDown}
            />
          </>
        )}
        {isSidebarVisible && !isGlobalSearchOpen && (
          <>
            <div className="file-tree-wrapper" style={{ width: sidebarWidth }}>
              <FileTree />
            </div>
            <div
              className={`sidebar-divider${isDragging ? ' sidebar-divider-active' : ''}`}
              onMouseDown={handleMouseDown}
            />
          </>
        )}
        <div className="main-content">
          <div className="editor-area">
            {currentFilePath ? <Editor onEditorReady={setEditor} /> : <WelcomeScreen />}
          </div>
          <StatusBar />
        </div>
      </div>
      <AboutModal isOpen={aboutOpen} onClose={closeAbout} />
      <ShortcutsModal isOpen={shortcutsOpen} onClose={closeShortcuts} />
    </div>
  )
}

export default App
