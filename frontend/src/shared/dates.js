/**
 * Date/time helpers. Dates are "YYYY-MM-DD" strings in LOCAL time
 * (toISOString would use UTC and shift the day near midnight).
 */
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
export const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const DAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

const pad = n => String(n).padStart(2, '0')

export function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromDateStr(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayStr() {
  return toDateStr(new Date())
}

export function addDays(s, n) {
  const d = fromDateStr(s)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

export function toMinutes(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function fromMinutes(min) {
  const clamped = Math.max(0, Math.min(min, 23 * 60 + 59))
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`
}

export function formatDuration(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (!h) return `${m}m`
  if (!m) return `${h}h`
  return `${h}h ${m}m`
}

export function formatUpdated(dateStr) {
  if (!dateStr) return ''
  // The API sends UTC timestamps without a "Z"
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(dateStr) ? dateStr : dateStr + 'Z')
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
