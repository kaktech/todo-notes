/**
 * NotesPage: simple grid layout — different from the three-panel task layout.
 * Shows notes as cards in a grid, click to edit in a modal.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNotes } from './useNotes'

export default function NotesPage() {
  const { notes, loading, error, fetchNotes, createNote, updateNote, deleteNote } = useNotes()
  const [search, setSearch] = useState('')
  const [editingNote, setEditingNote] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  const loadNotes = useCallback(() => {
    fetchNotes(search)
  }, [search, fetchNotes])

  useEffect(() => { loadNotes() }, [loadNotes])

  // Open note for editing
  function openNote(note) {
    setEditingNote(note)
    setEditTitle(note.title)
    setEditContent(note.content)
  }

  // Save edited note
  async function handleSave() {
    if (!editingNote) return
    await updateNote(editingNote.id, { title: editTitle, content: editContent })
    setEditingNote(null)
  }

  // Delete note
  async function handleDelete(id) {
    await deleteNote(id)
    setEditingNote(null)
  }

  // Format date
  function formatDate(dateStr) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="notes-page">
      <h1 className="page-heading">Notes</h1>

      {error && <div className="error-banner">{error}</div>}

      {/* Search */}
      <div className="notes-search">
        <input
          type="text"
          placeholder="Search notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
        <button onClick={async () => { const note = await createNote(); openNote(note) }} className="btn btn-primary">
          + New Note
        </button>
      </div>

      {loading && <div className="loading">Loading notes...</div>}

      {/* Notes grid — different from task list layout */}
      {!loading && notes.length === 0 && (
        <div className="empty-state">No notes yet</div>
      )}

      <div className="notes-grid">
        {notes.map(note => (
          <div key={note.id} className="note-card" onClick={() => openNote(note)}>
            <h3 className="note-card-title">{note.title}</h3>
            <p className="note-card-preview">{note.content.substring(0, 100)}{note.content.length > 100 ? '...' : ''}</p>
            <span className="note-card-date">{formatDate(note.updated_at)}</span>
          </div>
        ))}
      </div>

      {/* Edit modal */}
      {editingNote && (
        <div className="modal-overlay" onClick={() => setEditingNote(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Edit Note</h2>
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="form-input"
              placeholder="Note title"
            />
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="form-textarea"
              placeholder="Note content..."
              rows={8}
            />
            <div className="form-actions">
              <button onClick={() => handleDelete(editingNote.id)} className="btn btn-danger">Delete</button>
              <button onClick={() => setEditingNote(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
