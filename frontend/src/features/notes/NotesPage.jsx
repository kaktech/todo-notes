/**
 * NotesPage: notes list on the left, editor on the right.
 * Auto-save, search, and last-updated time.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNotes } from './useNotes'
import NotesList from './NotesList'
import NoteEditor from './NoteEditor'

export default function NotesPage() {
  const { notes, loading, error, fetchNotes, createNote, updateNote, deleteNote } = useNotes()
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')

  const loadNotes = useCallback(() => {
    fetchNotes(search)
  }, [search, fetchNotes])

  useEffect(() => { loadNotes() }, [loadNotes])

  // Find the selected note object
  const selectedNote = notes.find(n => n.id === selectedId)

  // Create a new note and select it
  async function handleNew() {
    const note = await createNote()
    setSelectedId(note.id)
  }

  // Delete a note
  async function handleDelete(id) {
    await deleteNote(id)
    if (selectedId === id) setSelectedId(null)
  }

  return (
    <div className="notes-page">
      <h1>Notes</h1>
      {error && <div className="error-banner">{error}</div>}

      <div className="notes-layout">
        <NotesList
          notes={notes}
          selectedId={selectedId}
          onSelect={(note) => setSelectedId(note.id)}
          onNew={handleNew}
          search={search}
          onSearch={setSearch}
        />
        <NoteEditor
          note={selectedNote}
          onSave={updateNote}
          onDelete={handleDelete}
        />
      </div>
    </div>
  )
}
