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
import crypto from 'crypto'
import https from 'https'
import { startRelay } from './relayCore.js'
import { encodeInvite } from './invite.js'

export const DEFAULT_PORT = 8788
export const DEFAULT_RELAY_PORT = 8787
const DISCOVERY_PORT = 48788
const MAGIC = 'ACC_TELEMETRY_SESSION_v1'
const BEACON_MS = 1000
const STALE_MS = 4000

// Alfabeto del codice‑stanza: niente caratteri ambigui (0/O, 1/I).
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

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
    this.relayToken = null
    this.relayRetry = null
    this.relayPeers = 0
    this.embeddedRelay = null // relay generato dentro l'app (host)
    this.publicIp = null
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

  /**
   * Genera il relay DENTRO l'app: avvia un server relay locale protetto da token,
   * vi si collega come host e produce un "invito" sicuro (URL + stanza + token) da
   * consegnare all'ingegnere. Nessun servizio esterno richiesto: per il gioco via
   * Internet basta che la porta del relay sia raggiungibile (port‑forward/tunnel),
   * mentre il token impedisce l'accesso a chi non ha l'invito.
   */
  async startHostEmbeddedRelay(port = DEFAULT_RELAY_PORT) {
    this.stop()
    this.mode = 'host'
    this.transport = 'relay'
    const room = genRoom()
    const token = genToken()
    this.room = room
    this.relayToken = token

    try {
      this.embeddedRelay = await startRelay({ port, token, log: (m) => console.log(m) })
    } catch (e) {
      this.mode = 'offline'
      this.transport = null
      this.relayToken = null
      this.emit('error', `Impossibile avviare il relay sulla porta ${port}: ${e.message}`)
      this.emit('state', this.state)
      return null
    }

    // L'host si collega al proprio relay in locale (latenza trascurabile).
    this.relayUrl = `ws://127.0.0.1:${port}`
    const lan = lanAddresses()
    const reachUrl = `ws://${lan[0] || '127.0.0.1'}:${port}`
    this.hostInfo = {
      embedded: true,
      room,
      port,
      token,
      addresses: lan,
      name: this.name,
      relayUrl: this.relayUrl,
      invite: encodeInvite({ url: reachUrl, room, token })
    }
    this.connectRelay()
    this.emit('state', this.state)

    // Best effort: rileva l'IP pubblico per un invito usabile via Internet.
    fetchPublicIp().then((ip) => {
      if (!ip || !this.embeddedRelay || this.transport !== 'relay') return
      this.publicIp = ip
      this.hostInfo = {
        ...this.hostInfo,
        publicIp: ip,
        invite: encodeInvite({ url: `ws://${ip}:${port}`, room, token })
      }
      this.emit('state', this.state)
    })
    return this.hostInfo
  }

  startHostRelay(relayUrl, room = genRoom(), token = null) {
    this.stop()
    this.mode = 'host'
    this.transport = 'relay'
    this.relayUrl = relayUrl
    this.room = room
    this.relayToken = token || genToken()
    this.hostInfo = {
      relayUrl,
      room,
      token: this.relayToken,
      name: this.name,
      invite: encodeInvite({ url: relayUrl, room, token: this.relayToken })
    }
    this.connectRelay()
    this.emit('state', this.state)
    return { relayUrl, room }
  }

  joinRelay(relayUrl, room, token = null) {
    this.stop()
    this.mode = 'engineer'
    this.transport = 'relay'
    this.relayUrl = relayUrl
    this.room = room
    this.relayToken = token
    this.hostInfo = { relayUrl, room, name: 'sessione remota' }
    this.connectRelay()
    this.emit('state', this.state)
  }

  connectRelay() {
    const sep = this.relayUrl.includes('?') ? '&' : '?'
    let url = `${this.relayUrl}${sep}room=${encodeURIComponent(this.room)}&role=${this.mode}`
    if (this.relayToken) url += `&auth=${encodeURIComponent(this.relayToken)}`
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
      this.relayWs.on('close', (code) => {
        this.relayPeers = 0
        this.emit('state', this.state)
        if (code === 4401) {
          this.emit('error', 'Accesso al relay negato: invito o token non valido.')
          return
        }
        if (code === 4403) {
          this.emit('error', 'Stanza piena: troppi partecipanti.')
          return
        }
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
    this.relayToken = null
    this.publicIp = null
    if (this.embeddedRelay) {
      try {
        this.embeddedRelay.close()
      } catch {
        /* ignora */
      }
      this.embeddedRelay = null
    }
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

/** Codice‑stanza breve, leggibile e senza caratteri ambigui. */
function genRoom() {
  const b = crypto.randomBytes(5)
  let s = ''
  for (let i = 0; i < 5; i++) s += ROOM_ALPHABET[b[i] % ROOM_ALPHABET.length]
  return s
}

/** Token segreto della stanza: 128 bit casuali in esadecimale. */
function genToken() {
  return crypto.randomBytes(16).toString('hex')
}

/** IP pubblico (best effort) per costruire un invito raggiungibile via Internet. */
function fetchPublicIp() {
  return new Promise((resolve) => {
    let req
    try {
      req = https.get('https://api.ipify.org', { timeout: 4000 }, (res) => {
        let d = ''
        res.on('data', (c) => (d += c))
        res.on('end', () => {
          const ip = d.trim()
          resolve(/^\d{1,3}(\.\d{1,3}){3}$/.test(ip) ? ip : null)
        })
      })
    } catch {
      resolve(null)
      return
    }
    req.on('error', () => resolve(null))
    req.on('timeout', () => {
      try {
        req.destroy()
      } catch {
        /* ignora */
      }
      resolve(null)
    })
  })
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
