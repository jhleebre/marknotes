// Tracks when the app last wrote a file to disk.
// Used to distinguish our own saves from external file changes detected by chokidar.
let lastWriteTime = 0

export function markWrite(): void {
  lastWriteTime = Date.now()
}

export function getLastWriteTime(): number {
  return lastWriteTime
}
