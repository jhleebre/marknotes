import { ipcMain, BrowserWindow } from 'electron'
import type { FileResult } from '../../shared/types'
import { exportToPdf } from '../services/exportService'

export function registerExportHandlers(): void {
  ipcMain.handle(
    'export:pdf',
    async (event, markdown: string, defaultName: string): Promise<FileResult> => {
      const parentWindow = BrowserWindow.fromWebContents(event.sender) ?? undefined
      return exportToPdf(markdown, defaultName, parentWindow)
    }
  )
}
