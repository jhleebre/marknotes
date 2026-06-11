import fs from 'fs/promises'
import { dialog, BrowserWindow } from 'electron'
import type { FileResult } from '../../shared/types'
import {
  marked,
  postProcessImageSizes,
  processTaskListsForExport,
  embedImagesInHtml
} from './markdownRenderer'
import { PDF_STYLES } from './pdfStyles'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const MM_TO_INCH = 1 / 25.4

// md2pdf page geometry: top 19mm / bottom 21mm / sides 19mm
const PDF_MARGINS = {
  top: 19 * MM_TO_INCH,
  bottom: 21 * MM_TO_INCH,
  left: 19 * MM_TO_INCH,
  right: 19 * MM_TO_INCH
}

const FOOTER_FONT_SANS =
  "'Pretendard', -apple-system, 'Apple SD Gothic Neo', 'Segoe UI', sans-serif"

// Hairline rule + centered "n / total" page counter (md2pdf default footer)
const FOOTER_TEMPLATE = `<div style="width:100%; margin:0 19mm; padding-top:6px; border-top:0.5px solid #dcd8d0;
  font-family:${FOOTER_FONT_SANS}; font-size:6.8pt; color:#8d897f; letter-spacing:0.1em; text-align:center;">
  <span class="pageNumber"></span> / <span class="totalPages"></span>
</div>`

function buildDocument(bodyHtml: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<style>
${PDF_STYLES}
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`
}

export async function exportToPdf(
  markdown: string,
  defaultName: string,
  parentWindow?: BrowserWindow
): Promise<FileResult> {
  try {
    let html = await marked(markdown)
    html = postProcessImageSizes(html)
    html = processTaskListsForExport(html)
    html = await embedImagesInHtml(html)

    const title = defaultName.replace(/\.md$/, '')
    const template = buildDocument(html, title)

    const saveDialogOptions = {
      defaultPath: `${title}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    }
    const { filePath, canceled } = parentWindow
      ? await dialog.showSaveDialog(parentWindow, saveDialogOptions)
      : await dialog.showSaveDialog(saveDialogOptions)

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

    try {
      await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(template)}`)

      const pdfBuffer = await pdfWindow.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: FOOTER_TEMPLATE,
        margins: PDF_MARGINS
      })

      await fs.writeFile(filePath, pdfBuffer)
    } finally {
      if (!pdfWindow.isDestroyed()) {
        pdfWindow.close()
      }
    }

    return { success: true, content: filePath }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
