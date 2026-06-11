/* Temporary verification: render test-documents through the real export
   pipeline (markdownRenderer + pdfStyles + printToPDF) without the dialog. */
import fs from 'fs/promises'
import path from 'path'
import { app, BrowserWindow } from 'electron'
import {
  marked,
  postProcessImageSizes,
  processTaskListsForExport,
  embedImagesInHtml
} from '../src/main/services/markdownRenderer'
import { PDF_STYLES } from '../src/main/services/pdfStyles'

const FOOTER_FONT_SANS =
  "'Pretendard', -apple-system, 'Apple SD Gothic Neo', 'Segoe UI', sans-serif"
const FOOTER_TEMPLATE = `<div style="width:100%; margin:0 19mm; padding-top:6px; border-top:0.5px solid #dcd8d0;
  font-family:${FOOTER_FONT_SANS}; font-size:6.8pt; color:#8d897f; letter-spacing:0.1em; text-align:center;">
  <span class="pageNumber"></span> / <span class="totalPages"></span>
</div>`
const MM = 1 / 25.4

async function exportOne(mdPath: string, outPath: string): Promise<void> {
  const markdown = await fs.readFile(mdPath, 'utf-8')
  let html = await marked(markdown)
  html = postProcessImageSizes(html)
  html = processTaskListsForExport(html)
  html = await embedImagesInHtml(html)
  const template = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${path.basename(mdPath)}</title>
<style>
${PDF_STYLES}
</style>
</head>
<body>
${html}
</body>
</html>`

  const win = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  })
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(template)}`)
  const buf = await win.webContents.printToPDF({
    pageSize: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: FOOTER_TEMPLATE,
    margins: { top: 19 * MM, bottom: 21 * MM, left: 19 * MM, right: 19 * MM }
  })
  win.close()
  await fs.writeFile(outPath, buf)
}

app.on('window-all-closed', () => {
  /* keep running between documents */
})

app.whenReady().then(async () => {
  // run from the project root: npx esbuild scripts/verify-pdf.ts --bundle
  // --platform=node --external:electron --outfile=/tmp/verify-pdf.cjs && npx electron /tmp/verify-pdf.cjs
  const docsDir = path.resolve(process.cwd(), 'test-documents')
  const outDir = '/tmp/marknotes-pdf-verify'
  await fs.mkdir(outDir, { recursive: true })
  const files = (await fs.readdir(docsDir)).filter((f) => f.endsWith('.md'))
  for (const f of files) {
    try {
      await exportOne(path.join(docsDir, f), path.join(outDir, f.replace(/\.md$/, '.pdf')))
      console.log('OK', f)
    } catch (e) {
      console.error('FAIL', f, (e as Error).message)
      process.exitCode = 1
    }
  }
  app.quit()
})
