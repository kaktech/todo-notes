/**
 * useNotes: custom hook for managing notes state and API calls.
 */
import { useState, useEffect, useCallback } from 'react'

function getUserId() {
  let id = localStorage.getItem('user_id')
  if (!id) {
    id = 'user-' + Math.random().toString(36).substring(2, 10)
    localStorage.setItem('user_id', id)
  }
  return id
}

const USER_ID = getUserId()

export function useNotes() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchNotes = useCallback(async (search = '') => {
    setLoading(true)
    setError('')
    try {
      const url = search ? `/api/notes?user_id=${USER_ID}&search=${encodeURIComponent(search)}` : `/api/notes?user_id=${USER_ID}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load notes')
      setNotes(await res.json())
    } catch {
      setError('Could not load notes')
    } finally {
      setLoading(false)
    }
  }, [])

  const createNote = async () => {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: USER_ID, title: 'New Note', content: '' }),
    })
    if (!res.ok) throw new Error('Failed to create note')
    const note = await res.json()
    await fetchNotes()
    return note
  }

  const updateNote = async (id, updates) => {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error('Failed to update note')
    await fetchNotes()
  }

  const deleteNote = async (id) => {
    const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete note')
    await fetchNotes()
  }

  return { notes, loading, error, fetchNotes, createNote, updateNote, deleteNote }
}
