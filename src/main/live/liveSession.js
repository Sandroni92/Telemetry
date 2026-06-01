/**
 * Sessione Live: collegamento diretto pilota <-> ingegnere a bassa latenza.
 *
 * - Il PC del pilota (con ACC) avvia un server WebSocket EMBEDDED (nessun relay nel
 *   mezzo = un solo hop, latenza minima) e annuncia la propria presenza in broadcast
 *   UDP sulla LAN.
 * - Il PC dell'ingegnere ascolta gli annunci e mostra gli host trovati: basta un
 *   click per connettersi (oppure inserire manualmente indirizzo:porta).
 * - Sul canale viaggiano sia i frame di telemetria (host -> ingegnere) sia la
 *   strategia (bidirezionale), così l'ingegnere vede la dashboard live e modifica la
 *   strategia in tempo reale.
 *
 * Ottimizzazioni latenza: TCP_NODELAY su tutti i socket, nessuna compressione
 * per-message, frame inviati appena disponibili.
 */

import { EventEmitter } from 'events'
import { WebSocketServer, WebSocket } from 'ws'
import dgram from 'dgram'
import os from 'os'

export const DEFAULT_PORT = 8788
const DISCOVERY_PORT = 48788
const MAGIC = 'ACC_TELEMETRY_SESSION_v1'
const BEACON_MS = 1000
const STALE_MS = 4000

export class LiveSession extends EventEmitter {
  constructor() {
    super()
    this.mode = 'offline' // offline | host | engineer
    this.transport = null // 'lan' | 'relay'
    this.name = os.hostname()
    this.wss = null
    this.clients = new Set()
    this.ws = null
    this.beacon = null
    this.beaconTimer = null
    this.discovery = null
    this.pruneTimer = null
    this.retry = null
    this.discovered = new Map()
    this.hostInfo = null
    this.lastStrategy = null
    // relay (Internet)
    this.relayWs = null
    this.relayUrl = null
    this.room = null
    this.relayRetry = null
    this.relayPeers = 0
  }

  get state() {
    const relayOpen = !!(this.relayWs && this.relayWs.readyState === WebSocket.OPEN)
    let connected = false
    let peers = 0
    if (this.mode === 'host') {
      connected = this.transport === 'relay' ? relayOpen : true
      peers = this.transport === 'relay' ? Math.max(0, this.relayPeers - 1) : this.clients.size
    } else if (this.mode === 'engineer') {
      connected = this.transport === 'relay' ? relayOpen : !!(this.ws && this.ws.readyState === WebSocket.OPEN)
    }
    return {
      mode: this.mode,
      transport: this.transport,
      name: this.name,
      hostInfo: this.hostInfo,
      room: this.room,
      relayUrl: this.relayUrl,
      peers,
      connected
    }
  }

  // ---------- HOST (pilota) ----------

  startHost(port = DEFAULT_PORT) {
    this.stop()
    try {
      this.wss = new WebSocketServer({ port, perMessageDeflate: false })
    } catch (e) {
      this.emit('error', `Impossibile avviare la sessione sulla porta ${port}: ${e.message}`)
      return null
    }
    this.mode = 'host'
    this.transport = 'lan'

    this.wss.on('connection', (sock) => {
      try {
        sock._socket.setNoDelay(true)
      } catch {
        /* ignora */
      }
      this.clients.add(sock)
      if (this.lastStrategy) this.safeSend(sock, { t: 'strategy', data: this.lastStrategy })
      sock.on('message', (raw) => this.onClientMessage(raw))
      sock.on('close', () => {
        this.clients.delete(sock)
        this.emit('state', this.state)
      })
      sock.on('error', () => {})
      this.emit('state', this.state)
    })
    this.wss.on('error', (e) => this.emit('error', String(e?.message || e)))

    this.hostInfo = { addresses: lanAddresses(), port, name: this.name }
    this.startBeacon(port)
    this.emit('state', this.state)
    return this.hostInfo
  }

