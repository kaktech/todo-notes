/**
 * NotesPage: list of note cards (search + count), tap one to open the full editor.
 * Works the same on desktop and mobile; the floating + is mobile-only.
 */
import { useState, useEffect } from 'react'
import Icon from '../../shared/Icon'
import EmptyState from '../../shared/EmptyState'
import { formatUpdated } from '../../shared/dates'
import { useNotes } from './useNotes'
import NoteEditor from './NoteEditor'

export default function NotesPage({ userId }) {
  const { notes, loading, error, fetchNotes, createNote, updateNote, deleteNote } = useNotes(userId)
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState(null)

  useEffect(() => { fetchNotes(search) }, [search, fetchNotes])

  async function handleNew() {
    try {
      const note = await createNote()
      await fetchNotes(search)
      setOpenId(note.id)
    } catch {
      window.alert('Could not create the note.')
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this note?')) return
    await deleteNote(id)
    setOpenId(null)
  }

  const openNote = notes.find(n => n.id === openId)
  if (openNote) {
    return (
      <div className="page notes-page">
        <NoteEditor
          key={openNote.id}
          note={openNote}
          onSave={updateNote}
          onDelete={handleDelete}
          onBack={() => setOpenId(null)}
        />
      </div>
    )
  }

  return (
    <div className="page notes-page">
      <header className="page-header">
        <h1 className="page-title">Notes <span className="count-badge">{notes.length}</span></h1>
        <button className="btn btn-primary desktop-only" onClick={handleNew}>
          <Icon name="plus" size={18} strokeWidth={3.5} /> NEW NOTE
        </button>
      </header>

      <label className="search-box">
        <Icon name="search" size={18} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notes..."
          aria-label="Search notes"
        />
      </label>

      {error && <div className="error-banner" role="alert">{error}</div>}

      {loading ? (
        <p className="muted-note">Loading notes...</p>
      ) : notes.length === 0 ? (
        search ? (
          <p className="muted-note">No notes match "{search}".</p>
        ) : (
          <EmptyState
            icon="note"
            title="Jot something down"
            text="Ideas, lists, anything you want to keep. Notes save themselves as you type."
            actionLabel="ADD A NOTE"
            onAction={handleNew}
          />
        )
      ) : (
        <div className="notes-grid">
          {notes.map(note => (
            <button key={note.id} className="note-card" onClick={() => setOpenId(note.id)}>
              <span className="note-card-title">{note.title}</span>
              <span className="note-card-preview">{note.content || 'No content yet'}</span>
              <span className="note-card-date">UPDATED {formatUpdated(note.updated_at).toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}

      <button className="fab" onClick={handleNew} aria-label="New note">
        <Icon name="plus" size={30} strokeWidth={3.5} />
      </button>
    </div>
  )
}
