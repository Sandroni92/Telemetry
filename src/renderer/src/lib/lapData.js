/**
 * Helper per trasformare i file giro (campionati su griglia 0..1) in dataset
 * pronti per Recharts e per il confronto/sovrapposizione di due giri.
 */

/** Costruisce un array di righe per i grafici di un singolo giro. */
export function lapToRows(lap) {
  const { samples } = lap
  return samples.d.map((d, i) => ({
    d: Math.round(d * 100), // percentuale del giro
    speed: samples.speed[i],
    throttle: Math.round(samples.throttle[i] * 100),
    brake: Math.round(samples.brake[i] * 100),
    steer: samples.steer[i],
    gear: samples.gear[i],
    rpm: samples.rpm[i]
  }))
}

/**
 * Unisce due giri sulla stessa griglia di distanza per la sovrapposizione.
 * Calcola anche il delta cumulato di tempo (giro B rispetto a giro A) lungo il
 * tracciato, in millisecondi, basato sui timestamp campionati.
 */
export function overlayRows(lapA, lapB) {
  const n = Math.min(lapA.samples.d.length, lapB.samples.d.length)
  const rows = []
  for (let i = 0; i < n; i++) {
    const tA = lapA.samples.time[i]
    const tB = lapB.samples.time[i]
    rows.push({
      d: Math.round(lapA.samples.d[i] * 100),
      speedA: lapA.samples.speed[i],
      speedB: lapB.samples.speed[i],
      throttleA: Math.round(lapA.samples.throttle[i] * 100),
      throttleB: Math.round(lapB.samples.throttle[i] * 100),
      brakeA: Math.round(lapA.samples.brake[i] * 100),
      brakeB: Math.round(lapB.samples.brake[i] * 100),
      steerA: lapA.samples.steer[i],
      steerB: lapB.samples.steer[i],
      // delta > 0 => B è più lento di A in quel punto
      delta: (tB - tA) / 1000
    })
  }
  return rows
}

export function lapLabel(lap) {
  return `${lap.meta.driver} · ${formatTrack(lap.meta.track)}`
}

function formatTrack(slug = '') {
  return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
