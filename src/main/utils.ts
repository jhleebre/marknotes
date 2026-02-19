import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { ROOT_DIR_NAME } from '../shared/constants'

export const ROOT_PATH = path.join(os.homedir(), 'Documents', ROOT_DIR_NAME)
export const ASSETS_PATH = path.join(ROOT_PATH, '.assets')
export const METADATA_PATH = path.join(ASSETS_PATH, '.metadata.json')

export function validatePath(filePath: string): boolean {
  const resolvedPath = path.resolve(filePath)
  return resolvedPath === ROOT_PATH || resolvedPath.startsWith(ROOT_PATH + path.sep)
}

export async function ensureRootDirectory(): Promise<void> {
  try {
    await fs.access(ROOT_PATH)
  } catch {
    await fs.mkdir(ROOT_PATH, { recursive: true })
    // Create a welcome file
    const welcomeContent = `# Welcome to MarkNotes

Your notes, your files, your control. Start writing below!

## Getting Started

1. Press **Cmd+N** or click the **New File** button in the title bar to create a note
2. Start typing — format text using the toolbar buttons or keyboard shortcuts
3. Your changes are **auto-saved** after 5 seconds of inactivity (or press **Cmd+S** to save immediately)

## Key Features

- **WYSIWYG Editing** — Write visually like a word processor, no syntax to remember
- **Code Mode** — Press **Cmd+2** to see raw markdown side-by-side with a live preview
- **Rich Formatting** — Headings, bold, italic, lists, tables, code blocks, blockquotes, links, and images
- **Tables** — Insert tables from the toolbar, right-click to add rows/columns and change alignment
- **Image Support** — Insert images from the toolbar, resize with right-click, auto-organized in \`.assets/\`
- **PDF Export** — Press **Cmd+Shift+P** to export your note as a beautifully formatted PDF
- **Folders** — Organize notes with nested folders, drag and drop to rearrange
- **Dark Mode** — Automatically follows your system appearance

## Useful Shortcuts

| Action | Shortcut |
| --- | --- |
| New File | Cmd+N |
| New Folder | Cmd+Shift+N |
| Save | Cmd+S |
| Bold | Cmd+B |
| Italic | Cmd+I |
| Insert Link | Cmd+K |
| Toggle Sidebar | Cmd+. |
| Edit Mode | Cmd+1 |
| Code Mode | Cmd+2 |
| Export PDF | Cmd+Shift+P |

All your notes are stored as plain markdown files in \`~/Documents/MarkNotes/\`. No accounts, no cloud — just your files.

Happy writing!
`
    await fs.writeFile(path.join(ROOT_PATH, 'Welcome.md'), welcomeContent, 'utf-8')
  }

  // Ensure .assets folder exists
  try {
    await fs.access(ASSETS_PATH)
  } catch {
    await fs.mkdir(ASSETS_PATH, { recursive: true })
  }

  // Ensure metadata file exists
  try {
    await fs.access(METADATA_PATH)
  } catch {
    const initialMetadata = { images: {} }
    await fs.writeFile(METADATA_PATH, JSON.stringify(initialMetadata, null, 2), 'utf-8')
  }
}
