/**
 * NoteEditor: right panel with title input and content textarea.
 * Auto-saves while typing (debounced) with a "Saved" indicator.
 */
import { useState, useEffect, useRef } from 'react'

export default function NoteEditor({ note, onSave, onDelete }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saved, setSaved] = useState(false)
  const debounceRef = useRef(null)

  // Load note data when selected note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content)
      setSaved(false)
    }
  }, [note?.id])

  // Auto-save: wait 500ms after typing stops, then save
  useEffect(() => {
    if (!note) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      await onSave(note.id, { title, content })
      setSaved(true)
    }, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [title, content])

  if (!note) {
    return (
      <div className="notes-editor-panel">
        <div className="empty-state editor-empty">
          Select a note or create a new one
        </div>
      </div>
    )
  }

  function formatDate(dateStr) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="notes-editor-panel">
      <div className="editor-header">
        <input
          type="text"
          value={title}
          onChange={e => { setTitle(e.target.value); setSaved(false) }}
          className="title-input"
          placeholder="Note title"
        />
        <div className="editor-meta">
          {saved && <span className="saved-indicator">Saved</span>}
          <span className="updated-time">Updated {formatDate(note.updated_at)}</span>
          <button onClick={() => onDelete(note.id)} className="btn btn-danger btn-small">Delete</button>
        </div>
      </div>
      <textarea
        value={content}
        onChange={e => { setContent(e.target.value); setSaved(false) }}
        className="content-input"
        placeholder="Start typing your note..."
        rows={15}
      />
    </div>
  )
}