  startBeacon(port) {
    try {
      this.beacon = dgram.createSocket({ type: 'udp4', reuseAddr: true })
      this.beacon.bind(() => {
        try {
          this.beacon.setBroadcast(true)
        } catch {
          /* ignora */
        }
      })
      const payload = Buffer.from(JSON.stringify({ magic: MAGIC, name: this.name, port }))
      this.beaconTimer = setInterval(() => {
        try {
          this.beacon.send(payload, DISCOVERY_PORT, '255.255.255.255')
        } catch {
          /* rete non pronta */
        }
      }, BEACON_MS)
    } catch {
      /* discovery non disponibile: resta la connessione manuale */
    }
  }

  onClientMessage(raw) {
    const m = parse(raw)
    if (m?.t === 'strategy') {
      this.lastStrategy = m.data
      this.emit('strategy', m.data)
    }
  }

  /** Invia un frame di telemetria agli ingegneri collegati (LAN o relay). */
  sendTelemetry(frame) {
    if (this.mode !== 'host') return
    if (this.transport === 'relay') {
      if (this.relayWs?.readyState === WebSocket.OPEN)
        this.relayWs.send(JSON.stringify({ t: 'telemetry', f: frame }))
      return
    }
    if (this.clients.size === 0) return
    const msg = JSON.stringify({ t: 'telemetry', f: frame })
    for (const c of this.clients) if (c.readyState === WebSocket.OPEN) c.send(msg)
  }

  // ---------- ENGINEER (ingegnere) ----------

  startDiscovery() {
    if (this.discovery) return
    try {
      this.discovery = dgram.createSocket({ type: 'udp4', reuseAddr: true })
      this.discovery.on('message', (msg, rinfo) => {
        const d = parse(msg)
        if (d?.magic !== MAGIC) return
        const key = `${rinfo.address}:${d.port}`
        this.discovered.set(key, { name: d.name, host: rinfo.address, port: d.port, ts: Date.now() })
        this.emit('discovered', this.discoveredList())
      })
      this.discovery.on('error', () => {})
      this.discovery.bind(DISCOVERY_PORT)
      this.pruneTimer = setInterval(() => {
        const now = Date.now()
        let changed = false
        for (const [k, v] of this.discovered) {
          if (now - v.ts > STALE_MS) {
            this.discovered.delete(k)
            changed = true
          }
        }
        if (changed) this.emit('discovered', this.discoveredList())
      }, 2000)
    } catch {
      /* discovery non disponibile */
    }
  }

  stopDiscovery() {
    if (this.pruneTimer) clearInterval(this.pruneTimer)
    this.pruneTimer = null
    try {
      this.discovery?.close()
    } catch {
      /* ignora */
    }
    this.discovery = null
    this.discovered.clear()
  }

  discoveredList() {
    return [...this.discovered.values()]
  }

  joinHost(host, port = DEFAULT_PORT) {
    this.stop()
    this.mode = 'engineer'
    this.transport = 'lan'
    this.hostInfo = { host, port, name: host }
    this.connect(host, port)
    this.emit('state', this.state)
  }

  // ---------- RELAY (Internet, tramite codice-stanza) ----------

  startHostRelay(relayUrl, room) {
    this.stop()
    this.mode = 'host'
    this.transport = 'relay'
    this.relayUrl = relayUrl
    this.room = room
    this.hostInfo = { relayUrl, room, name: this.name }
    this.connectRelay()
    this.emit('state', this.state)
    return { relayUrl, room }
  }

  joinRelay(relayUrl, room) {
    this.stop()
    this.mode = 'engineer'
    this.transport = 'relay'
    this.relayUrl = relayUrl
    this.room = room
    this.hostInfo = { relayUrl, room, name: 'sessione remota' }
    this.connectRelay()
    this.emit('state', this.state)
  }

  connectRelay() {
    const sep = this.relayUrl.includes('?') ? '&' : '?'
    const url = `${this.relayUrl}${sep}room=${encodeURIComponent(this.room)}&role=${this.mode}`
    try {
      this.relayWs = new WebSocket(url, { perMessageDeflate: false })
      this.relayWs.on('open', () => {
        try {
          this.relayWs._socket.setNoDelay(true)
        } catch {
          /* ignora */
        }
        if (this.lastStrategy) this.safeSend(this.relayWs, { t: 'strategy', data: this.lastStrategy })
        this.emit('state', this.state)
      })
      this.relayWs.on('message', (raw) => {
        const m = parse(raw)
        if (m?.t === 'telemetry') this.emit('telemetry', m.f)
        else if (m?.t === 'strategy') this.emit('strategy', m.data)
        else if (m?.t === 'peers') {
          this.relayPeers = m.n
          this.emit('state', this.state)
        }
      })
      this.relayWs.on('close', () => {
        this.relayPeers = 0
        this.emit('state', this.state)
        if (this.transport === 'relay') this.scheduleRelayReconnect()
      })
      this.relayWs.on('error', () => {})
    } catch {
      this.scheduleRelayReconnect()
    }
  }

