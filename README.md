# MarkNotes

<p align="center">
  <strong>A simple, local-first markdown editor for macOS</strong>
</p>

<p align="center">
  Write, organize, and export your notes in a beautiful, distraction-free interface with WYSIWYG editing, advanced table support, and comprehensive formatting tools.
</p>

<p align="center">
  <strong>Version 1.7.0</strong>
</p>

---

## Changelog

### Version 1.7.0 (2026-02-09)

**Internal Document Navigation**

- Added support for relative markdown file links - clicking links to other `.md` files now opens them within MarkNotes instead of externally
- URL-encoded filenames (spaces, special characters) are automatically decoded and resolved
- Works in both Edit mode (Cmd+Click) and Code/Preview mode (regular click)
- Seamless navigation between test documents and cross-referenced notes

**Table Improvements**

- Insert Table button now disabled when cursor is inside a table cell (prevents unsupported nested tables)
- Deleting the last remaining row in a table now removes the entire table (cleaner workflow)
- Improved context menu behavior for table operations

**Markdown Formatting Fixes**

- Fixed nested formatting in table cells - proper HTML list structures for indented items
- Corrected checkbox syntax in tables (checkboxes now require text for proper rendering)
- Fixed range notation using hyphens instead of tildes to avoid strikethrough rendering (e.g., `H1-H6` instead of `H1~H6`)
- Updated test documents with proper nested list HTML structure in table cells

**Test Document Enhancements**

- Reorganized test document numbering for better flow
- Updated cross-references and internal links throughout test suite
- Added comprehensive instructions for creating nested lists in table cells
- Improved documentation of markdown limitations and workarounds

### Version 1.6.0 (2026-02-08)

**Task List (Checkbox) Support**

- Added interactive checkbox support for task lists in both edit and code modes
- Click checkboxes to toggle completion status with instant markdown sync (`- [ ]` / `- [x]`)
- Full support for nested/hierarchical task lists with proper indentation
- Task lists work seamlessly in table cells alongside other content
- New toolbar button and context menu item for quick task list insertion
- Keyboard shortcut: `Cmd+Shift+9` to toggle task lists
- Tab/Shift+Tab for indenting/outdenting task items
- Checkbox states preserved when saving, loading, and exporting documents

**Icon Improvements**

- Redesigned task list icon: simplified to clean checkmark + dash combination
- Simplified all list icons from 3 lines to 2 lines for visual consistency
- Updated bullet list and ordered list icons with cleaner, more compact design
- Refined indent/outdent icons with better arrow positioning and 2-line layout
- All formatting icons now share unified 2-line design language

### Version 1.5.0 (2026-02-08)

**Table Improvements**

- Added automatic row insertion when pressing Tab at the last cell of a table (standard Word/Docs behavior)
- Table navigation now matches industry-standard editors

**Paste Enhancements**

- Fixed paste behavior to prevent unwanted line breaks when pasting into existing text
- Improved HTML-to-markdown conversion for clipboard content
- Added "Copy as Markdown" option in context menu for easy markdown code copying to external editors

**UI/UX Improvements**

- Disabled blockquote formatting in lists (prevents invalid markdown structure)
- Removed HTML export, simplified to PDF-only export for cleaner workflow
- Redesigned all icons with modern stroke-based style for visual consistency:
  - Unified Export, Cut, Copy, Paste, Edit icons with clean line-based design
  - Updated File, Folder, and FileTree icons for cohesive appearance
  - Improved icon readability and aesthetics across the entire interface

### Version 1.4.1 (2026-02-06)

**Link Editing Improvements**

- Context menu now displays "Edit Link" when clicking on existing links (previously showed "Add Link")
- Fixed link editing when right-clicking on a link without text selection
  - Modal now correctly shows existing link text and URL
  - Editing link text now replaces the entire link text instead of inserting at cursor position
  - Link text field is now editable when modifying existing links
- Enhanced link editing workflow with proper detection of edit vs. insert mode

### Version 1.4.0 (2026-02-05)

**Table Enhancements**

