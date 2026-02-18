import { parse, stringify } from 'yaml'

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

interface FrontmatterResult {
  data: Record<string, unknown>
  body: string
}

/** Canonical field order for frontmatter. */
const FIELD_ORDER = ['id', 'title', 'created', 'updated', 'source', 'tags', 'status']

/** Fields that are auto-set and should not be edited by the user. */
export const AUTO_FIELDS = new Set(['id', 'title', 'created', 'updated'])

/** Status progression stages. */
export const STATUS_OPTIONS = ['draft', 'in-progress', 'stable'] as const
export type StatusValue = (typeof STATUS_OPTIONS)[number]

/**
 * Re-order data so canonical fields come first in the defined order,
 * followed by any extra user-defined fields.
 */
function orderFields(data: Record<string, unknown>): Record<string, unknown> {
  const ordered: Record<string, unknown> = {}
  for (const key of FIELD_ORDER) {
    if (key in data) ordered[key] = data[key]
  }
  for (const key of Object.keys(data)) {
    if (!(key in ordered)) ordered[key] = data[key]
  }
  return ordered
}

export function parseFrontmatter(content: string): FrontmatterResult {
  const match = content.match(FRONTMATTER_RE)
  if (!match) {
    return { data: {}, body: content }
  }

  try {
    const parsed = parse(match[1]) as Record<string, unknown> | null
    const data = parsed && typeof parsed === 'object' ? parsed : {}
    const body = content.slice(match[0].length)
    return { data, body }
  } catch {
    return { data: {}, body: content }
  }
}

export function extractBody(content: string): string {
  return parseFrontmatter(content).body
}

export function buildContent(data: Record<string, unknown>, body: string): string {
  const hasData = Object.keys(data).length > 0
  if (!hasData) return body

  const ordered = orderFields(data)
  const yamlStr = stringify(ordered, { lineWidth: 0 }).trimEnd()
  return `---\n${yamlStr}\n---\n${body}`
}

export function updateTags(content: string, newTags: string[]): string {
  const { data, body } = parseFrontmatter(content)

  if (newTags.length === 0) {
    delete data.tags
  } else {
    data.tags = newTags
  }

  return buildContent(data, body)
}

export function updateField(content: string, key: string, value: string): string {
  const { data, body } = parseFrontmatter(content)
  data[key] = value
  return buildContent(data, body)
}

export function removeField(content: string, key: string): string {
  const { data, body } = parseFrontmatter(content)
  delete data[key]
  return buildContent(data, body)
}

function formatDateYMD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function generateId(date: Date): string {
  const y = date.getFullYear()
  const mo = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${y}${mo}${d}-${h}${mi}${s}`
}

/**
 * Ensure all default frontmatter fields exist.
 * Missing fields are populated with sensible defaults.
 * Returns the content unchanged if all fields already exist.
 */
export function ensureDefaults(content: string, fileName: string, createdAtIso: string): string {
  const { data, body } = parseFrontmatter(content)
  let changed = false

  const createdDate = new Date(createdAtIso)

  if (!data.id) {
    data.id = generateId(createdDate)
    changed = true
  }

  if (!data.title) {
    data.title = fileName.replace(/\.md$/i, '')
    changed = true
  }

  if (!data.created) {
    data.created = formatDateYMD(createdDate)
    changed = true
  }

  if (!data.updated) {
    data.updated = formatDateYMD(new Date())
    changed = true
  }

  if (data.source === undefined) {
    data.source = ''
    changed = true
  }

  if (!data.tags) {
    data.tags = []
    changed = true
  }

  if (!data.status) {
    data.status = STATUS_OPTIONS[0]
    changed = true
  }

  if (!changed) return content
  return buildContent(data, body)
}

/**
 * Update the `updated` field to today's date before saving.
 * Only touches content that already has frontmatter.
 */
export function stampUpdated(content: string): string {
  const { data, body } = parseFrontmatter(content)
  if (Object.keys(data).length === 0) return content

  const today = formatDateYMD(new Date())
  if (data.updated === today) return content

  data.updated = today
  return buildContent(data, body)
}
