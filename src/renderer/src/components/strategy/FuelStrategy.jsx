import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Fuel, Flag, Timer, Gauge, Download, ArrowRightLeft, AlertTriangle } from 'lucide-react'
import { computeStrategy } from '../../lib/fuelCalc'
import { formatLapTime } from '../../lib/format'

export default function FuelStrategy({ strategy, update, role, frame }) {
  if (!strategy) return <div className="p-6 text-white/40">Caricamento strategia…</div>

  const result = computeStrategy(strategy)
  const set = (patch) => update(patch, role)

  const prefillFromTelemetry = () => {
    if (!frame) return
    const lapMs = frame.graphics.bestTimeMs || frame.graphics.lastTimeMs
    set({
      ...(lapMs ? { lapTimeMs: lapMs } : {}),
      ...(frame.graphics.fuelPerLap > 0 ? { consumption: round(frame.graphics.fuelPerLap, 2) } : {}),
      ...(frame.statics.maxFuel > 0 ? { tankCapacity: Math.round(frame.statics.maxFuel) } : {})
    })
  }

  return (
    <div className="p-5 grid grid-cols-12 gap-4 animate-fade-in">
      {/* Input */}
      <div className="col-span-4 panel p-5 space-y-4">
        <div className="flex items-center justify-between">
          <SectionTitle icon={Fuel}>Parametri Gara</SectionTitle>
          <button
            onClick={prefillFromTelemetry}
            disabled={!frame}
            className="no-drag flex items-center gap-1.5 text-[11px] text-racing-cyan hover:text-white disabled:opacity-30 transition-colors"
          >
            <Download size={12} /> Da telemetria
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumField label="Durata (ore)" value={strategy.hours} min={0} max={24} onChange={(v) => set({ hours: v })} />
          <NumField label="Durata (min)" value={strategy.minutes} min={0} max={59} onChange={(v) => set({ minutes: v })} />
        </div>

        <LapTimeField label="Tempo medio sul giro" ms={strategy.lapTimeMs} onChange={(ms) => set({ lapTimeMs: ms })} />

        <div className="grid grid-cols-2 gap-3">
          <NumField label="Consumo (L/giro)" value={strategy.consumption} step={0.1} onChange={(v) => set({ consumption: v })} />
          <NumField label="Serbatoio (L)" value={strategy.tankCapacity} onChange={(v) => set({ tankCapacity: v })} />
        </div>

        <NumField
          label="Stint max (giri) — 0 = nessun limite"
          value={strategy.maxStintLaps}
          onChange={(v) => set({ maxStintLaps: v })}
        />
      </div>

      {/* Output */}
      <div className="col-span-8 space-y-4">
        {!result.valid ? (
          <div className="panel p-8 flex items-center gap-3 text-white/50">
            <AlertTriangle size={20} className="text-racing-amber" />
            {result.reason}
          </div>
        ) : (
          <>
            <PlanBanner result={result} />

            <div className="grid grid-cols-4 gap-3">
              <Stat icon={Flag} label="Giri gara" value={result.raceLaps} sub={result.raceTimeLabel} />
              <Stat icon={Fuel} label="Carburante totale" value={`${result.totalFuel} L`} sub={`+${result.fuelMargin} L margine`} accent />
              <Stat icon={ArrowRightLeft} label="Pit stop" value={result.pitStops} sub={`${result.stints.length} stint`} />
              <Stat icon={Gauge} label="Imbarco iniziale" value={`${result.startFuel} L`} sub={`max ${result.stintLimit} giri/stint`} />
            </div>

            <div className="panel p-4">
              <SectionTitle>Carburante per stint</SectionTitle>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={result.stints.map((s) => ({ name: `S${s.index}`, fuel: s.fuelToLoad, laps: s.laps }))}>
                  <CartesianGrid stroke="#232834" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#232834' }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} width={34} unit="L" />
                  <Tooltip
                    contentStyle={{ background: '#12151c', border: '1px solid #232834', borderRadius: 8, fontSize: 12 }}
                    formatter={(v, k) => (k === 'fuel' ? [`${v} L`, 'Carburante'] : [v, 'Giri'])}
                  />
                  <Bar dataKey="fuel" radius={[4, 4, 0, 0]}>
                    {result.stints.map((s, i) => (
                      <Cell key={i} fill={i === 0 ? '#06b6d4' : '#e10600'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="panel p-4">
              <SectionTitle icon={ArrowRightLeft}>Piano pit stop</SectionTitle>
              <div className="mt-3 space-y-1.5">
                <Row head />
                {result.stints.map((s) => (
                  <Row
                    key={s.index}
                    stint={s.index}
                    laps={s.laps}
                    pit={s.pitInLap}
                    fuel={s.fuelToLoad}
                  />
                ))}
              </div>
              <p className="text-[11px] text-white/35 mt-3">
                Strategia calcolata per concludere con ~1 giro di margine di sicurezza. I litri indicati
                sono la quantità da avere a inizio stint (= rifornimento alla sosta precedente).
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function PlanBanner({ result }) {
  const pits = result.stints.filter((s) => s.pitInLap).map((s) => s.pitInLap)
  const refuels = result.stints.slice(1).map((s) => s.fuelToLoad)

  return (
    <div className="panel p-4 ring-1 ring-racing-accent/25 bg-gradient-to-br from-racing-accent/[0.08] to-transparent">
      <div className="label text-racing-accent mb-1.5">Piano gara</div>
      {result.pitStops === 0 ? (
        <p className="text-sm leading-relaxed">
          Parti con <B>{result.startFuel} L</B> e vai dritto al traguardo:{' '}
          <B>nessuna sosta</B> necessaria per {result.raceLaps} giri, arrivando con ~1 giro di margine.
        </p>
      ) : (
        <p className="text-sm leading-relaxed">
          Parti con <B>{result.startFuel} L</B>. Fai <B>{result.pitStops}</B>{' '}
          {result.pitStops === 1 ? 'sosta' : 'soste'} al{' '}
          <B>giro {pits.join(', ')}</B>, rifornendo <B>{refuels.join(' L · ')} L</B>.{' '}
          Totale carburante: <B>{result.totalFuel} L</B> ({result.raceLaps} giri, margine ~1 giro).
        </p>
      )}
    </div>
  )
}

function B({ children }) {
  return <span className="num font-semibold text-white">{children}</span>
}

function Row({ head, stint, laps, pit, fuel }) {
  if (head) {
    return (
      <div className="grid grid-cols-4 gap-2 label px-2">
        <span>Stint</span>
        <span>Giri</span>
        <span>Rientro box</span>
        <span className="text-right">Imbarco</span>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-4 gap-2 items-center px-2 py-2 rounded-lg bg-white/[0.03] text-sm num">
      <span className="font-semibold">#{stint}</span>
      <span>{laps}</span>
      <span className={pit ? 'text-racing-amber' : 'text-racing-green'}>
        {pit ? `giro ${pit}` : '— traguardo —'}
      </span>
      <span className="text-right font-semibold text-racing-cyan">{fuel} L</span>
    </div>
  )
}

function SectionTitle({ children, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 label">
      {Icon && <Icon size={12} />}
      {children}
    </div>
  )
}

function Stat({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className={`panel p-3.5 ${accent ? 'ring-1 ring-racing-accent/30' : ''}`}>
      <div className="flex items-center gap-1.5 label">
        <Icon size={11} /> {label}
      </div>
      <div className="num text-2xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-[11px] text-white/40 num mt-0.5">{sub}</div>}
    </div>
  )
}

function NumField({ label, value, onChange, step = 1, min, max }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        type="number"
        value={value ?? ''}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(clamp(parseFloat(e.target.value) || 0, min, max))}
        className="no-drag mt-1 w-full bg-racing-panel2 border border-racing-border rounded-lg px-3 py-2 text-sm num outline-none focus:border-racing-accent/60"
      />
    </label>
  )
}

function LapTimeField({ label, ms, onChange }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        type="text"
        defaultValue={formatLapTime(ms)}
        key={ms}
        onBlur={(e) => onChange(parseLapInput(e.target.value, ms))}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        placeholder="1:48.200"
        className="no-drag mt-1 w-full bg-racing-panel2 border border-racing-border rounded-lg px-3 py-2 text-sm num outline-none focus:border-racing-accent/60"
      />
    </label>
  )
}

function parseLapInput(str, fallback) {
  const m = String(str).trim().match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/)
  if (!m) return fallback
  const min = parseInt(m[1] || '0', 10)
  const sec = parseFloat(m[2])
  return Math.round((min * 60 + sec) * 1000)
}

function clamp(v, min, max) {
  if (min != null && v < min) return min
  if (max != null && v > max) return max
  return v
}

function round(v, p) {
  const f = 10 ** p
  return Math.round(v * f) / f
}
