/**
 * useNotes: notes for the logged-in user, with search.
 */
import { useState, useCallback } from 'react'
import { apiFetch } from '../../shared/api'

export function useNotes(userId) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchNotes = useCallback(async (search = '') => {
    try {
      const query = new URLSearchParams({ user_id: userId })
      if (search) query.set('search', search)
      const res = await apiFetch(`/notes?${query}`)
      if (!res.ok) throw new Error('load failed')
      setNotes(await res.json())
      setError('')
    } catch {
      setError('Could not load notes')
    } finally {
      setLoading(false)
    }
  }, [userId])

  async function createNote() {
    const res = await apiFetch('/notes', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, title: 'New note', content: '' }),
    })
    if (!res.ok) throw new Error('Failed to create note')
    return await res.json()
  }

  // Auto-save calls this often, so it patches local state instead of refetching
  async function updateNote(id, updates) {
    const res = await apiFetch(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(updates) })
    if (!res.ok) throw new Error('Failed to update note')
    const saved = await res.json()
    setNotes(prev => prev.map(n => (n.id === id ? saved : n)))
  }

  async function deleteNote(id) {
    const res = await apiFetch(`/notes/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete note')
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  return { notes, loading, error, fetchNotes, createNote, updateNote, deleteNote }
}
