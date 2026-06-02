/**
 * Decodifica dell'invito alla sessione remota lato renderer (vedi
 * src/main/live/invite.js per la controparte che lo genera).
 */

const PREFIX = 'acc1:'

function b64urlToString(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : ''
  const bin = atob(b64 + pad)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function decodeInvite(invite) {
  try {
    const raw = String(invite).trim()
    if (!raw.startsWith(PREFIX)) return null
    const o = JSON.parse(b64urlToString(raw.slice(PREFIX.length)))
    if (!o?.u || !o?.r || !o?.t) return null
    return { url: o.u, room: o.r, token: o.t }
  } catch {
    return null
  }
}
