import { ipcMain, dialog, BrowserWindow, shell } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { marked } from 'marked'
import * as chokidar from 'chokidar'

const ROOT_PATH = path.join(os.homedir(), 'Documents', 'MarkNotes')
let watcher: ReturnType<typeof chokidar.watch> | null = null

// Configure marked for GFM and heading IDs
marked.setOptions({
  gfm: true,
  breaks: false
})

// Add custom renderer for headings with IDs
const renderer = new marked.Renderer()
renderer.heading = function({ text, depth, tokens }) {
  // Extract plain text from tokens for ID generation
  const raw = tokens ? tokens.map(t => t.raw || '').join('') : text

  // Generate ID manually
  const id = raw
    .toLowerCase()
    .trim()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w\s가-힣-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `<h${depth} id="${id}">${text}</h${depth}>\n`
}

marked.use({ renderer })

export interface FileEntry {
  name: string
  isDirectory: boolean
  path: string
  children?: FileEntry[]
}

export interface FileResult {
  success: boolean
  content?: string
  files?: FileEntry[]
  error?: string
}

async function ensureRootDirectory(): Promise<void> {
  try {
    await fs.access(ROOT_PATH)
  } catch {
    await fs.mkdir(ROOT_PATH, { recursive: true })
    // Create a welcome file
    const welcomeContent = `# Welcome to MarkNotes

This is your first note. Start writing in **Markdown**!

## Features

- **WYSIWYG editing** - Edit with rich text formatting
- **Markdown mode** - View and edit raw markdown
- **Auto-save** - Your changes are saved automatically
- **Export** - Export to HTML or PDF

## Getting Started

1. Create a new file using the + button in the sidebar
2. Start typing your notes
3. Use the toolbar to format text
4. Press Cmd+S to save manually

Happy writing!
`
    await fs.writeFile(path.join(ROOT_PATH, 'Welcome.md'), welcomeContent, 'utf-8')
  }
}

async function buildFileTree(dirPath: string): Promise<FileEntry[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const result: FileEntry[] = []

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue // Skip hidden files

    const entryPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      const children = await buildFileTree(entryPath)
      result.push({
        name: entry.name,
        isDirectory: true,
        path: entryPath,
        children
      })
    } else if (entry.name.endsWith('.md')) {
      result.push({
        name: entry.name,
        isDirectory: false,
        path: entryPath
      })
    }
  }

  // Sort: folders first, then files, both alphabetically
  return result.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1
    if (!a.isDirectory && b.isDirectory) return 1
    return a.name.localeCompare(b.name)
  })
}

