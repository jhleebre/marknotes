import { ipcMain, dialog, BrowserWindow, shell } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { marked } from 'marked'
import * as chokidar from 'chokidar'

const ROOT_PATH = path.join(os.homedir(), 'Documents', 'MarkNotes')
const ASSETS_PATH = path.join(ROOT_PATH, '.assets')
const METADATA_PATH = path.join(ASSETS_PATH, '.metadata.json')
let watcher: ReturnType<typeof chokidar.watch> | null = null

// Image metadata structure
interface ImageMetadata {
  references: string[] // Array of document paths that use this image
  uploadedAt: string
  size: number
}

interface AssetsMetadata {
  images: Record<string, ImageMetadata>
}

// Load or initialize metadata
async function loadMetadata(): Promise<AssetsMetadata> {
  try {
    const data = await fs.readFile(METADATA_PATH, 'utf-8')
    return JSON.parse(data)
  } catch {
    return { images: {} }
  }
}

// Save metadata
async function saveMetadata(metadata: AssetsMetadata): Promise<void> {
  await fs.writeFile(METADATA_PATH, JSON.stringify(metadata, null, 2), 'utf-8')
}

// Add image reference to metadata
async function addImageReference(imagePath: string, documentPath: string): Promise<void> {
  const metadata = await loadMetadata()
  const imageFilename = path.basename(imagePath)

  console.log(`[addImageReference] Image: ${imageFilename}, Document: ${documentPath}`)

  if (!metadata.images[imageFilename]) {
    // Image not in metadata yet, check if file exists
    const imageFilePath = path.join(ASSETS_PATH, imageFilename)
    try {
      const stats = await fs.stat(imageFilePath)
      metadata.images[imageFilename] = {
        references: [documentPath],
        uploadedAt: new Date().toISOString(),
        size: stats.size
      }
      console.log(`[addImageReference] New image entry created`)
    } catch {
      console.log(`[addImageReference] Image file does not exist: ${imageFilename}, skipping`)
      return // File doesn't exist, don't add to metadata
    }
  } else {
    // Add reference if not already present
    if (!metadata.images[imageFilename].references.includes(documentPath)) {
      metadata.images[imageFilename].references.push(documentPath)
      console.log(
        `[addImageReference] Reference added, total refs: ${metadata.images[imageFilename].references.length}`
      )
    } else {
      console.log(`[addImageReference] Reference already exists, skipping`)
    }
  }

  await saveMetadata(metadata)
}

// Remove image reference from metadata
async function removeImageReference(imagePath: string, documentPath: string): Promise<void> {
  const metadata = await loadMetadata()
  const imageFilename = path.basename(imagePath)

  console.log(`[removeImageReference] Image: ${imageFilename}, Document: ${documentPath}`)

  if (metadata.images[imageFilename]) {
    const beforeLength = metadata.images[imageFilename].references.length
    // Remove this document from references
    metadata.images[imageFilename].references = metadata.images[imageFilename].references.filter(
      (ref) => ref !== documentPath
    )
    const afterLength = metadata.images[imageFilename].references.length

    console.log(
      `[removeImageReference] References before: ${beforeLength}, after: ${afterLength}, refs: ${JSON.stringify(metadata.images[imageFilename].references)}`
    )

    // Note: We don't delete the file immediately even if references reach 0
    // This allows cut/paste operations to work correctly
    // Files with 0 references will be cleaned up:
    // - On app quit
    // - When closing files
    // - Via manual "Clean Up Unused Images" menu option
    if (metadata.images[imageFilename].references.length === 0) {
      console.log(
        `[removeImageReference] No more references for ${imageFilename}, will be cleaned up later`
      )
    } else {
      console.log(
        `[removeImageReference] Still has ${metadata.images[imageFilename].references.length} reference(s)`
      )
    }

    await saveMetadata(metadata)
  }
}

