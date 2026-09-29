/**
 * useMediaQuery: true while the CSS media query matches (updates on resize).
 * Used to pick a different layout for laptops than for phones.
 */
import { useState, useEffect } from 'react'

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const list = window.matchMedia(query)
    const onChange = e => setMatches(e.matches)
    setMatches(list.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])
  return matches
}

export const DESKTOP_QUERY = '(min-width: 900px)'
