/**
 * Sincronizzazione remota opzionale via WebSocket.
 *
 * Permette a un ingegnere remoto di vedere e modificare LIVE la strategia del
 * pilota: entrambe le istanze dell'app si collegano allo stesso relay (vedi
 * relay-server.mjs) e ogni patch viene rispecchiata sull'altro capo.
 *
 * Attivazione: impostare la variabile d'ambiente STRATEGY_RELAY_URL
 *   es. STRATEGY_RELAY_URL=ws://192.168.1.50:8787 npm run dev
 * Se non impostata, il modulo resta inattivo e l'app funziona in locale.
 */

import { EventEmitter } from 'events'
import WebSocket from 'ws'

export class RemoteSync extends EventEmitter {
  constructor(url) {
    super()
    this.url = url
    this.ws = null
    this.retry = null
    this.connected = false
  }

  get status() {
    if (!this.url) return { mode: 'local' }
    return { mode: 'remote', connected: this.connected, url: this.url }
  }

  start() {
    if (!this.url) return
    this.connect()
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url)
      this.ws.on('open', () => {
        this.connected = true
        this.emit('status', this.status)
      })
      this.ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString())
          if (msg.type === 'strategy') this.emit('remote-strategy', msg.data)
        } catch {
          /* messaggio non valido, ignora */
        }
      })
      this.ws.on('close', () => {
        this.connected = false
        this.emit('status', this.status)
        this.scheduleReconnect()
      })
      this.ws.on('error', () => {
        this.connected = false
      })
    } catch {
      this.scheduleReconnect()
    }
  }

  scheduleReconnect() {
    if (!this.url || this.retry) return
    this.retry = setTimeout(() => {
      this.retry = null
      this.connect()
    }, 3000)
  }

  sendStrategy(strategy) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'strategy', data: strategy }))
    }
  }

  stop() {
    if (this.retry) clearTimeout(this.retry)
    this.ws?.close()
  }
}