// Update image references for a document based on its content
async function updateDocumentImageReferences(documentPath: string, content: string): Promise<void> {
  const metadata = await loadMetadata()

  // Find all .assets images in the content
  const imagePattern = /!\[([^\]]*)\]\(\.assets\/([^)]+)\)/g
  const referencedImages = new Set<string>()
  let match

  while ((match = imagePattern.exec(content)) !== null) {
    referencedImages.add(match[2]) // filename
  }

  // Check existing metadata entries for removed references
  for (const [imageFilename, imageData] of Object.entries(metadata.images)) {
    const wasReferenced = imageData.references.includes(documentPath)
    const isReferenced = referencedImages.has(imageFilename)

    if (wasReferenced && !isReferenced) {
      // Image was removed from this document
      await removeImageReference(`.assets/${imageFilename}`, documentPath)
    } else if (!wasReferenced && isReferenced) {
      // Image was added to this document (already in metadata, just adding reference)
      await addImageReference(`.assets/${imageFilename}`, documentPath)
    }
  }

  // Add new images that are referenced but not yet in metadata
  for (const imageFilename of referencedImages) {
    if (!metadata.images[imageFilename]) {
      // New image referenced in document
      await addImageReference(`.assets/${imageFilename}`, documentPath)
    }
  }
}

// Clean up all image references for a deleted document
async function cleanupDocumentImages(documentPath: string): Promise<void> {
  const metadata = await loadMetadata()
  const imagesToCleanup: string[] = []

  // Find all images referenced by this document
  for (const [imageFilename, imageData] of Object.entries(metadata.images)) {
    if (imageData.references.includes(documentPath)) {
      imagesToCleanup.push(imageFilename)
    }
  }

  // Remove references
  for (const imageFilename of imagesToCleanup) {
    await removeImageReference(`.assets/${imageFilename}`, documentPath)
  }
}

// Clean up image references for all markdown files in a directory
async function cleanupDirectoryImages(dirPath: string): Promise<void> {
  async function scanDir(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        await scanDir(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const relativePath = path.relative(ROOT_PATH, fullPath)
        await cleanupDocumentImages(relativePath)
      }
    }
  }

  await scanDir(dirPath)
}

// Quick cleanup: Delete files with 0 references in metadata
// This is faster than validateAndCleanupMetadata and suitable for app quit
async function cleanupUnreferencedFiles(): Promise<number> {
  const metadata = await loadMetadata()
  let cleanedCount = 0

  for (const [imageFilename, imageData] of Object.entries(metadata.images)) {
    if (imageData.references.length === 0) {
      const imageFilePath = path.join(ASSETS_PATH, imageFilename)
      try {
        await fs.unlink(imageFilePath)
        delete metadata.images[imageFilename]
        console.log(`[cleanupUnreferencedFiles] Deleted: ${imageFilename}`)
        cleanedCount++
      } catch (error) {
        console.error(`[cleanupUnreferencedFiles] Failed to delete: ${imageFilename}`, error)
      }
    }
  }

  if (cleanedCount > 0) {
    await saveMetadata(metadata)
  }

  return cleanedCount
}

