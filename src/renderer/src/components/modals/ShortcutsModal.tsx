import './ShortcutsModal.css'

interface ShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

const shortcuts = [
  {
    category: 'File',
    items: [
      { keys: ['Cmd', 'N'], label: 'New File' },
      { keys: ['Cmd', 'Shift', 'N'], label: 'New Folder' },
      { keys: ['Cmd', 'S'], label: 'Save' },
      { keys: ['Cmd', 'Shift', 'P'], label: 'Export as PDF' },
      { keys: ['Cmd', 'W'], label: 'Close File' }
    ]
  },
  {
    category: 'Edit',
    items: [
      { keys: ['Cmd', 'Z'], label: 'Undo' },
      { keys: ['Cmd', 'Shift', 'Z'], label: 'Redo' },
      { keys: ['Cmd', 'B'], label: 'Bold' },
      { keys: ['Cmd', 'I'], label: 'Italic' },
      { keys: ['Cmd', 'Shift', 'X'], label: 'Strikethrough' },
      { keys: ['Cmd', 'E'], label: 'Inline Code' },
      { keys: ['Cmd', 'K'], label: 'Insert Link' },
      { keys: ['Cmd', 'Shift', 'B'], label: 'Blockquote' },
      { keys: ['Cmd', 'Shift', '8'], label: 'Bullet List' },
      { keys: ['Cmd', 'Shift', '7'], label: 'Ordered List' },
      { keys: ['Cmd', 'Shift', '9'], label: 'Task List' },
      { keys: ['Cmd', 'Alt', 'C'], label: 'Code Block' },
      { keys: ['Tab'], label: 'Indent List' },
      { keys: ['Shift', 'Tab'], label: 'Outdent List' }
    ]
  },
  {
    category: 'View',
    items: [
      { keys: ['Cmd', '1'], label: 'Edit Mode' },
      { keys: ['Cmd', '2'], label: 'Code Mode' },
      { keys: ['Cmd', '.'], label: 'Toggle Sidebar' },
      { keys: ['Cmd', '+'], label: 'Zoom In' },
      { keys: ['Cmd', '-'], label: 'Zoom Out' },
      { keys: ['Cmd', '0'], label: 'Actual Size' }
    ]
  }
]

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps): React.JSX.Element | null {
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
