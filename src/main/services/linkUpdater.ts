import fs from 'fs/promises'
import path from 'path'
import { ROOT_PATH } from '../utils'

/**
 * Recursively collect all .md files under dirPath (skipping hidden entries).
 */
async function collectMdFiles(dirPath: string): Promise<string[]> {
  const results: string[] = []
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const entryName = entry.name.toString()
      if (entryName.startsWith('.')) continue
      const fullPath = path.join(dirPath, entryName)
      if (entry.isDirectory()) {
        const children = await collectMdFiles(fullPath)
        results.push(...children)
      } else if (entryName.endsWith('.md')) {
        results.push(fullPath)
      }
    }
  } catch {
    // Directory not accessible — return empty
  }
  return results
}

/**
 * Compute the relative path from a file to a target absolute path,
 * with separators normalized to forward slashes.
 */
function relativePathToTarget(fromFile: string, toAbsPath: string): string {
  const rel = path.relative(path.dirname(fromFile), toAbsPath)
  return rel.split(path.sep).join('/')
}

/**
 * After a file or folder is moved/renamed, scan all .md files and update links.
 *
 * Two kinds of links are fixed:
 *   1. Links in OTHER files that point TO the moved file/folder
 *      → target path changes, so the relative href must be recomputed.
 *   2. Links INSIDE the moved file(s) that point to files that did NOT move
 *      → the reference point changed, so hrefs are stale even though targets
 *         are at the same absolute location.
 *
 * Errors are logged but never thrown — the move itself should always succeed.
 *
 * @param oldAbsPath  The previous absolute path (file or folder)
 * @param newAbsPath  The new absolute path (file or folder)
 */
export async function updateLinksAfterMove(
  oldAbsPath: string,
  newAbsPath: string
): Promise<string[]> {
  const changedFiles: string[] = []
  try {
    // pathMap:    old absolute path  → new absolute path  (for moved items)
    // reverseMap: new absolute path  → old absolute path  (to detect moved files while iterating)
    const pathMap = new Map<string, string>()
    const reverseMap = new Map<string, string>()

    let isDir = false
    try {
      const stat = await fs.stat(newAbsPath)
      isDir = stat.isDirectory()
    } catch {
      // If stat fails, assume it's a file
    }

    if (isDir) {
      // Folder move: enumerate new location, derive corresponding old paths
      const newFiles = await collectMdFiles(newAbsPath)
      for (const newFile of newFiles) {
        const relative = path.relative(newAbsPath, newFile)
        const oldFile = path.join(oldAbsPath, relative)
        pathMap.set(oldFile, newFile)
        reverseMap.set(newFile, oldFile)
      }
    } else {
      pathMap.set(oldAbsPath, newAbsPath)
      reverseMap.set(newAbsPath, oldAbsPath)
    }

    if (pathMap.size === 0) return changedFiles

    // Collect all .md files in the notes root
    const allMdFiles = await collectMdFiles(ROOT_PATH)

    // Regex: matches [text](path.md) or [text](path.md#fragment)
    const LINK_RE = /\[([^\]]*)\]\(([^)]+\.md(?:#[^)]*)?)\)/g

    for (const mdFile of allMdFiles) {
      let content: string
      try {
        content = await fs.readFile(mdFile, 'utf-8')
      } catch {
        continue
      }

      // If this file was just moved, its links were written relative to the OLD location.
      // Use the old path as the reference point to correctly resolve outgoing hrefs.
      const effectiveOldPath = reverseMap.get(mdFile) ?? mdFile

      let changed = false
      const updated = content.replace(LINK_RE, (match, text: string, href: string) => {
        const hashIdx = href.indexOf('#')
        const pathPart = hashIdx >= 0 ? href.slice(0, hashIdx) : href
        const fragment = hashIdx >= 0 ? href.slice(hashIdx) : ''

        // Skip external URLs — they don't need relative-path adjustment
        if (
          pathPart.startsWith('http://') ||
          pathPart.startsWith('https://') ||
          pathPart.startsWith('file://')
        ) {
          return match
        }

        let decodedPath: string
        try {
          decodedPath = decodeURIComponent(pathPart)
        } catch {
          return match
        }

        // Resolve the link target from the effective (possibly old) location
        const resolvedTarget = path.resolve(path.dirname(effectiveOldPath), decodedPath)

        // Determine the final target absolute path:
        //   - if target was also moved, use its new location
        //   - otherwise keep it unchanged
        const finalTarget = pathMap.get(resolvedTarget) ?? resolvedTarget

        // Compute new relative path from this file's CURRENT (new) location
        const newRel = relativePathToTarget(mdFile, finalTarget)
        const newHref = `${newRel}${fragment}`

        // Skip if nothing actually changed (e.g. intra-folder links after a folder move)
        if (newHref === href) return match

        changed = true
        return `[${text}](${newHref})`
      })

      if (changed) {
        await fs.writeFile(mdFile, updated, 'utf-8')
        changedFiles.push(mdFile)
      }
    }
  } catch (error) {
    console.error('[linkUpdater] Failed to update links after move:', error)
  }
  return changedFiles
}
