// Tracks cursor position and scroll offset per document within the app session.
// Stored in a module-level Map so switching documents preserves the editing position.

export interface CursorScrollState {
  cursorFrom: number
  cursorTo: number
  scrollTop: number
}

type PositionGetter = () => CursorScrollState | null

const cache = new Map<string, CursorScrollState>()
let editorPositionGetter: PositionGetter | null = null

export function saveCursorScroll(filePath: string, state: CursorScrollState): void {
  cache.set(filePath, state)
}

export function getCursorScroll(filePath: string): CursorScrollState | undefined {
  return cache.get(filePath)
}

export function removeCursorScroll(filePath: string): void {
  cache.delete(filePath)
}

export function setEditorPositionGetter(getter: PositionGetter | null): void {
  editorPositionGetter = getter
}

export function saveCurrentPosition(filePath: string | null): void {
  if (!filePath || !editorPositionGetter) return
  const state = editorPositionGetter()
  if (state) {
    cache.set(filePath, state)
  }
}
