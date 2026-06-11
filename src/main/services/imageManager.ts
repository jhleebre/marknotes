import fs from 'fs/promises'
import path from 'path'
import type { FileResult } from '../../shared/types'
import { ALLOWED_IMAGE_EXTENSIONS, MAX_IMAGE_SIZE } from '../../shared/constants'
import { ROOT_PATH, ASSETS_PATH, METADATA_PATH, ensureRootDirectory, validatePath } from '../utils'

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

// Update image references for a document based on its content
// (single read-modify-write to avoid redundant I/O and lost updates)
export async function updateDocumentImageReferences(
  documentPath: string,
  content: string
): Promise<void> {
  const metadata = await loadMetadata()

  // Find all .assets images in the content
  const imagePattern = /!\[([^\]]*)\]\(\.assets\/([^)]+)\)/g
  const referencedImages = new Set<string>()
  let match

  while ((match = imagePattern.exec(content)) !== null) {
    referencedImages.add(match[2]) // filename
  }

  let changed = false

  // Sync references on existing metadata entries
  for (const [imageFilename, imageData] of Object.entries(metadata.images)) {
    const wasReferenced = imageData.references.includes(documentPath)
    const isReferenced = referencedImages.has(imageFilename)

    if (wasReferenced && !isReferenced) {
      imageData.references = imageData.references.filter((ref) => ref !== documentPath)
      changed = true
    } else if (!wasReferenced && isReferenced) {
      imageData.references.push(documentPath)
      changed = true
    }
  }

  // Add new images that are referenced but not yet in metadata
  for (const imageFilename of referencedImages) {
    if (!metadata.images[imageFilename]) {
      const imageFilePath = path.join(ASSETS_PATH, imageFilename)
      try {
        const stats = await fs.stat(imageFilePath)
        metadata.images[imageFilename] = {
          references: [documentPath],
          uploadedAt: new Date().toISOString(),
          size: stats.size
        }
        changed = true
      } catch {
        // Image file doesn't exist on disk — don't add to metadata
      }
    }
  }

  if (changed) {
    await saveMetadata(metadata)
  }
}

// Clean up all image references for a deleted document
export async function cleanupDocumentImages(documentPath: string): Promise<void> {
  const metadata = await loadMetadata()
  let changed = false

  for (const imageData of Object.values(metadata.images)) {
    if (imageData.references.includes(documentPath)) {
      imageData.references = imageData.references.filter((ref) => ref !== documentPath)
      changed = true
    }
  }

  if (changed) {
    await saveMetadata(metadata)
  }
}

// Remap document reference paths after a file or folder is moved/renamed,
// so references keep pointing at the document's current relative path.
export async function updateReferencesAfterMove(
  oldAbsPath: string,
  newAbsPath: string
): Promise<void> {
  const metadata = await loadMetadata()
  const oldRel = path.relative(ROOT_PATH, oldAbsPath)
  const newRel = path.relative(ROOT_PATH, newAbsPath)
  let changed = false

  for (const imageData of Object.values(metadata.images)) {
    imageData.references = imageData.references.map((ref) => {
      if (ref === oldRel) {
        changed = true
        return newRel
      }
      // Document inside a moved/renamed folder
      if (ref.startsWith(oldRel + path.sep)) {
        changed = true
        return newRel + ref.slice(oldRel.length)
      }
      return ref
    })
  }

  if (changed) {
    await saveMetadata(metadata)
  }
}

