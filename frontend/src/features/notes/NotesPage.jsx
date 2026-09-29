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
      <div className="view notes-page">
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
    <div className="view notes-page">
      <header className="page-head">
        <h1 className="hero-title">Notes <span className="count-badge">{notes.length}</span></h1>
        <button className="btn btn-primary" onClick={handleNew}>
          <Icon name="plus" size={18} strokeWidth={3.5} /> New note
        </button>
      </header>

      <label className="search-box">
        <Icon name="search" size={18} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search your notes"
          aria-label="Search notes"
        />
      </label>

      {error && <div className="error-banner" role="alert">{error}</div>}

      {loading ? (
        <p className="soft">Loading…</p>
      ) : notes.length === 0 ? (
        search ? (
          <p className="soft">No notes match “{search}”.</p>
        ) : (
          <EmptyState
            icon="note"
            title="A blank page"
            text="Ideas, lists, half-thoughts. Notes save themselves as you type."
            actionLabel="Start a note"
            onAction={handleNew}
          />
        )
      ) : (
        <div className="notes-grid">
          {notes.map(note => (
            <button key={note.id} className="note-card" onClick={() => setOpenId(note.id)}>
              <span className="note-card-title">{note.title}</span>
              <span className="note-card-preview">{note.content || 'No content yet'}</span>
              <span className="note-card-date">Updated {formatUpdated(note.updated_at)}</span>
            </button>
          ))}
        </div>
      )}

    </div>
  )
}
