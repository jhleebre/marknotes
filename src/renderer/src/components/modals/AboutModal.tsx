import appIcon from '../../assets/app-icon.png'
import './AboutModal.css'

interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AboutModal({ isOpen, onClose }: AboutModalProps): React.JSX.Element | null {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content about-modal" onClick={(e) => e.stopPropagation()}>
        <div className="about-body">
          <img src={appIcon} alt="MarkNotes" className="about-icon" width="64" height="64" />
          <h2 className="about-app-name">MarkNotes</h2>
          <p className="about-tagline">Just write, forget syntax</p>
          <p className="about-version">Version {__APP_VERSION__}</p>
          <p className="about-description">
            A lightweight desktop markdown editor with WYSIWYG editing.
            <br />
            All notes are stored locally as plain markdown files.
          </p>
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
