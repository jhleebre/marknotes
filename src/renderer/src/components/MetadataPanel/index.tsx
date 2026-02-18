import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { ChevronRight, X, Plus, Trash2 } from 'lucide-react'
import { useDocumentStore } from '../../store/useDocumentStore'
import {
  parseFrontmatter,
  updateTags,
  updateField,
  removeField,
  ensureDefaults,
  AUTO_FIELDS,
  STATUS_OPTIONS
} from '../../utils/frontmatter'
import './MetadataPanel.css'

interface FileStat {
  createdAt: string
  modifiedAt: string
  size: number
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Default fields shown in a fixed section (order matches FIELD_ORDER). */
const DEFAULT_FIELD_KEYS = ['id', 'title', 'created', 'updated', 'source', 'status']

export function MetadataPanel(): React.JSX.Element | null {
  const {
    currentFilePath,
    currentFileName,
    content,
    setContent,
    isMetadataVisible,
    toggleMetadata
  } = useDocumentStore()
  const [fileStat, setFileStat] = useState<FileStat | null>(null)
  const [newTag, setNewTag] = useState('')
  const [addingField, setAddingField] = useState(false)
  const [newFieldKey, setNewFieldKey] = useState('')
  const [newFieldValue, setNewFieldValue] = useState('')
  const tagInputRef = useRef<HTMLInputElement>(null)
  const fieldKeyRef = useRef<HTMLInputElement>(null)
  const tagCancelledRef = useRef(false)
  const defaultsAppliedRef = useRef<string | null>(null)

  const { data } = parseFrontmatter(content)

  const tags = useMemo(
    () =>
      Array.isArray(data.tags)
        ? (data.tags as unknown[]).filter((t): t is string => typeof t === 'string')
        : [],
    [data.tags]
  )

  // Extra user-defined fields beyond the defaults and tags
  const extraFields = useMemo(() => {
    const skip = new Set([...DEFAULT_FIELD_KEYS, 'tags'])
    const entries: { key: string; value: string }[] = []
    for (const [key, value] of Object.entries(data)) {
      if (skip.has(key)) continue
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        entries.push({ key, value: String(value) })
      }
    }
    return entries
  }, [data])

  // Fetch file stats when file changes or panel opens
  useEffect(() => {
    if (!currentFilePath || !isMetadataVisible) return

    let cancelled = false
    const fetchStat = async (): Promise<void> => {
      const result = await window.api.file.stat(currentFilePath)
      if (!cancelled && result.success && result.content) {
        setFileStat(JSON.parse(result.content) as FileStat)
      }
    }
    fetchStat()
    return (): void => {
      cancelled = true
    }
  }, [currentFilePath, isMetadataVisible])

  // Populate default frontmatter fields when panel is expanded
  useEffect(() => {
    if (!isMetadataVisible || !currentFilePath || !currentFileName || !fileStat) return
    // Only apply once per file
    if (defaultsAppliedRef.current === currentFilePath) return
    defaultsAppliedRef.current = currentFilePath

    const updated = ensureDefaults(content, currentFileName, fileStat.createdAt)
    if (updated !== content) {
      setContent(updated)
    }
  }, [isMetadataVisible, currentFilePath, currentFileName, fileStat, content, setContent])

  // Reset applied ref when file changes
  useEffect(() => {
    defaultsAppliedRef.current = null
  }, [currentFilePath])

  // --- Tag handlers ---
  const handleAddTag = useCallback((): void => {
    const tag = newTag.trim()
    if (!tag || tags.includes(tag)) {
      setNewTag('')
      return
    }
    const updated = updateTags(content, [...tags, tag])
    setContent(updated)
    setNewTag('')
    tagInputRef.current?.focus()
  }, [newTag, tags, content, setContent])