- Added support for block-level markdown in table cells (lists, code blocks, blockquotes, headings)
- Preserve line breaks and complex formatting in table cells when saving/loading
- Fixed Tab/Shift-Tab behavior in lists within tables to properly indent/outdent instead of navigating cells
- Maintain proper HTML entity encoding to prevent table structure breaking

**UI/UX Improvements**

- Replaced individual H1-H6, P buttons with single dropdown selector for cleaner formatting toolbar
- Redesigned bullet list and ordered list icons for better visibility

### Version 1.3.0 (2026-02-04)

**Formatting Improvements**

- Added heading formatting restrictions: headings now prevent conflicting inline/block formatting
- Fixed nested ordered list indentation (4 spaces for proper markdown parsing)
- Added 5-level nested unordered list styling (disc → circle → square → ▫ → ⁃)
- Blocked backtick auto-conversion to inline code within headings

**UI/UX Enhancements**

- Simplified indent/outdent icons with cleaner arrow design
- Simplified HTML/PDF export icons focusing on export action
- Added arrow icons to table context menu for better clarity
- Fixed AltTextModal styling to match CreateModal appearance
- Updated indent/outdent tooltips to simpler labels
- Removed section labels from context menus for cleaner UI
- Reordered context menu items to match toolbar layout

**Context Menu Improvements**

- Added Cut Image option to image context menu
- Renamed "Embed Image (Base64)" to "Embed in Document"
- Enhanced empty area context menu with all formatting options
- Fixed paste functionality to properly handle cut/copied images

**Bug Fixes**

- Fixed Tab key behavior in lists (no longer indents first item incorrectly)
- Improved clipboard handling for images in context menu paste

---

## Overview

MarkNotes is a native macOS Electron application designed for markdown enthusiasts who want the best of both worlds: the power of markdown syntax with the convenience of rich text editing. All your notes are stored as plain markdown files in `~/Documents/MarkNotes`, making them portable, version-controllable, and future-proof.

## Features

### 🎨 **Two Editing Modes**

- **WYSIWYG Mode (Edit)** - Rich text editing powered by TipTap with instant markdown conversion
- **Code Mode** - Side-by-side markdown source editor and live preview pane
- Switch modes seamlessly with `Cmd + 1` (Edit) or `Cmd + 2` (Code)

### 📝 **Rich Text Formatting**

- **Headings** - H1 through H6 with customized font sizes (24pt to 14pt)
  - Convenient dropdown selector in toolbar for quick access
- **Text Styles** - Bold, italic, strikethrough (`Cmd+Shift+X`), inline code
- **Lists** - Bulleted, numbered, and task lists with proper nesting
  - **Task Lists** - Interactive checkboxes with click-to-toggle (`Cmd+Shift+9`)
  - **Indent/Outdent** - Tab/Shift+Tab for list nesting (context-aware)
  - Smart indentation for regular text outside lists
  - Checkbox states preserved across save/load/export
