/**
 * Relay WebSocket con STANZE per la sessione live via Internet.
 *
 * Pilota e ingegnere (anche da case diverse) si collegano allo stesso relay e alla
 * stessa stanza (un codice breve). Il relay inoltra telemetria e strategia tra i
 * membri della stanza: nessuna delle due parti deve aprire porte sul proprio router,
 * perché entrambe fanno solo connessioni in uscita verso il relay.
 *
 * Avvio:   npm run relay              (porta 8787, oppure PORT=9000 npm run relay)
 *
 * Va eseguito su una macchina raggiungibile da entrambi i PC: un piccolo VPS, oppure
 * la propria rete esposta con un tunnel (es. ngrok / cloudflared). Poi nell'app, in
 * "Sessione Live → Remoto", si inserisce l'URL del relay (ws://host:8787) e il codice.
 */

import { WebSocketServer } from 'ws'
import { URL } from 'url'

const PORT = Number(process.env.PORT) || 8787
const wss = new WebSocketServer({ port: PORT, perMessageDeflate: false })

const rooms = new Map() // code -> { clients:Set, lastStrategy }

function getRoom(code) {
  if (!rooms.has(code)) rooms.set(code, { clients: new Set(), lastStrategy: null })
  return rooms.get(code)
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
  const room = getRoom(code)
  room.clients.add(ws)
  console.log(`[relay] ${role} → stanza ${code} (${room.clients.size} presenti)`)

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
    console.log(`[relay] uscita da ${code} (${room.clients.size} restanti)`)
  })
  ws.on('error', () => {})
})

console.log(`🏁 Relay (stanze) in ascolto su ws://0.0.0.0:${PORT}`)
