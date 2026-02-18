import fs from 'fs/promises'
import path from 'path'
import type { FileEntry, FileResult } from '../../shared/types'
import { ROOT_PATH, ensureRootDirectory } from '../utils'
import {
  updateDocumentImageReferences,
  cleanupDocumentImages,
  cleanupDirectoryImages
} from './imageManager'

export async function buildFileTree(dirPath: string): Promise<FileEntry[]> {
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

export async function readFile(filePath: string): Promise<FileResult> {
  try {
    const resolvedPath = path.resolve(filePath)
    if (!resolvedPath.startsWith(ROOT_PATH)) {
      return { success: false, error: 'Access denied: path outside root directory' }
    }

    const content = await fs.readFile(resolvedPath, 'utf-8')
    return { success: true, content }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function writeFile(filePath: string, content: string): Promise<FileResult> {
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

export async function listFiles(): Promise<FileResult> {
  try {
    await ensureRootDirectory()
    const files = await buildFileTree(ROOT_PATH)
    return { success: true, files }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function createFile(fileName: string, dirPath?: string): Promise<FileResult> {
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
}

export async function createFolder(folderName: string, parentPath?: string): Promise<FileResult> {
  try {
    const targetDir = parentPath || ROOT_PATH
    const resolvedPath = path.resolve(targetDir, folderName)
    if (!resolvedPath.startsWith(ROOT_PATH)) {
      return { success: false, error: 'Access denied: path outside root directory' }
    }

    // Check if folder exists
    try {
      await fs.access(resolvedPath)
      return { success: false, error: 'Folder already exists' }
    } catch {
      // Folder doesn't exist, we can create it
    }

    await fs.mkdir(resolvedPath, { recursive: true })
    return { success: true, content: resolvedPath }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function deleteFile(filePath: string): Promise<FileResult> {
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
}

export async function renameFile(oldPath: string, newName: string): Promise<FileResult> {
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

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

export async function moveFile(sourcePath: string, targetDir: string): Promise<FileResult> {
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

export async function statFile(filePath: string): Promise<FileResult> {
  try {
    const resolvedPath = path.resolve(filePath)
    if (!resolvedPath.startsWith(ROOT_PATH)) {
      return { success: false, error: 'Access denied: path outside root directory' }
    }

    const stats = await fs.stat(resolvedPath)
    return {
      success: true,
      content: JSON.stringify({
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString(),
        size: stats.size
      })
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function duplicateFile(filePath: string): Promise<FileResult> {
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

    return { success: true, content: newPath }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
