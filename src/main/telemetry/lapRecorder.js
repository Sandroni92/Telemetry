/**
 * Registra i giri in tempo reale e li finalizza in un formato JSON leggero,
 * ricampionato su una griglia fissa di posizione normalizzata (0..1) così che
 * due giri qualsiasi siano direttamente sovrapponibili.
 */

const SAMPLES = 200 // punti per giro sulla griglia di distanza normalizzata
export const LAP_FILE_VERSION = 1

export class LapRecorder {
  constructor() {
    this.raw = []
    this.lastPos = 0
    this.lastLap = null
    this.meta = null
  }

  /** Ritorna un oggetto lap finalizzato quando un giro si completa, altrimenti null. */
  push(frame) {
    const pos = frame.graphics.normalizedCarPosition
    let finished = null

    // Rilevamento traguardo: la posizione "torna indietro" da ~1 a ~0.
    const wrapped = pos + 0.5 < this.lastPos
    if (wrapped && this.raw.length > 20) {
      finished = this.finalize(frame)
      this.raw = []
    }
    this.lastPos = pos

    this.raw.push({
      d: pos,
      speed: frame.physics.speedKmh,
      throttle: frame.physics.throttle,
      brake: frame.physics.brake,
      steer: frame.physics.steerAngle,
      gear: frame.physics.gear,
      rpm: frame.physics.rpm,
      t: frame.graphics.currentTimeMs
    })

    this.meta = {
      car: frame.statics.carModel,
      track: frame.statics.track,
      driver: frame.statics.playerName,
      compound: frame.graphics.tyreCompound
    }

    return finished
  }

  finalize(frame) {
    const lapTimeMs = frame.graphics.lastTimeMs || (this.raw.at(-1)?.t ?? 0)
    const sorted = [...this.raw].sort((a, b) => a.d - b.d)
    const channels = {
      d: [],
      speed: [],
      throttle: [],
      brake: [],
      steer: [],
      gear: [],
      rpm: [],
      time: []
    }

    for (let i = 0; i < SAMPLES; i++) {
      const d = i / (SAMPLES - 1)
      const s = interpAt(sorted, d)
      channels.d.push(round(d, 4))
      channels.speed.push(round(s.speed, 1))
      channels.throttle.push(round(s.throttle, 3))
      channels.brake.push(round(s.brake, 3))
      channels.steer.push(round(s.steer, 3))
      channels.gear.push(Math.round(s.gear))
      channels.rpm.push(Math.round(s.rpm))
      channels.time.push(Math.round((s.t / (sorted.at(-1)?.t || 1)) * lapTimeMs))
    }

    return {
      version: LAP_FILE_VERSION,
      id: `${this.meta.track}_${Date.now()}`,
      meta: {
        ...this.meta,
        lapTimeMs,
        date: new Date().toISOString(),
        source: frame.source
      },
      samples: channels
    }
  }
}

function interpAt(sorted, d) {
  if (sorted.length === 0) return { speed: 0, throttle: 0, brake: 0, steer: 0, gear: 0, rpm: 0, t: 0 }
  // ricerca lineare semplice (200 punti, costo trascurabile)
  let lo = sorted[0]
  let hi = sorted.at(-1)
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].d <= d && sorted[i + 1].d >= d) {
      lo = sorted[i]
      hi = sorted[i + 1]
      break
    }
  }
  const span = hi.d - lo.d || 1
  const t = Math.min(1, Math.max(0, (d - lo.d) / span))
  const mix = (k) => lo[k] + (hi[k] - lo[k]) * t
  return {
    speed: mix('speed'),
    throttle: mix('throttle'),
    brake: mix('brake'),
    steer: mix('steer'),
    gear: mix('gear'),
    rpm: mix('rpm'),
    t: mix('t')
  }
}

function round(v, p) {
  const f = 10 ** p
  return Math.round(v * f) / f
}