// Scan all documents and rebuild metadata (for validation/recovery)
async function validateAndCleanupMetadata(): Promise<{ cleaned: number; validated: number }> {
  const metadata = await loadMetadata()
  const allImageRefs = new Map<string, Set<string>>() // imageFilename -> Set of document paths

  // Scan all .md files
  async function scanDirectory(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        await scanDirectory(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        // Read file and find image references
        const content = await fs.readFile(fullPath, 'utf-8')
        const imagePattern = /!\[([^\]]*)\]\(\.assets\/([^)]+)\)/g
        let match

        while ((match = imagePattern.exec(content)) !== null) {
          const imageFilename = match[2]
          if (!allImageRefs.has(imageFilename)) {
            allImageRefs.set(imageFilename, new Set())
          }
          // Store relative path from ROOT_PATH
          const relativePath = path.relative(ROOT_PATH, fullPath)
          allImageRefs.get(imageFilename)!.add(relativePath)
        }
      }
    }
  }

  await scanDirectory(ROOT_PATH)

  // Update metadata based on scan
  const newMetadata: AssetsMetadata = { images: {} }
  let cleanedCount = 0
  let validatedCount = 0

  // Check all files in .assets
  const assetFiles = await fs.readdir(ASSETS_PATH)
  for (const filename of assetFiles) {
    if (filename === '.metadata.json' || filename.startsWith('.')) continue

    const refs = allImageRefs.get(filename)
    if (refs && refs.size > 0) {
      // Image is referenced, keep it
      const stats = await fs.stat(path.join(ASSETS_PATH, filename))
      newMetadata.images[filename] = {
        references: Array.from(refs),
        uploadedAt: metadata.images[filename]?.uploadedAt || new Date().toISOString(),
        size: stats.size
      }
      validatedCount++
    } else {
      // Image is not referenced, delete it
      try {
        await fs.unlink(path.join(ASSETS_PATH, filename))
        console.log(`Cleaned up unreferenced image: ${filename}`)
        cleanedCount++
      } catch (error) {
        console.error(`Failed to delete unreferenced image: ${filename}`, error)
      }
    }
  }

  await saveMetadata(newMetadata)
  return { cleaned: cleanedCount, validated: validatedCount }
}

// Configure marked for GFM and heading IDs
marked.setOptions({
  gfm: true,
  breaks: false
})

