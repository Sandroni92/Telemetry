/**
 * Lettore della Shared Memory di ACC (Windows).
 *
 * ACC pubblica i dati su memory-mapped files con nomi "Local\\acpmf_*".
 * Node non sa leggere named shared memory senza un addon nativo, quindi qui
 * usiamo un backend opzionale caricato a runtime. Se il backend non è presente
 * (es. su macOS, o senza il modulo nativo installato) la sorgente si dichiara
 * NON disponibile e il TelemetryManager ricade automaticamente sul Simulator.
 *
 * Per abilitare la lettura reale su Windows installare un backend che esponga
 * .readBuffer(name, size) -> Buffer, ad esempio un piccolo addon su OpenFileMapping,
 * e impostarlo via setBackend(). I Buffer vengono poi decodificati con accStructs.
 */

import { EventEmitter } from 'events'
import { decodePhysics, decodeGraphics, decodeStatic } from './accStructs.js'

const PHYSICS = { name: 'Local\\acpmf_physics', size: 800 }
const GRAPHICS = { name: 'Local\\acpmf_graphics', size: 1580 }
const STATIC = { name: 'Local\\acpmf_static', size: 820 }

function tryLoadBackend() {
  // Caricamento opzionale: non blocca la build se il modulo non c'è.
  const candidates = ['acc-shm-native', '@acc/shm']
  for (const id of candidates) {
    try {
      // eslint-disable-next-line no-eval
      const mod = eval('require')(id)
      if (mod && typeof mod.readBuffer === 'function') return mod
    } catch {
      /* backend non installato, si prova il prossimo */
    }
  }
  return null
}

export class SharedMemoryReader extends EventEmitter {
  constructor() {
    super()
    this.backend = process.platform === 'win32' ? tryLoadBackend() : null
    this.timer = null
    this.staticData = null
  }

  get available() {
    return !!this.backend
  }

  setBackend(backend) {
    this.backend = backend
  }

  start() {
    if (!this.backend) {
      this.emit('unavailable', 'Shared Memory backend non disponibile su questa piattaforma')
      return false
    }
    if (this.timer) return true
    const dt = 1000 / 60
    this.timer = setInterval(() => this.tick(), dt)
    return true
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  tick() {
    try {
      if (!this.staticData) {
        const sbuf = this.backend.readBuffer(STATIC.name, STATIC.size)
        if (sbuf) this.staticData = decodeStatic(sbuf)
      }
      const pbuf = this.backend.readBuffer(PHYSICS.name, PHYSICS.size)
      const gbuf = this.backend.readBuffer(GRAPHICS.name, GRAPHICS.size)
      if (!pbuf || !gbuf) return

      const p = decodePhysics(pbuf)
      const g = decodeGraphics(gbuf)
      const s = this.staticData || {}

      const delta = g.bestTimeMs ? g.currentTimeMs - g.bestTimeMs * g.normalizedCarPosition : 0

      this.emit('frame', {
        t: g.currentTimeMs,
        source: 'sharedmemory',
        live: g.status === 2,
        physics: {
          speedKmh: p.speedKmh,
          gear: p.gear,
          rpm: p.rpm,
          throttle: p.throttle,
          brake: p.brake,
          clutch: p.clutch,
          steerAngle: p.steerAngle,
          fuel: p.fuel,
          tyrePressure: p.wheelPressure,
          tyreCoreTemp: p.tyreCoreTemp,
          tc: p.tc,
          abs: p.abs
        },
        graphics: {
          lap: g.completedLaps + 1,
          position: g.position,
          currentTimeMs: g.currentTimeMs,
          lastTimeMs: g.lastTimeMs,
          bestTimeMs: g.bestTimeMs,
          deltaMs: Math.round(delta),
          normalizedCarPosition: g.normalizedCarPosition,
          fuelPerLap: g.fuelPerLap,
          tyreCompound: g.tyreCompound
        },
        statics: {
          carModel: s.carModel || 'unknown',
          track: s.track || 'unknown',
          playerName: s.playerName || 'Player',
          maxRpm: s.maxRpm || 8000,
          maxFuel: s.maxFuel || 120
        }
      })
    } catch (err) {
      this.emit('error', err)
    }
  }
}
