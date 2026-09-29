/**
 * There is no login. Each browser gets a random id the first time it opens the app,
 * and every task, list, tag and note is saved under that id.
 */
export function getUserId() {
  try {
    let id = localStorage.getItem('user_id')
    if (!id) {
      id = 'user-' + Math.random().toString(36).substring(2, 10)
      localStorage.setItem('user_id', id)
    }
    return id
  } catch {
    // localStorage blocked (private mode): fall back to an id that lasts until reload
    return 'user-session'
  }
}