// Add custom renderer for headings with IDs and images with wrappers
const renderer = new marked.Renderer()
renderer.heading = function ({ text, depth, tokens }) {
  // Extract plain text from tokens for ID generation
  const raw = tokens ? tokens.map((t) => t.raw || '').join('') : text

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

// Custom image renderer - wrap in div for size class support
renderer.image = function ({ href, title, text }) {
  const alt = text || ''
  const src = href || ''
  const titleAttr = title ? ` title="${title}"` : ''

  // Don't wrap in div yet - size will be added by postProcessImageSizes
  return `<img src="${src}" alt="${alt}"${titleAttr}>`
}

// Custom table cell renderer to apply alignment from markdown
renderer.tablecell = function (token) {
  const text = token.text
  const type = token.header ? 'th' : 'td'
  const align = token.align
  const style = align ? ` style="text-align: ${align}"` : ''
  return `<${type}${style}>${text}</${type}>\n`
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
    // Create empty metadata file
    const initialMetadata: AssetsMetadata = { images: {} }
    await fs.writeFile(METADATA_PATH, JSON.stringify(initialMetadata, null, 2), 'utf-8')
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

// Image helper functions
function sanitizeFilename(name: string): string {
  // Remove path components and replace special chars with underscores
  const basename = path.basename(name)
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function generateImageFilename(originalName: string): string {
  const timestamp = Date.now()
  const sanitized = sanitizeFilename(originalName)
  return `${timestamp}_${sanitized}`
}

function getImageMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp'
  }
  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream'
}

const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp']
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB

// Helper function to post-process image sizes from HTML comments
function postProcessImageSizes(html: string): string {
  // Find images followed by size comments
  const pattern = /<img([^>]*)><!--\s*size:(\w+)\s*-->/g

  return html.replace(pattern, (_match, imgAttrs, size) => {
    return `<div class="image-wrapper image-size-${size}" data-size="${size}"><img${imgAttrs}></div>`
  })
}

// Helper function to embed images as base64 in HTML
async function embedImagesInHtml(html: string): Promise<string> {
  // Find all img tags with .assets paths (including those in wrapper divs)
  const imgPattern = /<img([^>]*?)src=["']\.assets\/([^"']+)["']([^>]*?)>/g
  const matches = [...html.matchAll(imgPattern)]

  let result = html
  for (const match of matches) {
    const [fullMatch, beforeSrc, filename, afterSrc] = match
    const imagePath = path.join(ASSETS_PATH, filename)

    try {
      // Check if file exists
      await fs.access(imagePath)

      // Read and convert to base64
      const buffer = await fs.readFile(imagePath)
      const ext = path.extname(imagePath)
      const mimeType = getImageMimeType(ext)
      const base64 = buffer.toString('base64')
      const dataUrl = `data:${mimeType};base64,${base64}`

      // Replace in HTML
      const newImg = `<img${beforeSrc}src="${dataUrl}"${afterSrc}>`
      result = result.replace(fullMatch, newImg)
    } catch (error) {
      // If image not found, leave as is or replace with placeholder
      console.error(`Failed to embed image: ${filename}`, error)
    }
  }

  return result
}

// Export cleanup function for app quit
export async function cleanupOnQuit(): Promise<void> {
  console.log('[Cleanup] Running cleanup on app quit...')
  const count = await cleanupUnreferencedFiles()
  console.log(`[Cleanup] Deleted ${count} unreferenced image(s)`)
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

        // Update image references for this document
        if (resolvedPath.endsWith('.md')) {
          const relativePath = path.relative(ROOT_PATH, resolvedPath)
          await updateDocumentImageReferences(relativePath, content)
        }

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
  ipcMain.handle(
    'file:create',
    async (_, fileName: string, dirPath?: string): Promise<FileResult> => {
      try {
        const targetDir = dirPath || ROOT_PATH
        const resolvedDir = path.resolve(targetDir)
        if (!resolvedDir.startsWith(ROOT_PATH)) {
          return { success: false, error: 'Access denied: path outside root directory' }
        }

        const filePath = path.join(
          resolvedDir,
          fileName.endsWith('.md') ? fileName : `${fileName}.md`
        )

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
    }
  )

  // Create folder
  ipcMain.handle(
    'file:createFolder',
    async (_, folderName: string, parentPath?: string): Promise<FileResult> => {
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
    }
  )

  // Delete file or folder
  ipcMain.handle('file:delete', async (_, filePath: string): Promise<FileResult> => {
    try {
      const resolvedPath = path.resolve(filePath)
      if (!resolvedPath.startsWith(ROOT_PATH)) {
        return { success: false, error: 'Access denied: path outside root directory' }
      }

      const stats = await fs.stat(resolvedPath)

      // If deleting a markdown file, cleanup its image references
      if (!stats.isDirectory() && resolvedPath.endsWith('.md')) {
        const relativePath = path.relative(ROOT_PATH, resolvedPath)
        await cleanupDocumentImages(relativePath)
      }

      // If deleting a directory, cleanup all markdown files in it
      if (stats.isDirectory()) {
        await cleanupDirectoryImages(resolvedPath)
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
  ipcMain.handle(
    'file:rename',
    async (_, oldPath: string, newName: string): Promise<FileResult> => {
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
    }
  )

  // Export to PDF
  ipcMain.handle(
    'export:pdf',
    async (_, markdown: string, defaultName: string): Promise<FileResult> => {
      try {
        let html = await marked(markdown)
        // Process image sizes from comments
        html = postProcessImageSizes(html)
        // Embed images as base64
        html = await embedImagesInHtml(html)
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
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 1em auto;
      border-radius: 4px;
    }
    .image-wrapper {
      display: block;
      margin: 1em 0;
      text-align: center;
    }
    .image-size-small img { max-width: 300px; }
    .image-size-medium img { max-width: 600px; }
    .image-size-large img { max-width: 900px; }
    .image-size-original img { max-width: 100%; }
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
    }
  )

  // Setup file watcher
  ipcMain.handle('file:watch', async (): Promise<FileResult> => {
    try {
      if (watcher) {
        await watcher.close()
      }

      await ensureRootDirectory()

      watcher = chokidar.watch(ROOT_PATH, {
        ignored: /(^|[/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true
      })

      watcher
        .on('add', () => mainWindow.webContents.send('file:changed'))
        .on('unlink', () => mainWindow.webContents.send('file:changed'))
        .on('addDir', () => mainWindow.webContents.send('file:changed'))
        .on('unlinkDir', () => mainWindow.webContents.send('file:changed'))
        .on('change', (changedPath) =>
          mainWindow.webContents.send('file:externalChange', changedPath)
        )

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
  ipcMain.handle(
    'file:move',
    async (_, sourcePath: string, targetDir: string): Promise<FileResult> => {
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
          return {
            success: false,
            error: 'A file or folder with the same name already exists in the target location'
          }
        } catch {
          // Target doesn't exist, we can move
        }

        await fs.rename(resolvedSource, newPath)
        return { success: true, content: newPath }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }
  )

  // Open external URL
  ipcMain.handle('shell:openExternal', async (_, url: string): Promise<void> => {
    try {
      await shell.openExternal(url)
    } catch (error) {
      console.error('Failed to open external URL:', error)
    }
  })

  // Show in Finder (Reveal file/folder in file manager)
  ipcMain.handle('shell:showInFinder', async (_, filePath: string): Promise<FileResult> => {
    try {
      const resolvedPath = path.resolve(filePath)
      if (!resolvedPath.startsWith(ROOT_PATH)) {
        return { success: false, error: 'Access denied: path outside root directory' }
      }

      shell.showItemInFolder(resolvedPath)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Copy path to clipboard
  ipcMain.handle('shell:copyPath', async (_, filePath: string): Promise<FileResult> => {
    try {
      const resolvedPath = path.resolve(filePath)
      if (!resolvedPath.startsWith(ROOT_PATH)) {
        return { success: false, error: 'Access denied: path outside root directory' }
      }

      const { clipboard } = await import('electron')
      clipboard.writeText(resolvedPath)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Duplicate file
  ipcMain.handle('file:duplicate', async (_, filePath: string): Promise<FileResult> => {
    try {
      const resolvedPath = path.resolve(filePath)
      if (!resolvedPath.startsWith(ROOT_PATH)) {
        return { success: false, error: 'Access denied: path outside root directory' }
      }

      // Check if source file exists
      try {
        await fs.access(resolvedPath)
      } catch {
        return { success: false, error: 'Source file not found' }
      }

      // Generate new name
      const dir = path.dirname(resolvedPath)
      const ext = path.extname(resolvedPath)
      const base = path.basename(resolvedPath, ext)

      // Try name_copy first
      let newPath = path.join(dir, `${base}_copy${ext}`)
      let counter = 2

      // If name_copy exists, try name_copy_2, name_copy_3, etc.
      while (true) {
        try {
          await fs.access(newPath)
          // File exists, try next number
          newPath = path.join(dir, `${base}_copy_${counter}${ext}`)
          counter++
        } catch {
          // File doesn't exist, we can use this name
          break
        }
      }

      // Copy file
      await fs.copyFile(resolvedPath, newPath)

      // If it's a markdown file, copy its content without image references
      // (image references will remain as-is, pointing to the same images)

      return { success: true, content: newPath }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Image: Upload file
  ipcMain.handle('image:upload', async (): Promise<FileResult> => {
    try {
      await ensureRootDirectory()

      const { filePaths, canceled } = await dialog.showOpenDialog({
        title: 'Select Image',
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'] }],
        properties: ['openFile']
      })

      if (canceled || !filePaths || filePaths.length === 0) {
        return { success: false, error: 'Upload cancelled' }
      }

      const sourcePath = filePaths[0]
      const ext = path.extname(sourcePath)

      // Validate file extension
      if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext.toLowerCase())) {
        return { success: false, error: 'Invalid image file type' }
      }

      // Check file size
      const stats = await fs.stat(sourcePath)
      if (stats.size > MAX_IMAGE_SIZE) {
        return { success: false, error: 'Image file too large (max 10MB)' }
      }

      // Generate unique filename and copy to .assets
      const originalName = path.basename(sourcePath)
      const newFilename = generateImageFilename(originalName)
      const targetPath = path.join(ASSETS_PATH, newFilename)

      await fs.copyFile(sourcePath, targetPath)

      // Return relative path
      const relativePath = `.assets/${newFilename}`
      return { success: true, content: relativePath }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Image: Embed as base64
  ipcMain.handle('image:embedBase64', async (_, imagePath: string): Promise<FileResult> => {
    try {
      // Handle relative .assets paths
      let fullPath: string
      if (imagePath.startsWith('.assets/')) {
        fullPath = path.join(ROOT_PATH, imagePath)
      } else {
        fullPath = path.resolve(imagePath)
      }

      // Security check
      if (!fullPath.startsWith(ASSETS_PATH) && !fullPath.startsWith(ROOT_PATH)) {
        return { success: false, error: 'Access denied: path outside root directory' }
      }

      const ext = path.extname(fullPath)
      if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext.toLowerCase())) {
        return { success: false, error: 'Invalid image file type' }
      }

      // Check file size warning for large embeds
      const stats = await fs.stat(fullPath)
      if (stats.size > 1024 * 1024) {
        // > 1MB
        return {
          success: false,
          error: 'Image is larger than 1MB. Embedding will significantly increase document size.'
        }
      }

      // Read and convert to base64
      const buffer = await fs.readFile(fullPath)
      const base64 = buffer.toString('base64')
      const mimeType = getImageMimeType(ext)
      const dataUrl = `data:${mimeType};base64,${base64}`

      return { success: true, content: dataUrl }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Image: Resolve .assets path to data URL for display
  ipcMain.handle('image:resolveAssetPath', async (_, imagePath: string): Promise<FileResult> => {
    try {
      // Only handle .assets paths
      if (!imagePath.startsWith('.assets/')) {
        // If it's already a URL or data URL, return as-is
        if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
          return { success: true, content: imagePath }
        }
        return { success: false, error: 'Invalid path format' }
      }

      const fullPath = path.join(ROOT_PATH, imagePath)

      // Security check
      if (!fullPath.startsWith(ASSETS_PATH)) {
        return { success: false, error: 'Access denied: path outside assets directory' }
      }

      // Check if file exists
      try {
        await fs.access(fullPath)
      } catch {
        return { success: false, error: 'Image file not found' }
      }

      const ext = path.extname(fullPath)
      if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext.toLowerCase())) {
        return { success: false, error: 'Invalid image file type' }
      }

      // Read and convert to base64
      const buffer = await fs.readFile(fullPath)
      const base64 = buffer.toString('base64')
      const mimeType = getImageMimeType(ext)
      const dataUrl = `data:${mimeType};base64,${base64}`

      return { success: true, content: dataUrl }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Image: Save base64 image to .assets folder
  ipcMain.handle(
    'image:saveBase64',
    async (_, filename: string, base64Data: string): Promise<FileResult> => {
      try {
        await ensureRootDirectory()

        // Sanitize filename
        const sanitized = sanitizeFilename(filename)
        const timestamp = Date.now()
        const finalFilename = `${timestamp}_${sanitized}`
        const targetPath = path.join(ASSETS_PATH, finalFilename)

        // Convert base64 to buffer
        const buffer = Buffer.from(base64Data, 'base64')

        // Check file size
        if (buffer.length > MAX_IMAGE_SIZE) {
          return { success: false, error: 'Image file too large (max 10MB)' }
        }

        // Save file
        await fs.writeFile(targetPath, buffer)

        // Return relative path
        const relativePath = `.assets/${finalFilename}`
        return { success: true, content: relativePath }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }
  )

  // Image: Cleanup unused images
  ipcMain.handle('image:cleanup', async (): Promise<FileResult> => {
    try {
      const result = await validateAndCleanupMetadata()
      return {
        success: true,
        content: `Cleaned up ${result.cleaned} unused images. Validated ${result.validated} images.`
      }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })
}
