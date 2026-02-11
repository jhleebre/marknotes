import appIcon from '../assets/app-icon.png'

export function WelcomeScreen(): React.JSX.Element {
  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="welcome-icon">
          <img src={appIcon} alt="MarkNotes" width="64" height="64" />
        </div>
        <h1>MarkNotes</h1>
        <p>Just write, forget syntax</p>
        <div className="welcome-shortcuts">
          <div className="shortcut">
            <kbd>Cmd</kbd> + <kbd>N</kbd>
            <span>New File</span>
          </div>
          <div className="shortcut">
            <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>N</kbd>
            <span>New Folder</span>
          </div>
          <div className="shortcut">
            <kbd>Cmd</kbd> + <kbd>S</kbd>
            <span>Force Save</span>
          </div>
          <div className="shortcut">
            <kbd>Cmd</kbd> + <kbd>.</kbd>
            <span>Toggle Sidebar</span>
          </div>
          <div className="shortcut">
            <kbd>Cmd</kbd> + <kbd>1/2</kbd>
            <span>Switch Mode</span>
          </div>
        </div>
      </div>
    </div>
  )
}
