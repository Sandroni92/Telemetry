/**
 * Codifica/decodifica dell'"invito" alla sessione remota.
 *
 * Un invito raccoglie in un'unica stringa copiabile: URL del relay, codice‑stanza
 * e token segreto. È un base64url di un JSON compatto, con prefisso di versione.
 * Non è cifratura forte (chi legge l'invito ottiene il token): serve a non mostrare
 * il segreto in chiaro nell'interfaccia e a consegnarlo in un solo blocco. La
 * sicurezza reale è data dal fatto che il token è lungo e casuale e che il relay
 * rifiuta chi non lo possiede.
 */

const PREFIX = 'acc1:'

export function encodeInvite({ url, room, token }) {
  const json = JSON.stringify({ u: url, r: room, t: token })
  return PREFIX + Buffer.from(json, 'utf8').toString('base64url')
}

export function decodeInvite(invite) {
  try {
    const raw = String(invite).trim()
    if (!raw.startsWith(PREFIX)) return null
    const json = Buffer.from(raw.slice(PREFIX.length), 'base64url').toString('utf8')
    const o = JSON.parse(json)
    if (!o?.u || !o?.r || !o?.t) return null
    return { url: o.u, room: o.r, token: o.t }
  } catch {
    return null
  }
}