  const handleRemoveTag = useCallback(
    (tagToRemove: string): void => {
      const updated = updateTags(
        content,
        tags.filter((t) => t !== tagToRemove)
      )
      setContent(updated)
    },
    [tags, content, setContent]
  )

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
        e.preventDefault()
        handleAddTag()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        tagCancelledRef.current = true
        setNewTag('')
        tagInputRef.current?.blur()
      }
    },
    [handleAddTag]
  )

  // --- Field handlers ---
  const handleFieldChange = useCallback(
    (key: string, value: string): void => {
      setContent(updateField(content, key, value))
    },
    [content, setContent]
  )

  const handleFieldRemove = useCallback(
    (key: string): void => {
      setContent(removeField(content, key))
    },
    [content, setContent]
  )

  const handleAddField = useCallback((): void => {
    const key = newFieldKey.trim()
    const value = newFieldValue.trim()
    if (!key) return
    setContent(updateField(content, key, value))
    setNewFieldKey('')
    setNewFieldValue('')
    setAddingField(false)
  }, [newFieldKey, newFieldValue, content, setContent])

  const handleAddFieldKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddField()
      } else if (e.key === 'Escape') {
        setAddingField(false)
        setNewFieldKey('')
        setNewFieldValue('')
      }
    },
    [handleAddField]
  )

  // Focus key input when adding a new field
  useEffect(() => {
    if (addingField) {
      fieldKeyRef.current?.focus()
    }
  }, [addingField])

  if (!currentFilePath) return null

  const hasFrontmatter = Object.keys(data).length > 0

  return (
    <div className="metadata-panel">
      <button className="metadata-header" onClick={toggleMetadata}>
        <ChevronRight className="metadata-chevron" data-expanded={isMetadataVisible || undefined} />
        <span className="metadata-title">Properties</span>
        {!isMetadataVisible && tags.length > 0 && (
          <span className="metadata-collapsed-tags">
            {tags.map((tag) => (
              <span key={tag} className="metadata-collapsed-tag">
                {tag}
              </span>
            ))}
          </span>
        )}
      </button>

      {isMetadataVisible && (
        <div className="metadata-content">
          {/* File info (always read-only from fs) */}
          {fileStat && (
            <div className="metadata-section">
              <div className="metadata-section-header">
                <span>File</span>
              </div>
              <div className="metadata-grid">
                <div className="metadata-row metadata-row--readonly">
                  <span className="metadata-label">Path</span>
                  <span className="metadata-value metadata-path" title={currentFilePath}>
                    {currentFilePath}
                  </span>
                </div>
                <div className="metadata-row metadata-row--readonly">
                  <span className="metadata-label">Size</span>
                  <span className="metadata-value">{formatSize(fileStat.size)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Default frontmatter fields */}
          {hasFrontmatter && (
            <div className="metadata-section">
              <div className="metadata-section-header">
                <span>Metadata</span>
              </div>
              <div className="metadata-grid">
                {DEFAULT_FIELD_KEYS.map((key) => {
                  const value = data[key]
                  if (value === undefined) return null
                  const isAuto = AUTO_FIELDS.has(key)
                  const strValue = String(value)

                  if (key === 'status') {
                    return (
                      <div key={key} className="metadata-row metadata-row--editable">
                        <span className="metadata-label">{key}</span>
                        <select
                          className="metadata-field-select"
                          value={strValue}
                          onChange={(e) => handleFieldChange(key, e.target.value)}
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    )
                  }

                  if (isAuto) {
                    return (
                      <div key={key} className="metadata-row metadata-row--readonly">
                        <span className="metadata-label">{key}</span>
                        <span className="metadata-value">{strValue}</span>
                      </div>
                    )
                  }

                  return (
                    <div key={key} className="metadata-row metadata-row--editable">
                      <span className="metadata-label">{key}</span>
                      <input
                        className="metadata-field-input"
                        value={strValue}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="metadata-section">
            <div className="metadata-section-header">
              <span>Tags</span>
            </div>
            <div className="metadata-tags-list">
              {tags.map((tag) => (
                <span key={tag} className="metadata-tag">
                  {tag}
                  <button
                    className="metadata-tag-remove"
                    onClick={() => handleRemoveTag(tag)}
                    title="Remove tag"
                  >
                    <X className="metadata-tag-remove-icon" />
                  </button>
                </span>
              ))}
              <input
                ref={tagInputRef}
                type="text"
                className="metadata-tag-input"
                placeholder="Add tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => {
                  if (tagCancelledRef.current) {
                    tagCancelledRef.current = false
                    return
                  }
                  handleAddTag()
                }}
              />
            </div>
          </div>

          {/* Extra user-defined fields */}
          <div className="metadata-section">
            <div className="metadata-section-header">
              <span>Custom</span>
              <button
                className="metadata-add-btn"
                onClick={() => setAddingField(true)}
                title="Add field"
              >
                <Plus className="metadata-add-icon" />
              </button>
            </div>
            <div className="metadata-grid">
              {extraFields.map(({ key, value }) => (
                <div key={key} className="metadata-row metadata-row--editable">
                  <span className="metadata-label">{key}</span>
                  <input
                    className="metadata-field-input"
                    value={value}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                  />
                  <button
                    className="metadata-field-remove"
                    onClick={() => handleFieldRemove(key)}
                    title={`Remove ${key}`}
                  >
                    <Trash2 className="metadata-field-remove-icon" />
                  </button>
                </div>
              ))}

              {addingField && (
                <div className="metadata-row metadata-row--new">
                  <input
                    ref={fieldKeyRef}
                    className="metadata-field-input metadata-field-key-input"
                    placeholder="Key"
                    value={newFieldKey}
                    onChange={(e) => setNewFieldKey(e.target.value)}
                    onKeyDown={handleAddFieldKeyDown}
                  />
                  <input
                    className="metadata-field-input"
                    placeholder="Value"
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    onKeyDown={handleAddFieldKeyDown}
                    onBlur={handleAddField}
                  />
                </div>
              )}

              {extraFields.length === 0 && !addingField && (
                <span className="metadata-empty">No custom fields</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
