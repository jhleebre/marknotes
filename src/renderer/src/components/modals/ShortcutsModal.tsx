import { useMemo } from 'react'
import './ShortcutsModal.css'

interface ShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

const isMac = navigator.platform.toUpperCase().includes('MAC')
const MOD = isMac ? 'Cmd' : 'Ctrl'
const ALT = isMac ? 'Option' : 'Alt'

function getShortcuts(): { category: string; items: { keys: string[]; label: string }[] }[] {
  return [
    {
      category: 'File',
      items: [
        { keys: [MOD, 'N'], label: 'New File' },
        { keys: [MOD, 'Shift', 'N'], label: 'New Folder' },
        { keys: [MOD, 'S'], label: 'Save' },
        { keys: [MOD, 'Shift', 'P'], label: 'Export as PDF' },
        { keys: [MOD, 'W'], label: 'Close File' }
      ]
    },
    {
      category: 'Edit',
      items: [
        { keys: [MOD, 'Z'], label: 'Undo' },
        { keys: [MOD, 'Shift', 'Z'], label: 'Redo' },
        { keys: [MOD, 'F'], label: 'Find' },
        { keys: [MOD, 'Shift', 'F'], label: 'Find & Replace' },
        { keys: [MOD, ALT, '0'], label: 'Normal Text' },
        { keys: [MOD, ALT, '1'], label: 'Heading 1' },
        { keys: [MOD, ALT, '2'], label: 'Heading 2' },
        { keys: [MOD, ALT, '3'], label: 'Heading 3' },
        { keys: [MOD, ALT, '4'], label: 'Heading 4' },
        { keys: [MOD, ALT, '5'], label: 'Heading 5' },
        { keys: [MOD, ALT, '6'], label: 'Heading 6' },
        { keys: [MOD, 'B'], label: 'Bold' },
        { keys: [MOD, 'I'], label: 'Italic' },
        { keys: [MOD, 'Shift', 'X'], label: 'Strikethrough' },
        { keys: [MOD, 'E'], label: 'Inline Code' },
        { keys: [MOD, 'K'], label: 'Insert Link' },
        { keys: [MOD, 'Shift', 'B'], label: 'Blockquote' },
        { keys: [MOD, 'Shift', '8'], label: 'Bullet List' },
        { keys: [MOD, 'Shift', '7'], label: 'Ordered List' },
        { keys: [MOD, 'Shift', '9'], label: 'Task List' },
        { keys: [MOD, 'Shift', 'C'], label: 'Code Block' },
        { keys: ['Tab'], label: 'Indent List' },
        { keys: ['Shift', 'Tab'], label: 'Outdent List' }
      ]
    },
    {
      category: 'View',
      items: [
        { keys: [MOD, '1'], label: 'Edit Mode' },
        { keys: [MOD, '2'], label: 'Code Mode' },
        { keys: [MOD, '.'], label: 'Toggle Sidebar' },
        { keys: [MOD, '+'], label: 'Zoom In' },
        { keys: [MOD, '-'], label: 'Zoom Out' },
        { keys: [MOD, '0'], label: 'Actual Size' }
      ]
    }
  ]
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps): React.JSX.Element | null {
  const shortcuts = useMemo(() => getShortcuts(), [])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Keyboard Shortcuts</h3>
        <div className="modal-body shortcuts-body">
          {shortcuts.map((section) => (
            <div key={section.category} className="shortcuts-section">
              <h4 className="shortcuts-category">{section.category}</h4>
              {section.items.map((item) => (
                <div key={item.label} className="shortcuts-row">
                  <span className="shortcuts-label">{item.label}</span>
                  <span className="shortcuts-keys">
                    {item.keys.map((key, i) => (
                      <span key={i}>
                        {i > 0 && <span className="shortcuts-plus">+</span>}
                        <kbd>{key}</kbd>
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button className="modal-btn modal-btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
