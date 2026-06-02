/**
 * Cuore del relay a STANZE, condiviso tra il relay standalone (relay-server.mjs)
 * e il relay EMBEDDED generato dall'app per la sessione live via Internet.
 *
 * Sicurezza: ogni stanza è protetta da un token segreto. Un client viene ammesso
 * solo se presenta lo stesso token con cui la stanza è stata creata (confronto in
 * tempo costante). Chi conosce solo il codice‑stanza, ma non il token, viene
 * rifiutato: il token viaggia dentro l'"invito" cifrato in base64 che il pilota
 * consegna all'ingegnere, non in chiaro nell'interfaccia.
 */

import { WebSocketServer } from 'ws'
import { URL } from 'url'
import { timingSafeEqual } from 'crypto'

/** Confronto in tempo costante, robusto a lunghezze diverse. */
function safeEqual(a, b) {
  const ba = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  if (ba.length !== bb.length) return false
  try {
    return timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

/**
 * Avvia un relay a stanze su `port`.
 *
 * @param {object} opts
 * @param {number} opts.port            porta di ascolto
 * @param {string} [opts.host]          interfaccia di bind (default 0.0.0.0)
 * @param {string} [opts.token]         token globale richiesto a TUTTE le stanze
 *                                      (relay embedded a stanza singola). Se assente
 *                                      ogni stanza adotta il token del primo client.
 * @param {number} [opts.maxPerRoom]    tetto di client per stanza (anti‑abuso)
 * @param {(s:string)=>void} [opts.log] logger opzionale
 * @returns {Promise<{wss:WebSocketServer, close:()=>Promise<void>}>}
 */
export function startRelay({ port, host = '0.0.0.0', token = null, maxPerRoom = 8, log = () => {} } = {}) {
  return new Promise((resolve, reject) => {
    let wss
    try {
      wss = new WebSocketServer({ host, port, perMessageDeflate: false, maxPayload: 4 * 1024 * 1024 })
    } catch (e) {
      reject(e)
      return
    }

    const rooms = new Map() // code -> { clients:Set, token, lastStrategy }

    function getRoom(code, roomToken) {
      let r = rooms.get(code)
      if (!r) {
        r = { clients: new Set(), token: token || roomToken || '', lastStrategy: null }
        rooms.set(code, r)
      }
      return r
    }

    function broadcastPeers(room) {
      const msg = JSON.stringify({ t: 'peers', n: room.clients.size })
      for (const c of room.clients) if (c.readyState === 1) c.send(msg)
    }

    wss.on('connection', (ws, req) => {
      try {
        ws._socket.setNoDelay(true)
      } catch {
        /* ignora */
      }
      const u = new URL(req.url, 'ws://x')
      const code = (u.searchParams.get('room') || 'LOBBY').toUpperCase()
      const role = u.searchParams.get('role') || '?'
      const auth = u.searchParams.get('auth') || ''

      const required = token || ''
      const room = getRoom(code, auth)
      const expected = required || room.token

      // Autenticazione: token mancante o errato => chiusura immediata.
      if (!expected || !auth || !safeEqual(auth, expected)) {
        log(`[relay] accesso negato a stanza ${code} (token errato)`)
        try {
          ws.close(4401, 'unauthorized')
        } catch {
          /* ignora */
        }
        if (room.clients.size === 0) rooms.delete(code)
        return
      }

      if (room.clients.size >= maxPerRoom) {
        try {
          ws.close(4403, 'room full')
        } catch {
          /* ignora */
        }
        return
      }

      room.clients.add(ws)
      log(`[relay] ${role} → stanza ${code} (${room.clients.size} presenti)`)

      if (room.lastStrategy) ws.send(JSON.stringify({ t: 'strategy', data: room.lastStrategy }))
      broadcastPeers(room)

      ws.on('message', (raw) => {
        const text = raw.toString()
        try {
          const m = JSON.parse(text)
          if (m?.t === 'strategy') room.lastStrategy = m.data
        } catch {
          /* inoltra comunque */
        }
        for (const c of room.clients) if (c !== ws && c.readyState === 1) c.send(text)
      })

      ws.on('close', () => {
        room.clients.delete(ws)
        if (room.clients.size === 0) rooms.delete(code)
        else broadcastPeers(room)
        log(`[relay] uscita da ${code} (${room.clients.size} restanti)`)
      })
      ws.on('error', () => {})
    })

    wss.on('error', (e) => reject(e))
    wss.on('listening', () =>
      resolve({
        wss,
        close: () =>
          new Promise((res) => {
            for (const r of rooms.values()) for (const c of r.clients) {
              try {
                c.close()
              } catch {
                /* ignora */
              }
            }
            rooms.clear()
            wss.close(() => res())
          })
      })
    )
  })
}
