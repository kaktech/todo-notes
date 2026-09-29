/**
 * useNow: the current Date, refreshed every 30 seconds, so "Now" and countdowns stay live.
 */
import { useState, useEffect } from 'react'

export function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])
  return now
}
