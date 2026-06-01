import { useEffect, useMemo, useState } from 'react'
import { Database, Save, Trash2, ChevronRight, NotebookPen, Wand2 } from 'lucide-react'
import { ACC_TRACKS, WEATHER_OPTIONS, findTrack } from '../../lib/accTracks'
import { formatLapTime } from '../../lib/format'

const ACC_CARS = [
  'Ferrari 296 GT3',
  'Porsche 992 GT3 R',
  'Lamborghini Huracán GT3 EVO2',
  'Mercedes-AMG GT3 EVO',
  'BMW M4 GT3',
  'Audi R8 LMS EVO II',
  'McLaren 720S GT3 EVO',
  'Aston Martin V8 Vantage GT3',
  'Ford Mustang GT3',
  'Corvette Z06 GT3.R'
]

export default function TrackDatabase({ strategy, update, role }) {
  const [overrides, setOverrides] = useState({})
  const [selected, setSelected] = useState('monza')

  useEffect(() => {
    window.api.kvList('track:').then((entries) => {
      const map = {}
      entries.forEach((e) => (map[e.key.replace('track:', '')] = e.value))
      setOverrides(map)
    })
  }, [])

  const track = findTrack(selected)
  const ov = overrides[selected] || {}
  const merged = { ...track, ...ov }

  const saveOverride = (patch) => {
    const next = { ...ov, ...patch }
    setOverrides((o) => ({ ...o, [selected]: next }))
    window.api.kvSet(`track:${selected}`, next)
  }

  const applyToStrategy = () => {
    update({ track: selected, lapTimeMs: merged.refLapMs, consumption: merged.fuelPerLap }, role)
  }

  return (
    <div className="p-5 grid grid-cols-12 gap-4 animate-fade-in">
      {/* Lista piste */}
      <div className="col-span-4 panel p-3 max-h-[calc(100vh-9rem)] overflow-auto">
        <div className="label px-2 mb-2 flex items-center gap-2">
          <Database size={12} /> Circuiti ACC ({ACC_TRACKS.length})
        </div>
        <div className="space-y-0.5">
          {ACC_TRACKS.map((t) => {
            const edited = overrides[t.slug]
            return (
              <button
                key={t.slug}
                onClick={() => setSelected(t.slug)}
                className={`no-drag w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                  selected === t.slug ? 'bg-racing-accent/15 text-white' : 'text-white/65 hover:bg-white/5'
                }`}
              >
                <span>{t.country}</span>
                <span className="flex-1 text-left truncate">{t.name}</span>
                {edited && <span className="h-1.5 w-1.5 rounded-full bg-racing-cyan" title="Dati telemetria" />}
                <ChevronRight size={14} className="opacity-40" />
              </button>
            )
          })}
        </div>
      </div>

      {/* Dettaglio pista + override */}
      <div className="col-span-8 space-y-4">
        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                {merged.country} {merged.name}
              </h3>
              <p className="text-sm text-white/40">{merged.lengthKm} km · valori GT3 indicativi</p>
            </div>
            <button
              onClick={applyToStrategy}
              className="no-drag flex items-center gap-2 bg-racing-accent hover:bg-racing-accent/85 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
            >
              <Wand2 size={15} /> Usa nella strategia
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <EditStat
              label="Tempo rif. sul giro"
              display={formatLapTime(merged.refLapMs)}
              value={(merged.refLapMs / 1000).toFixed(1)}
              unit="s"
              onCommit={(v) => saveOverride({ refLapMs: Math.round(parseFloat(v) * 1000) })}
            />
            <EditStat
              label="Consumo"
              display={`${merged.fuelPerLap} L`}
              value={merged.fuelPerLap}
              unit="L/giro"
              step="0.1"
              onCommit={(v) => saveOverride({ fuelPerLap: parseFloat(v) })}
            />
            <div className="panel-2 p-3">
              <div className="label">Usura gomme</div>
              <select
                value={merged.tyreWear}
                onChange={(e) => saveOverride({ tyreWear: e.target.value })}
                className="no-drag mt-1.5 w-full bg-transparent text-lg font-semibold outline-none"
              >
                {['Bassa', 'Media', 'Alta'].map((w) => (
                  <option key={w} value={w} className="bg-racing-panel">
                    {w}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {overrides[selected] && (
            <p className="text-[11px] text-racing-cyan mt-3">
              ● Valori sovrascritti con i tuoi dati reali (salvati). Modificali quando vuoi.
            </p>
          )}
        </div>

        <SetupNotes cars={ACC_CARS} defaultTrack={selected} role={role} />
      </div>
    </div>
  )
}

function EditStat({ label, display, value, unit, step = '1', onCommit }) {
  const [editing, setEditing] = useState(false)
  return (
    <div className="panel-2 p-3">
      <div className="label">{label}</div>
      {editing ? (
        <input
          autoFocus
          type="number"
          step={step}
          defaultValue={value}
          onBlur={(e) => {
            onCommit(e.target.value)
            setEditing(false)
          }}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="no-drag mt-1 w-full bg-racing-bg border border-racing-accent/50 rounded px-2 py-1 text-lg num outline-none"
        />
      ) : (
        <button onClick={() => setEditing(true)} className="no-drag text-left mt-1">
          <span className="num text-lg font-semibold">{display}</span>
          <span className="text-[11px] text-white/40 ml-1">{unit}</span>
        </button>
      )}
    </div>
  )
}

function SetupNotes({ cars, defaultTrack, role }) {
  const [notes, setNotes] = useState([])
  const [car, setCar] = useState(cars[0])
  const [trackSlug, setTrackSlug] = useState(defaultTrack)
  const [weather, setWeather] = useState(WEATHER_OPTIONS[0])
  const [text, setText] = useState('')

  const load = () => window.api.kvList('note:').then(setNotes)
  useEffect(() => {
    load()
    const off = window.api.onKvChanged((e) => {
      if (e.key.startsWith('note:')) load()
    })
    return () => off?.()
  }, [])
  useEffect(() => setTrackSlug(defaultTrack), [defaultTrack])

  const key = `note:${car}|${trackSlug}|${weather}`
  const trackName = useMemo(() => findTrack(trackSlug)?.name || trackSlug, [trackSlug])

  // Precompila se esiste già una nota per la combinazione.
  useEffect(() => {
    const existing = notes.find((n) => n.key === key)
    setText(existing?.value?.text || '')
  }, [key, notes])

  const save = () => {
    if (!text.trim()) return
    window.api.kvSet(key, { car, track: trackSlug, weather, text: text.trim(), by: role, at: Date.now() })
  }
  const remove = (k) => window.api.kvDelete(k)

  return (
    <div className="panel p-5">
      <div className="label flex items-center gap-2 mb-3">
        <NotebookPen size={12} /> Note di Setup — combinazione Auto / Pista / Meteo
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Select label="Auto" value={car} onChange={setCar} options={cars} />
        <Select
          label="Pista"
          value={trackSlug}
          onChange={setTrackSlug}
          options={ACC_TRACKS.map((t) => ({ value: t.slug, label: t.name }))}
        />
        <Select label="Meteo" value={weather} onChange={setWeather} options={WEATHER_OPTIONS} />
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Setup per ${car} · ${trackName} · ${weather}…\nEs: ARB ant. 3, ala 6, pressioni 26.8/26.5, brake bias 54%`}
        rows={4}
        className="no-drag mt-3 w-full bg-racing-panel2 border border-racing-border rounded-lg px-3 py-2 text-sm outline-none focus:border-racing-accent/60 resize-none font-mono"
      />
      <div className="flex justify-end mt-2">
        <button
          onClick={save}
          disabled={!text.trim()}
          className="no-drag flex items-center gap-2 bg-racing-green/90 hover:bg-racing-green text-black text-sm font-semibold px-3.5 py-2 rounded-lg disabled:opacity-30 transition-colors"
        >
          <Save size={15} /> Salva nota
        </button>
      </div>

      {notes.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="label">Note salvate ({notes.length})</div>
          {notes.map((n) => (
            <div key={n.key} className="panel-2 p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">
                  {n.value.car} · {findTrack(n.value.track)?.name || n.value.track}
                  <span className="text-white/40 font-normal"> · {n.value.weather}</span>
                </div>
                <div className="text-xs text-white/55 whitespace-pre-wrap mt-1 font-mono">{n.value.text}</div>
                {n.value.by && <div className="text-[10px] text-white/30 mt-1">— {n.value.by}</div>}
              </div>
              <button
                onClick={() => remove(n.key)}
                className="no-drag text-white/40 hover:text-racing-accent transition-colors"
                title="Elimina"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Select({ label, value, onChange, options }) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="no-drag mt-1 w-full bg-racing-panel2 border border-racing-border rounded-lg px-2.5 py-2 text-sm outline-none focus:border-racing-accent/60"
      >
        {opts.map((o) => (
          <option key={o.value} value={o.value} className="bg-racing-panel">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
