import { ipcMain } from 'electron'
import type { FileResult } from '../../shared/types'
import { exportToPdf } from '../services/exportService'

export function registerExportHandlers(): void {
  ipcMain.handle(
    'export:pdf',
    async (_, markdown: string, defaultName: string): Promise<FileResult> => {
      return exportToPdf(markdown, defaultName)
    }
  )
}
