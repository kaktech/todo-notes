/*
 * NotesPage: create, edit, delete notes.
 * Notes list on the left, editor on the right.
 * Auto-save with debounce, search, last-updated time.
 */
import { useState, useEffect, useRef, useCallback } from 'react'

export default function NotesPage() {
  // --- State ---
  const [notes, setNotes] = useState([])
  const [selectedId, setSelectedId] = useState(null) // which note is open
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false) // show "Saved" indicator

  // Ref to store the debounce timer
  const debounceRef = useRef(null)

  // --- Fetch notes from the API ---
  const fetchNotes = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let url = '/api/notes'
      if (search) url += '?search=' + encodeURIComponent(search)
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load notes')
      const data = await res.json()
      setNotes(data)
    } catch {
      setError('Could not load notes. Is the server running?')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  // --- Create a new note ---
  async function createNote() {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Note', content: '' }),
      })
      if (!res.ok) throw new Error('Failed to create note')
      const note = await res.json()
      setSelectedId(note.id)
      setEditTitle(note.title)
      setEditContent(note.content)
      fetchNotes()
    } catch {
      setError('Failed to create note')
    }
  }

  // --- Select a note to edit ---
  function selectNote(note) {
    setSelectedId(note.id)
    setEditTitle(note.title)
    setEditContent(note.content)
    setSaved(false)
  }

  // --- Auto-save (debounced) ---
  // This runs whenever the user types, but waits 500ms after they stop
  useEffect(() => {
    if (!selectedId) return

    // Clear any existing timer
    if (debounceRef.current) clearTimeout(debounceRef.current)

    // Set a new timer
    debounceRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/notes/${selectedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: editTitle, content: editContent }),
        })
        setSaved(true)
        fetchNotes() // refresh the list to show updated time
      } catch {
        setError('Failed to save note')
      }
    }, 500) // wait 500ms after typing stops

    // Cleanup on unmount
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [editTitle, editContent, selectedId])

  // --- Delete a note ---
  async function deleteNote(id) {
    try {
      await fetch(`/api/notes/${id}`, { method: 'DELETE' })
      if (selectedId === id) {
        setSelectedId(null)
        setEditTitle('')
        setEditContent('')
      }
      fetchNotes()
    } catch {
      setError('Failed to delete note')
    }
  }

  // --- Format a date string nicely ---
  function formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  // --- Find the selected note object (for showing updated time) ---
  const selectedNote = notes.find(n => n.id === selectedId)

  // --- Render ---
  return (
    <div className="notes-page">
      <h1>Notes</h1>

      {error && <div className="error-banner">{error}</div>}

      <div className="notes-layout">
        {/* Left side: notes list */}
        <div className="notes-list-panel">
          <div className="notes-list-header">
            <input
              type="text"
              placeholder="Search notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="text-input"
            />
            <button onClick={createNote} className="btn btn-primary btn-small">+ New</button>
          </div>

          {loading && <div className="loading">Loading notes...</div>}

          {!loading && notes.length === 0 && (
            <div className="empty-state">No notes yet, create your first one!</div>
          )}

          <ul className="notes-list">
            {notes.map(note => (
              <li
                key={note.id}
                className={selectedId === note.id ? 'note-item selected' : 'note-item'}
                onClick={() => selectNote(note)}
              >
                <div className="note-item-title">{note.title}</div>
                <div className="note-item-date">{formatDate(note.updated_at)}</div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right side: editor */}
        <div className="notes-editor-panel">
          {selectedId ? (
            <>
              <div className="editor-header">
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => { setEditTitle(e.target.value); setSaved(false) }}
                  className="text-input title-input"
                  placeholder="Note title"
                />
                <div className="editor-meta">
                  {saved && <span className="saved-indicator">Saved</span>}
                  {selectedNote && (
                    <span className="updated-time">
                      Updated {formatDate(selectedNote.updated_at)}
                    </span>
                  )}
                  <button onClick={() => deleteNote(selectedId)} className="btn btn-danger btn-small">
                    Delete
                  </button>
                </div>
              </div>
              <textarea
                value={editContent}
                onChange={e => { setEditContent(e.target.value); setSaved(false) }}
                className="textarea-input content-input"
                placeholder="Start typing your note..."
                rows={15}
              />
            </>
          ) : (
            <div className="empty-state editor-empty">
              Select a note or create a new one
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
