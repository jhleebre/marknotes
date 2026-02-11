import fs from 'fs/promises'
import { dialog, BrowserWindow } from 'electron'
import type { FileResult } from '../../shared/types'
import {
  marked,
  postProcessImageSizes,
  processTaskListsForExport,
  embedImagesInHtml
} from './markdownRenderer'

export async function exportToPdf(markdown: string, defaultName: string): Promise<FileResult> {
  try {
    let html = await marked(markdown)
    html = postProcessImageSizes(html)
    html = processTaskListsForExport(html)
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

    /* Task list styles */
    ul.task-list {
      list-style: none !important;
      padding-left: 0 !important;
    }
    ul.task-list li {
      list-style: none !important;
      list-style-type: none !important;
    }
    li.task-list-item {
      list-style: none !important;
      list-style-type: none !important;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 4px 0;
    }
    li.task-list-item input[type='checkbox'] {
      margin-top: 4px;
      flex-shrink: 0;
    }
    /* Nested task lists - any ul inside a task list */
    ul.task-list ul {
      padding-left: 1.5em !important;
      margin-top: 4px;
      list-style: none !important;
    }
    /* Double nested */
    ul.task-list ul ul {
      padding-left: 3em !important;
    }
    /* Triple nested */
    ul.task-list ul ul ul {
      padding-left: 4.5em !important;
    }
  </style>
  <script>
    // Process task lists on page load
    document.addEventListener('DOMContentLoaded', function() {
      // Find all ul elements
      const allUls = document.querySelectorAll('ul');
      allUls.forEach(function(ul) {
        // Check if this ul contains any checkbox inputs
        const hasCheckbox = ul.querySelector('li > input[type="checkbox"]');
        if (hasCheckbox) {
          ul.classList.add('task-list');
          ul.style.listStyle = 'none';

          // Add class to all li containing checkboxes
          const listItems = ul.querySelectorAll('li');
          listItems.forEach(function(li) {
            const checkbox = li.querySelector('input[type="checkbox"]');
            if (checkbox && li.firstElementChild === checkbox) {
              li.classList.add('task-list-item');
              li.style.listStyle = 'none';
            }
          });
        }
      });

      // Handle link clicks
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
