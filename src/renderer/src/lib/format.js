export function formatLapTime(ms) {
  if (!ms || ms < 0 || !Number.isFinite(ms)) return '--:--.---'
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const millis = Math.floor(ms % 1000)
  return `${m}:${String(s).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

export function formatDelta(ms) {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '+0.000'
  const sign = ms >= 0 ? '+' : '-'
  return `${sign}${(Math.abs(ms) / 1000).toFixed(3)}`
}

export function prettyName(slug = '') {
  return slug
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString('it-IT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}