  scheduleRelayReconnect() {
    if (this.transport !== 'relay' || this.relayRetry) return
    this.relayRetry = setTimeout(() => {
      this.relayRetry = null
      if (this.transport === 'relay') this.connectRelay()
    }, 2500)
  }

  connect(host, port) {
    try {
      this.ws = new WebSocket(`ws://${host}:${port}`, { perMessageDeflate: false })
      this.ws.on('open', () => {
        try {
          this.ws._socket.setNoDelay(true)
        } catch {
          /* ignora */
        }
        if (this.lastStrategy) this.safeSend(this.ws, { t: 'strategy', data: this.lastStrategy })
        this.emit('state', this.state)
      })
      this.ws.on('message', (raw) => {
        const m = parse(raw)
        if (m?.t === 'telemetry') this.emit('telemetry', m.f)
        else if (m?.t === 'strategy') this.emit('strategy', m.data)
      })
      this.ws.on('close', () => {
        this.emit('state', this.state)
        if (this.mode === 'engineer') this.scheduleReconnect(host, port)
      })
      this.ws.on('error', () => {})
    } catch {
      this.scheduleReconnect(host, port)
    }
  }

  scheduleReconnect(host, port) {
    if (this.mode !== 'engineer' || this.retry) return
    this.retry = setTimeout(() => {
      this.retry = null
      if (this.mode === 'engineer') this.connect(host, port)
    }, 2000)
  }

  // ---------- comune ----------

  /** Propaga la strategia sul canale attivo (LAN o relay, in entrambi i ruoli). */
  sendStrategy(strategy) {
    this.lastStrategy = strategy
    const payload = JSON.stringify({ t: 'strategy', data: strategy })
    if (this.transport === 'relay') {
      if (this.relayWs?.readyState === WebSocket.OPEN) this.relayWs.send(payload)
      return
    }
    if (this.mode === 'host') {
      for (const c of this.clients) if (c.readyState === WebSocket.OPEN) c.send(payload)
    } else if (this.mode === 'engineer' && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(payload)
    }
  }

  safeSend(sock, obj) {
    try {
      if (sock.readyState === WebSocket.OPEN) sock.send(JSON.stringify(obj))
    } catch {
      /* ignora */
    }
  }

  stop() {
    if (this.retry) clearTimeout(this.retry)
    this.retry = null
    if (this.relayRetry) clearTimeout(this.relayRetry)
    this.relayRetry = null
    try {
      this.relayWs?.close()
    } catch {
      /* ignora */
    }
    this.relayWs = null
    this.relayPeers = 0
    this.room = null
    if (this.beaconTimer) clearInterval(this.beaconTimer)
    this.beaconTimer = null
    try {
      this.beacon?.close()
    } catch {
      /* ignora */
    }
    this.beacon = null
    for (const c of this.clients) {
      try {
        c.close()
      } catch {
        /* ignora */
      }
    }
    this.clients.clear()
    try {
      this.wss?.close()
    } catch {
      /* ignora */
    }
    this.wss = null
    try {
      this.ws?.close()
    } catch {
      /* ignora */
    }
    this.ws = null
    this.mode = 'offline'
    this.transport = null
    this.hostInfo = null
    this.emit('state', this.state)
  }
}

function parse(raw) {
  try {
    return JSON.parse(raw.toString())
  } catch {
    return null
  }
}

function lanAddresses() {
  const out = []
  const ifs = os.networkInterfaces()
  for (const name in ifs) {
    for (const ni of ifs[name] || []) {
      if (ni.family === 'IPv4' && !ni.internal) out.push(ni.address)
    }
  }
  return out
}
