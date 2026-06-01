/**
 * Calcolatore carburante & strategia endurance.
 *
 * Modella una gara a tempo (timed race, come ACC): si calcola il numero di giri
 * percorribili, il fabbisogno totale di carburante con margine di sicurezza, il
 * numero di pit stop, i giri esatti di rientro e i litri da imbarcare a ogni sosta.
 */

function round(v, p = 1) {
  const f = 10 ** p
  return Math.round(v * f) / f
}

export function formatClock(ms) {
  if (!ms || ms < 0) return '0:00'
  const totMin = Math.floor(ms / 60000)
  const h = Math.floor(totMin / 60)
  const m = totMin % 60
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}

/**
 * @param {object} p
 * @param {number} p.hours          durata gara (ore)
 * @param {number} p.minutes        durata gara (minuti)
 * @param {number} p.lapTimeMs      tempo medio sul giro (ms)
 * @param {number} p.consumption    consumo medio per giro (litri)
 * @param {number} p.tankCapacity   capacità massima serbatoio (litri)
 * @param {number} p.maxStintLaps   durata max stint in giri (0 = nessun limite regolamentare)
 * @param {number} [p.safetyLaps]   giri di margine (default 1)
 */
export function computeStrategy(p) {
  const hours = num(p.hours)
  const minutes = num(p.minutes)
  const lapTimeMs = num(p.lapTimeMs)
  const consumption = num(p.consumption)
  const tankCapacity = num(p.tankCapacity)
  const maxStintLaps = num(p.maxStintLaps)
  const safetyLaps = p.safetyLaps ?? 1

  const raceMs = (hours * 60 + minutes) * 60000
  if (raceMs <= 0 || lapTimeMs <= 0 || consumption <= 0 || tankCapacity <= 0) {
    return { valid: false, reason: 'Inserisci durata, tempo sul giro, consumo e serbatoio.' }
  }

  // In una gara a tempo si completa anche il giro iniziato allo scadere del tempo.
  const raceLaps = Math.floor(raceMs / lapTimeMs) + 1
  const targetLaps = raceLaps + safetyLaps // giri "da coprire col carburante"

  const lapsPerTank = Math.floor(tankCapacity / consumption)
  if (lapsPerTank <= 0) {
    return { valid: false, reason: 'Serbatoio troppo piccolo: non copre nemmeno un giro.' }
  }

  // Limite stint = il più stringente tra autonomia serbatoio e regolamento.
  const stintLimit = maxStintLaps > 0 ? Math.min(lapsPerTank, maxStintLaps) : lapsPerTank

  const numStints = Math.max(1, Math.ceil(raceLaps / stintLimit))
  const pitStops = numStints - 1

  // Distribuzione il più uniforme possibile dei giri tra gli stint.
  const base = Math.floor(raceLaps / numStints)
  let extra = raceLaps - base * numStints

  const stints = []
  let lapCursor = 0
  let totalFuel = 0

  for (let i = 0; i < numStints; i++) {
    const isLast = i === numStints - 1
    const laps = base + (extra > 0 ? 1 : 0)
    if (extra > 0) extra--

    // Il margine di sicurezza viene caricato sull'ultimo stint (si finisce con +1 giro).
    const fuelLaps = laps + (isLast ? safetyLaps : 0)
    const fuel = Math.min(round(fuelLaps * consumption, 1), tankCapacity)
    totalFuel += fuel

    lapCursor += laps
    stints.push({
      index: i + 1,
      laps,
      pitInLap: isLast ? null : lapCursor, // giro in cui rientrare ai box
      fuelToLoad: fuel, // litri da avere a inizio stint (= rifornimento alla sosta precedente)
      fuelLaps: round(fuelLaps, 1)
    })
  }

  return {
    valid: true,
    raceLaps,
    targetLaps,
    raceTimeLabel: formatClock(raceMs),
    lapsPerTank,
    stintLimit,
    pitStops,
    startFuel: stints[0].fuelToLoad,
    totalFuel: round(totalFuel, 1),
    fuelMargin: round(safetyLaps * consumption, 1),
    avgFuelPerStop: pitStops > 0 ? round((totalFuel - stints[0].fuelToLoad) / pitStops, 1) : 0,
    stints
  }
}

function num(v) {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}
