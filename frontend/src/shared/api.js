/**
 * API helper: builds the base URL for API calls.
 * In production the frontend calls the backend at VITE_API_URL (or same origin).
 * In local dev, relative /api is proxied by Vite.
 */
export function getApiBase() {
  return import.meta.env.VITE_API_URL || ''
}

export async function apiFetch(path, options = {}) {
  return fetch(`${getApiBase()}/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
}
