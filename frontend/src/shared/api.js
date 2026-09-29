/**
 * API helper: returns the base URL for API calls.
 * In production (Vercel), uses VITE_API_URL env var.
 * In local dev, uses relative /api (proxied by Vite).
 */
export function getApiBase() {
  // Vercel injects env vars at build time via vite.config.js define
  return import.meta.env.VITE_API_URL || ''
}

/**
 * Helper to make API calls with the correct base URL.
 */
export async function apiFetch(path, options = {}) {
  const base = getApiBase()
  const url = `${base}/api${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  return res
}
