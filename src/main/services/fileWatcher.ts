import { BrowserWindow } from 'electron'
import * as chokidar from 'chokidar'
import type { FileResult } from '../../shared/types'
import { ROOT_PATH, ensureRootDirectory } from '../utils'

let watcher: ReturnType<typeof chokidar.watch> | null = null

export async function startWatching(mainWindow: BrowserWindow): Promise<FileResult> {
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
}

export async function stopWatching(): Promise<FileResult> {
  try {
    if (watcher) {
      await watcher.close()
      watcher = null
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