- **Blockquotes** - Stylized quote blocks with accent border
- **Links** - Interactive hyperlinks with insert modal (`Cmd + K`)
  - Internal navigation with anchor links (#heading-id)
  - External links open in default browser
  - Cmd+Click to follow links in edit mode
- **Code Blocks** - Syntax-highlighted code with monospace font
- **Horizontal Rules** - Visual section dividers

### 📊 **Advanced Table Support**

- **Table Insertion** - Create 3×3 tables instantly from the toolbar
- **Block-Level Content** - Full support for complex markdown in table cells:
  - Bulleted and numbered lists (with proper nesting)
  - Code blocks with syntax highlighting
  - Blockquotes and headings
  - Line breaks and multi-paragraph text
  - All inline formatting (bold, italic, links, images, code)
- **Right-Click Context Menu** - Full table manipulation:
  - Add row above/below
  - Add column left/right
  - Column alignment (left, center, right)
  - Delete row/column/table
- **GFM-Compliant Alignment** - Standard markdown alignment syntax (`:---`, `:---:`, `---:`)
- **Smart Rendering** - Tables display consistently in edit, preview, and export
- **Context-Aware Tab Behavior**:
  - Inside lists: Tab/Shift+Tab for indent/outdent
  - Outside lists: Tab/Shift+Tab for cell navigation

### 🖼️ **Image Management**

- **File Upload** - Insert images with toolbar button
  - Supported formats: JPG, PNG, GIF, SVG, WEBP
  - Automatic storage in `.assets/` folder with unique filenames
  - Alt text support for accessibility
- **Image Resizing** - Right-click any image to resize:
  - Small (300px), Medium (600px), Large (900px), or Original size
  - Size preferences preserved in markdown
- **Context Menu Actions**:
  - Resize to predefined dimensions
  - Edit alt text
  - Embed as base64 (makes document fully portable)
  - Copy image to clipboard
  - Remove image
- **Smart Storage** - Images stored as relative paths (`.assets/filename.png`)
- **Automatic Cleanup** - Remove unused images from .assets folder via menu
- **Export Compatible** - Images embedded in HTML/PDF exports automatically

### 📁 **File Management**

- **Sidebar Navigation** - Browse and organize notes in a collapsible file tree
- **Folders** - Create nested folder structures with drag-and-drop support
- **Context Menus** - Right-click files/folders to rename or delete
  - Smart positioning (auto-adjusts to stay on screen)
  - Auto-close on scroll for better UX
- **Quick Actions** - `Cmd + N` for new file, `Cmd + Shift + N` for new folder
- **Persistent State** - Selected file and sidebar state saved between sessions
- **Clean UI** - `.md` extensions hidden throughout interface for cleaner look

### 💾 **Smart Auto-Save**

- Changes automatically saved 5 seconds after typing stops
- Visual feedback in status bar during save
- No manual save needed (though `Cmd + S` works too)
- Prevents data loss with robust debouncing

### 📤 **Export Options**

- **PDF Export** - Production-ready PDF documents with embedded styles (`Cmd + Shift + P`)
- Exports include all formatting, tables, images, and styles
- Images automatically embedded as base64 for portability
- Choose custom save location for each export

### 🌓 **Native macOS Experience**

- **System Appearance** - Automatic dark/light mode following macOS settings
- **Native Menus** - Standard File, Edit, View, and Help menus
- **Keyboard Shortcuts** - Full keyboard navigation and commands
- **Window Management** - Native titlebar and traffic lights
- **Custom Tooltips** - Fast-appearing tooltips (0.3s delay) on all interactive elements

### 📊 **Live Statistics**

- Real-time word and character count in status bar
- Updates as you type without performance impact
- Accurate markdown-based counting

## Installation

### Prerequisites

- macOS 10.15 or later
- Node.js 18+ (Node.js 25+ recommended)
- npm or pnpm

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd makrdown-note-app

# Install dependencies
npm install

# Start development server with hot reload
npm run dev
```

### Building for Production

```bash
# Build the application
npm run build

# Package as macOS application (creates DMG and ZIP)
npm run build:mac

# Package for other platforms
npm run build:win    # Windows
npm run build:linux  # Linux
```

The built application will be in the `dist/` directory.

## Usage

### Getting Started

1. Launch MarkNotes - a `~/Documents/MarkNotes` folder is created automatically
2. Create your first note with `Cmd + N` or click the "New File" button
3. Start writing in WYSIWYG mode or switch to Code mode with `Cmd + 2`
4. Organize notes by creating folders with `Cmd + Shift + N`

### Working with Tables

1. Click the table icon in the formatting toolbar
2. A 3×3 table with headers is inserted at your cursor
3. Right-click any cell to access table operations
4. Add/remove rows and columns as needed
5. Tables work seamlessly across all modes and exports

### Working with Images

1. Click the image icon in the formatting toolbar
2. Choose an image file from your computer (JPG, PNG, GIF, SVG, WEBP)
3. Add optional alt text for accessibility
4. The image is automatically copied to `.assets/` folder and inserted
5. Right-click any image to resize, edit alt text, embed as base64, or remove
6. Images are preserved in HTML/PDF exports automatically
7. Use "Clean Up Unused Images" from the File menu to remove orphaned assets

### Creating Links and Table of Contents

1. Select text and press `Cmd + K` to insert a link
2. For internal navigation, use `#heading-id` format (e.g., `#introduction`)
3. Heading IDs are auto-generated from heading text in lowercase-hyphenated format
4. Cmd+Click to follow links in edit mode
5. External links (http/https) open in your default browser

### Exporting Documents

1. Press `Cmd + Shift + P` or click the PDF export button in the toolbar
2. Choose your save location in the file picker
3. Exported PDF includes all formatting, styles, and embedded images

## Keyboard Shortcuts

### File Operations

| Action         | Shortcut          |
| -------------- | ----------------- |
| New File       | `Cmd + N`         |
| New Folder     | `Cmd + Shift + N` |
| Save (manual)  | `Cmd + S`         |
| Toggle Sidebar | `Cmd + .`         |
| Close File     | `Cmd + W`         |

### View Modes

| Mode                   | Shortcut  |
| ---------------------- | --------- |
| WYSIWYG Mode (Edit)    | `Cmd + 1` |
| Code Mode (Split View) | `Cmd + 2` |

### Export

| Action        | Shortcut          |
| ------------- | ----------------- |
| Export as PDF | `Cmd + Shift + P` |

### Formatting (WYSIWYG Mode)

| Action          | Shortcut             |
| --------------- | -------------------- |
| Bold            | `Cmd + B`            |
| Italic          | `Cmd + I`            |
| Strikethrough   | `Cmd + Shift + X`    |
| Inline Code     | `Cmd + E`            |
| Insert Link     | `Cmd + K`            |
| Heading 1-6     | `Cmd + Option + 1-6` |
| Paragraph       | `Cmd + Option + 0`   |
| Numbered List   | `Cmd + Shift + 7`    |
| Bullet List     | `Cmd + Shift + 8`    |
| Task List       | `Cmd + Shift + 9`    |
| Increase Indent | `Tab`                |
| Decrease Indent | `Shift + Tab`        |
| Blockquote      | `Cmd + Shift + B`    |
| Code Block      | `Cmd + Option + C`   |
| Undo            | `Cmd + Z`            |
| Redo            | `Cmd + Shift + Z`    |

## Technical Stack

### Core Technologies

- **Electron** - Cross-platform desktop framework
- **React 18** - UI framework with hooks and modern patterns
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server via electron-vite
- **TipTap** - Headless WYSIWYG editor built on ProseMirror

### Key Libraries

- **State Management**: Zustand (lightweight, no boilerplate)
- **Markdown Parsing**: Marked.js with GFM support
- **Markdown Generation**: Turndown with custom table rules
- **Table Extensions**: @tiptap/extension-table suite
- **PDF Generation**: Electron's built-in printToPDF API
- **File System**: Node.js fs/promises with secure IPC
- **File Watching**: Chokidar for detecting external changes

## Architecture

### Project Structure

```
src/
├── main/                      # Electron Main Process (Node.js)
│   ├── index.ts              # Application lifecycle, window management
│   ├── fileSystem.ts         # File I/O operations, IPC handlers
│   └── menu.ts               # Native menu bar configuration
│
├── preload/                   # Preload Scripts (Context Bridge)
│   ├── index.ts              # Secure API exposure to renderer
│   └── index.d.ts            # TypeScript type declarations
│
└── renderer/                  # Renderer Process (React)
    └── src/
        ├── components/        # React Components
        │   ├── Editor.tsx    # Main editor with TipTap integration
        │   ├── Editor.css    # Editor and formatting styles
        │   ├── FileTree.tsx  # Sidebar file/folder browser
        │   ├── FileTree.css  # File tree styles
        │   ├── Toolbar.tsx   # Mode switcher and export controls
        │   ├── Toolbar.css   # Toolbar and tooltip styles
        │   ├── StatusBar.tsx # Word/character count display
        │   ├── LinkModal.tsx # Link insertion modal
        │   ├── ImageModal.tsx # Image insertion modal
        │   ├── ImageModal.css # Image modal styles
        │   └── CreateModal.tsx # File/folder creation modal
        │
        ├── hooks/
        │   └── useAutoSave.ts # Debounced auto-save logic
        │
        ├── store/
        │   └── useDocumentStore.ts # Zustand state management
        │
        ├── App.tsx           # Root component and layout
        ├── App.css           # Global styles and CSS variables
        └── main.tsx          # React entry point
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                          App.tsx                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                      Toolbar                          │  │
│  │  [View Mode Selector] [Export PDF] [Close]            │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌──────────┬────────────────────────────────────────────┐  │
│  │          │                                            │  │
│  │ FileTree │              Editor                        │  │
│  │          │  ┌──────────────────────────────────────┐  │  │
│  │ [Folders]│  │     FormattingToolbar                │  │  │
│  │ [Files]  │  │  [H1-H6] [B] [I] [Link] [Table]...   │  │  │
│  │          │  ├──────────────────────────────────────┤  │  │
│  │          │  │                                      │  │  │
│  │          │  │   WYSIWYG: TipTap Editor             │  │  │
│  │          │  │   Code: Markdown + Preview Split     │  │  │
│  │          │  │                                      │  │  │
│  │          │  └──────────────────────────────────────┘  │  │
│  └──────────┴────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    StatusBar                          │  │
│  │  Words: 123 | Characters: 456 | Auto-saved ✓          │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### IPC Communication Flow

```
┌──────────────────────┐                    ┌───────────────────────┐
│   Renderer Process   │                    │    Main Process       │
│     (React App)      │                    │     (Node.js)         │
├──────────────────────┤                    ├───────────────────────┤
│                      │                    │                       │
│  window.api.file     │  ─── invoke ────►  │ ipcMain.handle()      │
│   .list()            │                    │   'file:list'         │
│   .read()            │                    │   'file:read'         │
│   .write()           │                    │   'file:write'        │
│   .create()          │                    │   'file:create'       │
│   .delete()          │                    │   'file:delete'       │
│   .rename()          │                    │   'file:rename'       │
│   .move()            │                    │   'file:move'         │
│                      │                    │                       │
│  window.api.shell    │  ─── invoke ────►  │ ipcMain.handle()      │
│   .openExternal()    │                    │   'shell:openExternal'│
│                      │                    │                       │
│  window.api.export   │  ─── invoke ────►  │ ipcMain.handle()      │
│   .pdf()             │                    │   'export:pdf'        │
│                      │                    │                       │
│  window.api.image    │  ─── invoke ────►  │ ipcMain.handle()      │
│   .upload()          │                    │   'image:upload'      │
│   .embedBase64()     │                    │   'image:embedBase64' │
│   .cleanup()         │                    │   'image:cleanup'     │
│                      │                    │                       │
│  window.api.menu     │  ◄─── send ──────  │ webContents.send()    │
│   .onNewFile()       │                    │   'menu:new-file'     │
│   .onNewFolder()     │                    │   'menu:new-folder'   │
│   .onSave()          │                    │   'menu:save'         │
│   .onCleanupImages() │                    │   'menu:cleanupImages'│
│                      │                    │                       │
└──────────────────────┘                    └───────────────────────┘
           ▲                                          │
           │                                          │
           │         Preload Script                   │
           │         (context bridge)                 │
           └──────────────────────────────────────────┘
                  Security boundary
```

### Data Flow

1. **File Loading**: FileTree → window.api → IPC → Main Process → fs.readdir
2. **File Reading**: User clicks file → IPC → fs.readFile → Store → Editor
3. **Auto-Save**: Editor onChange → debounce → Store → IPC → fs.writeFile
4. **Export**: Toolbar button → generate HTML/PDF → IPC → dialog + save

## Development

### Running the App

```bash
# Development mode with hot reload
npm run dev

# The app will open automatically
# Changes to renderer code hot-reload instantly
# Changes to main process require restart
```

### Type Checking

```bash
# Check all TypeScript types
npm run typecheck

# Check main process only
npm run typecheck:node

# Check renderer process only
npm run typecheck:web
```

### Code Style

The project uses ESLint and Prettier (configured via ESLint):

```bash
# Lint all files
npm run lint

# Auto-fix linting issues
npm run lint -- --fix
```

### File Storage Details

- **Root Directory**: `~/Documents/MarkNotes/`
- **File Format**: Plain text `.md` files with UTF-8 encoding
- **Folder Structure**: Nested folders supported, follows filesystem hierarchy
- **Welcome Note**: Created on first launch with app instructions
- **Metadata**: No database, all info derived from filesystem

### Security Features

- **Context Isolation**: Enabled to prevent renderer access to Node.js
- **Node Integration**: Disabled in renderer for security
- **IPC Whitelist**: Only explicitly exposed APIs available
- **Path Validation**: All file paths validated to prevent traversal attacks
- **Sandbox Mode**: Renderer process runs in sandboxed environment

## Technical Decisions

### Why TipTap?

- **Rich Extension Ecosystem** - Official table, list, and formatting extensions
- **ProseMirror Foundation** - Robust, battle-tested document model
- **React-First API** - Hooks-based integration with React
- **Markdown Support** - Built-in markdown shortcuts and conversion
- **Active Development** - Regular updates and strong community

### Why Zustand Over Redux?

- **Minimal Boilerplate** - No actions, reducers, or complex setup
- **Built-in TypeScript** - Excellent type inference out of the box
- **No Context Providers** - Direct store access from any component
- **Performance** - Automatic shallow comparison prevents re-renders
- **Size** - Only 2KB, perfect for this application scale

### Why Local-First Architecture?

- **Privacy by Design** - No cloud, no accounts, no data collection
- **Instant Startup** - No network requests or authentication
- **Works Offline** - Full functionality without internet
- **Git-Friendly** - Plain markdown files work with version control
- **Data Ownership** - Users have complete control over their files
- **Portability** - Easy to backup, sync, or migrate notes

### Why Electron Over Other Options?

- **Native APIs** - Full access to filesystem, menus, and system integration
- **Cross-Platform** - Single codebase for macOS, Windows, and Linux
- **Web Technologies** - Leverage React, TypeScript, and modern tooling
- **Mature Ecosystem** - Extensive libraries and community support

## Customization

### Theming

Colors are defined as CSS variables in `src/renderer/src/App.css`:

```css
/* Light mode variables */
--bg-primary: #ffffff;
--text-primary: #1a1a1a;
--accent-color: #007aff;
/* ... more variables */
```

Dark mode automatically switches based on system preferences using `prefers-color-scheme: dark`.

### Default Fonts

- **Body Text**: -apple-system, SF Pro, 12pt
- **Headings**: SF Pro, 600 weight, 14-24pt
  - H1: 24pt, H2: 22pt, H3: 20pt, H4: 18pt, H5: 16pt, H6: 14pt
- **Code**: SF Mono, Monaco, Courier New

### Storage Location

To change the default storage location, modify `NOTES_DIR` in `src/main/fileSystem.ts`:

```typescript
const NOTES_DIR = join(homedir(), 'Documents', 'MarkNotes')
```

## Troubleshooting

### App Won't Start

- Verify Node.js version: `node --version` (should be 18+)
- Clear dependencies: `rm -rf node_modules package-lock.json && npm install`
- Check for port conflicts: default dev server uses port 5173

### Files Not Saving

- Check file permissions in `~/Documents/MarkNotes/`
- Look for errors in console: open DevTools with `Cmd + Option + I`
- Verify disk space availability

### Tables Not Rendering

- Ensure you're using GFM-compliant table syntax
- Tables need header row with separator: `| --- | --- |`
- Switch modes to refresh rendering: `Cmd + 2` then `Cmd + 1`

### Export Issues

- PDF export requires Chromium rendering engine (built into Electron)
- HTML export includes inline CSS for portability
- Check write permissions in target export directory

## Roadmap

Potential future features (contributions welcome):

- [ ] Multiple windows/tabs support
- [ ] Tag-based organization
- [ ] Full-text search across all notes
- [ ] Vim keybindings mode
- [ ] Custom CSS themes
- [ ] Cloud sync integration (optional)
- [ ] Collaborative editing
- [ ] Mobile companion app

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT License - see LICENSE file for details
