/**
 * useTags: the user's tags. createTag returns the new tag so callers can attach it right away.
 */
import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../shared/api'

export function useTags(userId) {
  const [tags, setTags] = useState([])
  const [taskTagMap, setTaskTagMap] = useState({}) // { taskId: [tagId, ...] }

  const fetchTags = useCallback(async () => {
    try {
      const res = await apiFetch(`/tags?user_id=${encodeURIComponent(userId)}`)
      if (res.ok) setTags(await res.json())
    } catch { /* offline: keep what we have */ }
  }, [userId])

  const fetchTaskTagMap = useCallback(async () => {
    try {
      const res = await apiFetch(`/tags/task-map?user_id=${encodeURIComponent(userId)}`)
      if (res.ok) setTaskTagMap(await res.json())
    } catch { /* offline: keep what we have */ }
  }, [userId])

  useEffect(() => { fetchTags() }, [fetchTags])

  async function createTag(name) {
    const res = await apiFetch('/tags', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, name }),
    })
    if (!res.ok) throw new Error('Failed to create tag')
    const tag = await res.json()
    await fetchTags()
    return tag
  }

  async function deleteTag(id) {
    const res = await apiFetch(`/tags/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete tag')
    await Promise.all([fetchTags(), fetchTaskTagMap()])
  }

  return { tags, taskTagMap, fetchTaskTagMap, createTag, deleteTag }
}
