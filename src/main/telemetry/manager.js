/**
 * TelemetryManager: legge i dati REALI di ACC dalla Shared Memory, li inoltra al
 * renderer a frequenza controllata, registra i giri completati su disco e li espone
 * alla UI. Se ACC non è in esecuzione (o manca il backend nativo) resta in attesa
 * senza generare dati finti.
 */

import { EventEmitter } from 'events'
import fs from 'fs'
import path from 'path'
import { SharedMemoryReader } from './sharedMemoryReader.js'
import { LapRecorder } from './lapRecorder.js'

export class TelemetryManager extends EventEmitter {
  constructor(lapsDir) {
    super()
    this.lapsDir = lapsDir
    fs.mkdirSync(this.lapsDir, { recursive: true })

    this.shm = new SharedMemoryReader()
    this.recorder = new LapRecorder()
    this.active = null
    this.sourceName = null

    // Throttle dell'invio frame verso il renderer (~30 Hz è più che fluido per la UI).
    this.lastEmit = 0
    this.emitInterval = 1000 / 30
  }

  start() {
    this.stop()

    if (!this.shm.available) {
      this.sourceName = null
      this.emit('status', {
        type: 'warn',
        message: 'ACC non rilevato — avvia Assetto Corsa Competizione per la telemetria live.'
      })
      return null
    }

    this.active = this.shm
    this.sourceName = 'sharedmemory'
    this.active.on('frame', (f) => this.onFrame(f))
    this.active.on('error', (e) => this.emit('status', { type: 'error', message: String(e) }))
    this.active.on('unavailable', (m) => this.emit('status', { type: 'warn', message: m }))
    this.active.start()
    this.emit('status', { type: 'info', message: 'Telemetria ACC collegata (Shared Memory)' })
    return this.sourceName
  }

  stop() {
    if (this.active) {
      this.active.removeAllListeners('frame')
      this.active.stop()
      this.active = null
    }
  }

  /** Inietta un frame ricevuto da remoto (lato ingegnere): registra giro + emette. */
  ingestRemoteFrame(frame) {
    this.onFrame(frame)
  }

  onFrame(frame) {
    // Registrazione giro (sempre, indipendente dal throttle UI).
    const finished = this.recorder.push(frame)
    if (finished) {
      this.saveLap(finished)
      this.emit('lap-saved', { id: finished.id, meta: finished.meta })
    }

    const now = Date.now()
    if (now - this.lastEmit >= this.emitInterval) {
      this.lastEmit = now
      this.emit('frame', frame)
    }
  }

  // ---- Persistenza giri --------------------------------------------------

  saveLap(lap) {
    const file = path.join(this.lapsDir, `${lap.id}.json`)
    fs.writeFileSync(file, JSON.stringify(lap))
    return file
  }

  listLaps() {
    return fs
      .readdirSync(this.lapsDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        try {
          const lap = JSON.parse(fs.readFileSync(path.join(this.lapsDir, f), 'utf8'))
          return { id: lap.id, meta: lap.meta }
        } catch {
          return null
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.meta.date) - new Date(a.meta.date))
  }

  loadLap(id) {
    const file = path.join(this.lapsDir, `${id}.json`)
    if (!fs.existsSync(file)) return null
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  }

  deleteLap(id) {
    const file = path.join(this.lapsDir, `${id}.json`)
    if (fs.existsSync(file)) fs.unlinkSync(file)
    return true
  }

  /** Importa un file lap esterno copiandolo nella libreria. */
  importLap(lap) {
    if (!lap || !lap.samples) throw new Error('File giro non valido')
    if (!lap.id) lap.id = `${lap.meta?.track || 'lap'}_${Date.now()}`
    this.saveLap(lap)
    return { id: lap.id, meta: lap.meta }
  }

  /** Importa dati esterni: singolo giro oppure bundle multi-giro. */
  importData(data) {
    const imported = []
    if (data && Array.isArray(data.laps)) {
      for (const lap of data.laps) {
        // evita collisioni di id quando si importa un bundle
        lap.id = `${lap.meta?.track || 'lap'}_${Date.now()}_${imported.length}`
        imported.push(this.importLap(lap))
      }
    } else {
      imported.push(this.importLap(data))
    }
    return imported
  }

  /** Crea un bundle con tutti i giri (o un sottoinsieme) per la condivisione. */
  exportBundle(ids = null) {
    const list = (ids || this.listLaps().map((l) => l.id))
      .map((id) => this.loadLap(id))
      .filter(Boolean)
    return {
      version: 1,
      type: 'acc-telemetry-bundle',
      exportedAt: new Date().toISOString(),
      count: list.length,
      laps: list
    }
  }
}
