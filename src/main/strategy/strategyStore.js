/**
 * Stato condiviso di "Strategia & Setup".
 *
 * Mantiene un singolo oggetto strategia (gli input del calcolatore endurance) più
 * un key-value store generico per le Note di Setup e gli override dei circuiti.
 * Ogni modifica viene persistita su disco ed emessa come evento 'changed' così che
 * il main possa propagarla a TUTTE le finestre e all'eventuale ingegnere remoto:
 * pilota e ingegnere vedono e modificano la stessa strategia in tempo reale.
 */

import { EventEmitter } from 'events'
import fs from 'fs'
import path from 'path'

const DEFAULT_STRATEGY = {
  hours: 1,
  minutes: 0,
  lapTimeMs: 108000,
  consumption: 3.0,
  tankCapacity: 120,
  maxStintLaps: 0,
  track: 'monza',
  by: '—',
  at: null
}

export class StrategyStore extends EventEmitter {
  constructor(dir) {
    super()
    this.strategyFile = path.join(dir, 'strategy.json')
    this.kvFile = path.join(dir, 'setup-kv.json')
    fs.mkdirSync(dir, { recursive: true })
    this.strategy = this.readJson(this.strategyFile, { ...DEFAULT_STRATEGY })
    this.kv = this.readJson(this.kvFile, {})
  }

  getStrategy() {
    return this.strategy
  }

  /** Applica una modifica parziale alla strategia. origin: 'local' | 'remote'. */
  setStrategy(patch, origin = 'local') {
    this.strategy = {
      ...this.strategy,
      ...patch,
      at: Date.now()
    }
    this.writeJson(this.strategyFile, this.strategy)
    this.emit('changed', this.strategy, origin)
    return this.strategy
  }

  /** Sostituisce l'intera strategia (usato dagli aggiornamenti remoti). */
  replaceStrategy(strategy, origin = 'remote') {
    this.strategy = { ...DEFAULT_STRATEGY, ...strategy }
    this.writeJson(this.strategyFile, this.strategy)
    this.emit('changed', this.strategy, origin)
    return this.strategy
  }

  // ---- Key-value store (note setup / override piste) ---------------------

  kvList(prefix = '') {
    return Object.entries(this.kv)
      .filter(([k]) => k.startsWith(prefix))
      .map(([key, value]) => ({ key, value }))
  }

  kvGet(key) {
    return this.kv[key] ?? null
  }

  kvSet(key, value) {
    this.kv[key] = value
    this.writeJson(this.kvFile, this.kv)
    this.emit('kv-changed', { key, value })
    return value
  }

  kvDelete(key) {
    delete this.kv[key]
    this.writeJson(this.kvFile, this.kv)
    this.emit('kv-changed', { key, value: null })
    return true
  }

  // ---- IO helpers -------------------------------------------------------

  readJson(file, fallback) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch {
      return fallback
    }
  }

  writeJson(file, data) {
    try {
      fs.writeFileSync(file, JSON.stringify(data))
    } catch {
      /* ignora errori di scrittura non fatali */
    }
  }
}
