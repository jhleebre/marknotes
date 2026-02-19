/**
 * Compute a relative path from one file to another using pure JavaScript
 * (no Node.js `path` module — safe for use in the renderer process).
 *
 * Both paths should be absolute POSIX-style paths using '/' separators,
 * as used by Electron on macOS/Linux.
 *
 * @param fromFile  Absolute path of the file that will contain the link
 *                  (e.g., /root/folder/A.md)
 * @param toFile    Absolute path of the file being linked to
 *                  (e.g., /root/other/B.md)
 * @returns         Relative path suitable for a markdown link
 *                  (e.g., ../other/B.md)
 */
export function computeRelativePath(fromFile: string, toFile: string): string {
  const fromParts = fromFile.split('/').filter(Boolean)
  const toParts = toFile.split('/').filter(Boolean)

  // We want the directory of fromFile, not the file itself
  fromParts.pop()

  // Find the length of the common prefix
  let commonLen = 0
  const minLen = Math.min(fromParts.length, toParts.length)
  while (commonLen < minLen && fromParts[commonLen] === toParts[commonLen]) {
    commonLen++
  }

  // Number of '..' steps to climb from fromDir to common ancestor
  const upCount = fromParts.length - commonLen
  const downParts = toParts.slice(commonLen)

  const relParts: string[] = []
  for (let i = 0; i < upCount; i++) {
    relParts.push('..')
  }
  relParts.push(...downParts)

  // If both paths are identical (shouldn't happen for links), return the filename
  if (relParts.length === 0) {
    return toParts[toParts.length - 1] ?? ''
  }

  return relParts.join('/')
}
