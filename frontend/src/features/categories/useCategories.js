/**
 * useCategories: the user's lists (categories) with create / rename+recolor / delete.
 */
import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../../shared/api'

export function useCategories(userId) {
  const [categories, setCategories] = useState([])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await apiFetch(`/categories?user_id=${encodeURIComponent(userId)}`)
      if (res.ok) setCategories(await res.json())
    } catch { /* offline: keep what we have */ }
  }, [userId])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  async function addCategory(name, color) {
    const res = await apiFetch('/categories', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, name, color }),
    })
    if (!res.ok) throw new Error('Failed to create list')
    await fetchCategories()
  }

  async function updateCategory(id, updates) {
    const res = await apiFetch(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(updates) })
    if (!res.ok) throw new Error('Failed to update list')
    await fetchCategories()
  }

  async function deleteCategory(id) {
    const res = await apiFetch(`/categories/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete list')
    await fetchCategories()
  }

  return { categories, fetchCategories, addCategory, updateCategory, deleteCategory }
}