// Clean up image references for all markdown files in a directory
export async function cleanupDirectoryImages(dirPath: string): Promise<void> {
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
export async function validateAndCleanupMetadata(): Promise<{
  cleaned: number
  validated: number
}> {
  const metadata = await loadMetadata()
  const allImageRefs = new Map<string, Set<string>>()

  async function scanDirectory(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        await scanDirectory(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const content = await fs.readFile(fullPath, 'utf-8')
        const imagePattern = /!\[([^\]]*)\]\(\.assets\/([^)]+)\)/g
        let match

        while ((match = imagePattern.exec(content)) !== null) {
          const imageFilename = match[2]
          if (!allImageRefs.has(imageFilename)) {
            allImageRefs.set(imageFilename, new Set())
          }
          const relativePath = path.relative(ROOT_PATH, fullPath)
          allImageRefs.get(imageFilename)!.add(relativePath)
        }
      }
    }
  }

  await scanDirectory(ROOT_PATH)

  const newMetadata: AssetsMetadata = { images: {} }
  let cleanedCount = 0
  let validatedCount = 0

  const assetFiles = await fs.readdir(ASSETS_PATH)
  for (const filename of assetFiles) {
    if (filename === '.metadata.json' || filename.startsWith('.')) continue

    const refs = allImageRefs.get(filename)
    if (refs && refs.size > 0) {
      const stats = await fs.stat(path.join(ASSETS_PATH, filename))
      newMetadata.images[filename] = {
        references: Array.from(refs),
        uploadedAt: metadata.images[filename]?.uploadedAt || new Date().toISOString(),
        size: stats.size
      }
      validatedCount++
    } else {
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

// Helper functions
export function sanitizeFilename(name: string): string {
  const basename = path.basename(name)
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export function generateImageFilename(originalName: string): string {
  const timestamp = Date.now()
  const sanitized = sanitizeFilename(originalName)
  return `${timestamp}_${sanitized}`
}

export function getImageMimeType(ext: string): string {
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

// Export cleanup function for app quit
export async function cleanupOnQuit(): Promise<void> {
  console.log('[Cleanup] Running cleanup on app quit...')
  const count = await cleanupUnreferencedFiles()
  console.log(`[Cleanup] Deleted ${count} unreferenced image(s)`)
}

// Image upload
export async function uploadImage(): Promise<FileResult> {
  // This will be handled by the IPC handler since it needs dialog
  // Kept here as a placeholder - the actual implementation is in imageHandlers.ts
  return { success: false, error: 'Use IPC handler' }
}

// Image embed as base64
export async function embedImageBase64(imagePath: string): Promise<FileResult> {
  try {
    let fullPath: string
    if (imagePath.startsWith('.assets/')) {
      fullPath = path.join(ROOT_PATH, imagePath)
    } else {
      fullPath = path.resolve(imagePath)
    }

    if (!validatePath(fullPath)) {
      return { success: false, error: 'Access denied: path outside root directory' }
    }

    const ext = path.extname(fullPath)
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext.toLowerCase())) {
      return { success: false, error: 'Invalid image file type' }
    }

    const stats = await fs.stat(fullPath)
    if (stats.size > 1024 * 1024) {
      return {
        success: false,
        error: 'Image is larger than 1MB. Embedding will significantly increase document size.'
      }
    }

    const buffer = await fs.readFile(fullPath)
    const base64 = buffer.toString('base64')
    const mimeType = getImageMimeType(ext)
    const dataUrl = `data:${mimeType};base64,${base64}`

    return { success: true, content: dataUrl }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

// Image resolve asset path to data URL
export async function resolveAssetPath(imagePath: string): Promise<FileResult> {
  try {
    if (!imagePath.startsWith('.assets/')) {
      if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
        return { success: true, content: imagePath }
      }
      return { success: false, error: 'Invalid path format' }
    }

    const fullPath = path.join(ROOT_PATH, imagePath)

    if (!fullPath.startsWith(ASSETS_PATH + path.sep)) {
      return { success: false, error: 'Access denied: path outside assets directory' }
    }

    try {
      await fs.access(fullPath)
    } catch {
      return { success: false, error: 'Image file not found' }
    }

    const ext = path.extname(fullPath)
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext.toLowerCase())) {
      return { success: false, error: 'Invalid image file type' }
    }

    const buffer = await fs.readFile(fullPath)
    const base64 = buffer.toString('base64')
    const mimeType = getImageMimeType(ext)
    const dataUrl = `data:${mimeType};base64,${base64}`

    return { success: true, content: dataUrl }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

// Save base64 image to .assets folder
export async function saveBase64Image(filename: string, base64Data: string): Promise<FileResult> {
  try {
    await ensureRootDirectory()

    const sanitized = sanitizeFilename(filename)
    const timestamp = Date.now()
    const finalFilename = `${timestamp}_${sanitized}`
    const targetPath = path.join(ASSETS_PATH, finalFilename)

    const buffer = Buffer.from(base64Data, 'base64')

    if (buffer.length > MAX_IMAGE_SIZE) {
      return { success: false, error: 'Image file too large (max 10MB)' }
    }

    await fs.writeFile(targetPath, buffer)

    const relativePath = `.assets/${finalFilename}`
    return { success: true, content: relativePath }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