export function setupFileHandlers(mainWindow: BrowserWindow): void {
  // Get root path
  ipcMain.handle('file:getRootPath', () => {
    return ROOT_PATH
  })

  // Read file
  ipcMain.handle('file:read', async (_, filePath: string): Promise<FileResult> => {
    try {
      // Security: ensure path is within ROOT_PATH
      const resolvedPath = path.resolve(filePath)
      if (!resolvedPath.startsWith(ROOT_PATH)) {
        return { success: false, error: 'Access denied: path outside root directory' }
      }

      const content = await fs.readFile(resolvedPath, 'utf-8')
      return { success: true, content }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Write file
  ipcMain.handle(
    'file:write',
    async (_, filePath: string, content: string): Promise<FileResult> => {
      try {
        const resolvedPath = path.resolve(filePath)
        if (!resolvedPath.startsWith(ROOT_PATH)) {
          return { success: false, error: 'Access denied: path outside root directory' }
        }

        // Ensure directory exists
        await fs.mkdir(path.dirname(resolvedPath), { recursive: true })
        await fs.writeFile(resolvedPath, content, 'utf-8')
        return { success: true }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }
  )

  // List files (build tree)
  ipcMain.handle('file:list', async (): Promise<FileResult> => {
    try {
      await ensureRootDirectory()
      const files = await buildFileTree(ROOT_PATH)
      return { success: true, files }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Create file
  ipcMain.handle('file:create', async (_, fileName: string, dirPath?: string): Promise<FileResult> => {
    try {
      const targetDir = dirPath || ROOT_PATH
      const resolvedDir = path.resolve(targetDir)
      if (!resolvedDir.startsWith(ROOT_PATH)) {
        return { success: false, error: 'Access denied: path outside root directory' }
      }

      const filePath = path.join(resolvedDir, fileName.endsWith('.md') ? fileName : `${fileName}.md`)

      // Check if file exists
      try {
        await fs.access(filePath)
        return { success: false, error: 'File already exists' }
      } catch {
        // File doesn't exist, we can create it
      }

      await fs.writeFile(filePath, `# ${fileName.replace('.md', '')}\n\n`, 'utf-8')
      return { success: true, content: filePath }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Create folder
  ipcMain.handle('file:createFolder', async (_, folderName: string, parentPath?: string): Promise<FileResult> => {
    try {
      const targetDir = parentPath || ROOT_PATH
      const resolvedPath = path.resolve(targetDir, folderName)
      if (!resolvedPath.startsWith(ROOT_PATH)) {
        return { success: false, error: 'Access denied: path outside root directory' }
      }

      await fs.mkdir(resolvedPath, { recursive: true })
      return { success: true, content: resolvedPath }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Delete file or folder
  ipcMain.handle('file:delete', async (_, filePath: string): Promise<FileResult> => {
    try {
      const resolvedPath = path.resolve(filePath)
      if (!resolvedPath.startsWith(ROOT_PATH)) {
        return { success: false, error: 'Access denied: path outside root directory' }
      }

      const stats = await fs.stat(resolvedPath)
      if (stats.isDirectory()) {
        await fs.rm(resolvedPath, { recursive: true })
      } else {
        await fs.unlink(resolvedPath)
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Rename file or folder
  ipcMain.handle('file:rename', async (_, oldPath: string, newName: string): Promise<FileResult> => {
    try {
      const resolvedOldPath = path.resolve(oldPath)
      if (!resolvedOldPath.startsWith(ROOT_PATH)) {
        return { success: false, error: 'Access denied: path outside root directory' }
      }

      const newPath = path.join(path.dirname(resolvedOldPath), newName)
      await fs.rename(resolvedOldPath, newPath)
      return { success: true, content: newPath }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Export to HTML
  ipcMain.handle('export:html', async (_, markdown: string, defaultName: string): Promise<FileResult> => {
    try {
      const html = await marked(markdown)
      const template = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${defaultName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.6;
      color: #333;
      font-size: 12pt;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: 600;
    }
    h1 { font-size: 24pt; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
    h2 { font-size: 22pt; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
    h3 { font-size: 20pt; }
    h4 { font-size: 18pt; }
    h5 { font-size: 16pt; }
    h6 { font-size: 14pt; }
    p { font-size: 12pt; }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      font-size: 0.9em;
    }
    pre {
      background: #f4f4f4;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
    }
    pre code {
      background: none;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid #ddd;
      margin: 0;
      padding-left: 16px;
      color: #666;
    }
    a { color: #0066cc; }
    img { max-width: 100%; }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px 12px;
      text-align: left;
    }
    th { background: #f4f4f4; }
  </style>
</head>
<body>
${html}
</body>
</html>`

      const { filePath, canceled } = await dialog.showSaveDialog({
        defaultPath: `${defaultName.replace('.md', '')}.html`,
        filters: [{ name: 'HTML', extensions: ['html'] }]
      })

      if (canceled || !filePath) {
        return { success: false, error: 'Export cancelled' }
      }

      await fs.writeFile(filePath, template, 'utf-8')
      return { success: true, content: filePath }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Export to PDF
  ipcMain.handle('export:pdf', async (_, markdown: string, defaultName: string): Promise<FileResult> => {
    try {
      const html = await marked(markdown)
      const template = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 100%;
      padding: 20px;
      line-height: 1.6;
      color: #333;
      font-size: 12pt;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: 600;
    }
    h1 { font-size: 24pt; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
    h2 { font-size: 22pt; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
    h3 { font-size: 20pt; }
    h4 { font-size: 18pt; }
    h5 { font-size: 16pt; }
    h6 { font-size: 14pt; }
    p { font-size: 12pt; }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      font-size: 0.9em;
    }
    pre {
      background: #f4f4f4;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
    }
    pre code { background: none; padding: 0; }
    blockquote {
      border-left: 4px solid #ddd;
      margin: 0;
      padding-left: 16px;
      color: #666;
    }
    a { color: #0066cc; }
    img { max-width: 100%; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f4f4f4; }
  </style>
  <script>
    // Handle link clicks
    document.addEventListener('DOMContentLoaded', function() {
      document.addEventListener('click', function(e) {
        if (e.target.tagName === 'A') {
          const href = e.target.getAttribute('href');
          if (href && href.startsWith('#')) {
            e.preventDefault();
            const targetId = href.substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
              targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        }
      });
    });
  </script>
</head>
<body>
${html}
</body>
</html>`

      const { filePath, canceled } = await dialog.showSaveDialog({
        defaultPath: `${defaultName.replace('.md', '')}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      })

      if (canceled || !filePath) {
        return { success: false, error: 'Export cancelled' }
      }

      // Create hidden window for PDF generation
      const pdfWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(template)}`)

      const pdfBuffer = await pdfWindow.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        margins: {
          top: 0.5,
          bottom: 0.5,
          left: 0.5,
          right: 0.5
        }
      })

      pdfWindow.close()

      await fs.writeFile(filePath, pdfBuffer)
      return { success: true, content: filePath }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Setup file watcher
  ipcMain.handle('file:watch', async (): Promise<FileResult> => {
    try {
      if (watcher) {
        await watcher.close()
      }

      await ensureRootDirectory()

      watcher = chokidar.watch(ROOT_PATH, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true
      })

      watcher
        .on('add', () => mainWindow.webContents.send('file:changed'))
        .on('unlink', () => mainWindow.webContents.send('file:changed'))
        .on('addDir', () => mainWindow.webContents.send('file:changed'))
        .on('unlinkDir', () => mainWindow.webContents.send('file:changed'))
        .on('change', (changedPath) => mainWindow.webContents.send('file:externalChange', changedPath))

      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Stop file watcher
  ipcMain.handle('file:unwatch', async (): Promise<FileResult> => {
    try {
      if (watcher) {
        await watcher.close()
        watcher = null
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Check if path exists
  ipcMain.handle('file:exists', async (_, filePath: string): Promise<boolean> => {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  })

  // Move file or folder to a new location
  ipcMain.handle('file:move', async (_, sourcePath: string, targetDir: string): Promise<FileResult> => {
    try {
      const resolvedSource = path.resolve(sourcePath)
      const resolvedTarget = path.resolve(targetDir)

      if (!resolvedSource.startsWith(ROOT_PATH)) {
        return { success: false, error: 'Access denied: source path outside root directory' }
      }
      if (!resolvedTarget.startsWith(ROOT_PATH)) {
        return { success: false, error: 'Access denied: target path outside root directory' }
      }

      // Prevent moving a folder into itself
      if (resolvedTarget.startsWith(resolvedSource + path.sep)) {
        return { success: false, error: 'Cannot move a folder into itself' }
      }

      const fileName = path.basename(resolvedSource)
      const newPath = path.join(resolvedTarget, fileName)

      // Check if target already exists
      try {
        await fs.access(newPath)
        return { success: false, error: 'A file or folder with the same name already exists in the target location' }
      } catch {
        // Target doesn't exist, we can move
      }

      await fs.rename(resolvedSource, newPath)
      return { success: true, content: newPath }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Open external URL
  ipcMain.handle('shell:openExternal', async (_, url: string): Promise<void> => {
    try {
      await shell.openExternal(url)
    } catch (error) {
      console.error('Failed to open external URL:', error)
    }
  })
}
