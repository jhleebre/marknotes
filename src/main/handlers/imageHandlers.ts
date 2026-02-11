import { ipcMain, dialog } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import type { FileResult } from '../../shared/types'
import { ALLOWED_IMAGE_EXTENSIONS, MAX_IMAGE_SIZE } from '../../shared/constants'
import { ASSETS_PATH, ensureRootDirectory } from '../utils'
import {
  generateImageFilename,
  embedImageBase64,
  resolveAssetPath,
  saveBase64Image,
  validateAndCleanupMetadata
} from '../services/imageManager'

export function registerImageHandlers(): void {
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

      if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext.toLowerCase())) {
        return { success: false, error: 'Invalid image file type' }
      }

      const stats = await fs.stat(sourcePath)
      if (stats.size > MAX_IMAGE_SIZE) {
        return { success: false, error: 'Image file too large (max 10MB)' }
      }

      const originalName = path.basename(sourcePath)
      const newFilename = generateImageFilename(originalName)
      const targetPath = path.join(ASSETS_PATH, newFilename)

      await fs.copyFile(sourcePath, targetPath)

      const relativePath = `.assets/${newFilename}`
      return { success: true, content: relativePath }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('image:embedBase64', async (_, imagePath: string): Promise<FileResult> => {
    return embedImageBase64(imagePath)
  })

  ipcMain.handle('image:resolveAssetPath', async (_, imagePath: string): Promise<FileResult> => {
    return resolveAssetPath(imagePath)
  })

  ipcMain.handle(
    'image:saveBase64',
    async (_, filename: string, base64Data: string): Promise<FileResult> => {
      return saveBase64Image(filename, base64Data)
    }
  )

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
