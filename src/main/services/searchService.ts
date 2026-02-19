import fs from 'fs/promises'
import path from 'path'
import { ROOT_PATH } from '../utils'
import type { FileSearchResult, SearchResult } from '../../shared/types'

const MAX_TOTAL_MATCHES = 500
const MAX_FILES = 1000
const MAX_LINE_LENGTH = 300

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractTagsFromFrontmatter(content: string): string[] {
  const lines = content.split('\n')
  if (lines.length === 0 || lines[0].trim() !== '---') return []

  const tags: string[] = []
  let inTagsBlock = false

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed === '---' || trimmed === '...') break

    if (inTagsBlock) {
      if (trimmed.startsWith('- ')) {
        const tag = trimmed.slice(2).trim().replace(/^['"]|['"]$/g, '')
        if (tag) tags.push(tag)
      } else if (trimmed === '-' || trimmed === '' || trimmed.startsWith('#')) {
        // empty item / blank / comment — skip
      } else {
        inTagsBlock = false // exited block
      }
      continue
    }

    // Inline array: tags: [a, b, c]
    const inlineMatch = line.match(/^tags?\s*:\s*\[([^\]]*)\]/)
    if (inlineMatch) {
      const items = inlineMatch[1]
        .split(',')
        .map((t) => t.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
      tags.push(...items)
      continue
    }

    // Block sequence start: tags: (nothing after colon)
    if (/^tags?\s*:\s*$/.test(line)) {
      inTagsBlock = true
      continue
    }

    // Single value: tags: value
    const singleMatch = line.match(/^tags?\s*:\s*(.+)/)
    if (singleMatch) {
      const val = singleMatch[1].trim().replace(/^['"]|['"]$/g, '')
      if (val && val !== 'null' && val !== '~' && val !== '[]') {
        tags.push(val)
      }
    }
  }

  return tags
}

async function collectMdFiles(dirPath: string, collected: string[]): Promise<void> {
  if (collected.length >= MAX_FILES) return

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      if (collected.length >= MAX_FILES) break
      if (entry.name.startsWith('.')) continue

      const fullPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        await collectMdFiles(fullPath, collected)
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        collected.push(fullPath)
      }
    }
  } catch {
    return
  }
}

export async function searchFiles(
  query: string,
  targetPath: string,
  caseSensitive: boolean
): Promise<SearchResult> {
  if (!query.trim()) {
    return { success: true, results: [], totalMatches: 0 }
  }

  const resolvedTarget = path.resolve(targetPath)
  if (!resolvedTarget.startsWith(ROOT_PATH)) {
    return { success: false, error: 'Access denied: path outside root directory' }
  }

  const mdFiles: string[] = []
  await collectMdFiles(resolvedTarget, mdFiles)

  const pattern = escapeRegex(query)
  const flags = caseSensitive ? 'g' : 'gi'
  const regex = new RegExp(pattern, flags)

  const results: FileSearchResult[] = []
  let totalMatches = 0

  for (const filePath of mdFiles) {
    if (totalMatches >= MAX_TOTAL_MATCHES) break

    let text: string
    try {
      text = await fs.readFile(filePath, 'utf-8')
    } catch {
      continue
    }

    const lines = text.split('\n')

    // Detect and skip YAML frontmatter to align line numbers with TipTap editor display
    let bodyStartLine = 0
    if (lines.length > 0 && lines[0].trim() === '---') {
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '---' || lines[i].trim() === '...') {
          bodyStartLine = i + 1
          break
        }
      }
    }

    const fileMatches: FileSearchResult['matches'] = []

    for (let i = bodyStartLine; i < lines.length; i++) {
      if (totalMatches >= MAX_TOTAL_MATCHES) break

      const line = lines[i]
      regex.lastIndex = 0

      let match: RegExpExecArray | null
      while ((match = regex.exec(line)) !== null) {
        if (totalMatches >= MAX_TOTAL_MATCHES) break

        const lineContent = line.length > MAX_LINE_LENGTH ? line.slice(0, MAX_LINE_LENGTH) : line
        fileMatches.push({
          lineNumber: i - bodyStartLine + 1, // body-relative, 1-based (matches TipTap status bar)
          lineContent,
          matchStart: match.index,
          matchEnd: match.index + match[0].length
        })
        totalMatches++

        if (match[0].length === 0) {
          regex.lastIndex++
        }
      }
    }

    if (fileMatches.length > 0) {
      const relativePath = path.relative(ROOT_PATH, filePath)
      results.push({
        filePath,
        relativePath,
        fileName: path.basename(filePath),
        matches: fileMatches
      })
    }
  }

  return { success: true, results, totalMatches }
}

export async function searchTags(
  query: string,
  targetPath: string,
  caseSensitive: boolean
): Promise<SearchResult> {
  if (!query.trim()) {
    return { success: true, results: [], totalMatches: 0 }
  }

  const resolvedTarget = path.resolve(targetPath)
  if (!resolvedTarget.startsWith(ROOT_PATH)) {
    return { success: false, error: 'Access denied: path outside root directory' }
  }

  const mdFiles: string[] = []
  await collectMdFiles(resolvedTarget, mdFiles)

  const compareQuery = caseSensitive ? query : query.toLowerCase()
  const results: FileSearchResult[] = []
  let totalMatches = 0

  for (const filePath of mdFiles) {
    let text: string
    try {
      text = await fs.readFile(filePath, 'utf-8')
    } catch {
      continue
    }

    const tags = extractTagsFromFrontmatter(text)
    const matchingTags = tags.filter((tag) => {
      const compareTag = caseSensitive ? tag : tag.toLowerCase()
      return compareTag.includes(compareQuery)
    })

    if (matchingTags.length > 0) {
      const relativePath = path.relative(ROOT_PATH, filePath)
      const matches = matchingTags.map((tag) => {
        const compareTag = caseSensitive ? tag : tag.toLowerCase()
        const matchStart = compareTag.indexOf(compareQuery)
        return {
          lineNumber: 0,
          lineContent: tag,
          matchStart,
          matchEnd: matchStart + query.length
        }
      })
      results.push({
        filePath,
        relativePath,
        fileName: path.basename(filePath),
        matches
      })
      totalMatches += matchingTags.length
    }
  }

  return { success: true, results, totalMatches }
}
