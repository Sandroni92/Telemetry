import { useEffect, useState } from 'react'
import {
  ComposedChart,
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer
} from 'recharts'
import { GitCompareArrows } from 'lucide-react'
import { useStore } from '../store'
import { overlayRows } from '../lib/lapData'
import { formatLapTime, formatDelta, prettyName } from '../lib/format'

const COLOR_A = '#06b6d4'
const COLOR_B = '#f59e0b'

export default function Compare() {
  const laps = useStore((s) => s.laps)
  const selectedA = useStore((s) => s.selectedA)
  const selectedB = useStore((s) => s.selectedB)
  const selectLap = useStore((s) => s.selectLap)

  const [lapA, setLapA] = useState(null)
  const [lapB, setLapB] = useState(null)

  useEffect(() => {
    if (selectedA) window.api.loadLap(selectedA).then(setLapA)
    else setLapA(null)
  }, [selectedA])
  useEffect(() => {
    if (selectedB) window.api.loadLap(selectedB).then(setLapB)
    else setLapB(null)
  }, [selectedB])

  if (laps.length < 2) {
    return (
      <div className="h-full flex items-center justify-center text-white/40">
        <div className="text-center">
          <GitCompareArrows size={40} className="mx-auto mb-3 opacity-40" />
          Servono almeno due giri per il confronto.
          <br />
          Importane uno dal tuo amico nella Libreria.
        </div>
      </div>
    )
  }

  const ready = lapA && lapB
  const rows = ready ? overlayRows(lapA, lapB) : []
  const finalDelta = rows.length ? rows.at(-1).delta * 1000 : 0

  return (
    <div className="p-5 space-y-4 animate-fade-in">
      <div className="grid grid-cols-2 gap-4">
        <LapPicker
          label="Giro A"
          color={COLOR_A}
          laps={laps}
          value={selectedA}
          onChange={(id) => selectLap('A', id)}
          lap={lapA}
        />
        <LapPicker
          label="Giro B"
          color={COLOR_B}
          laps={laps}
          value={selectedB}
          onChange={(id) => selectLap('B', id)}
          lap={lapB}
        />
      </div>

      {!ready ? (
        <div className="panel p-10 text-center text-white/40">
          Seleziona due giri da sovrapporre.
        </div>
      ) : (
        <>
          <div className="panel p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="label">Delta cumulato (B vs A)</span>
              <span
                className={`num font-semibold ${
                  finalDelta <= 0 ? 'text-racing-green' : 'text-racing-accent'
                }`}
              >
                Finale: {formatDelta(finalDelta)}s
              </span>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <ComposedChart data={rows}>
                {axes()}
                <ReferenceLine y={0} stroke="#4b5563" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="delta"
                  stroke="#a855f7"
                  fill="rgba(168,85,247,0.18)"
                  dot={false}
                  name="Delta (s)"
                />
              </ComposedChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-white/35 mt-1">
              Sopra lo zero = il giro B perde tempo rispetto ad A in quel punto del tracciato.
            </p>
          </div>

          <OverlayChart title="Velocità (km/h)" rows={rows} keyA="speedA" keyB="speedB" />
          <div className="grid grid-cols-2 gap-4">
            <OverlayChart title="Gas (%)" rows={rows} keyA="throttleA" keyB="throttleB" small />
            <OverlayChart title="Freno (%)" rows={rows} keyA="brakeA" keyB="brakeB" small />
          </div>
          <OverlayChart title="Sterzo" rows={rows} keyA="steerA" keyB="steerB" small />
        </>
      )}
    </div>
  )
}

function LapPicker({ label, color, laps, value, onChange, lap }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <span className="label">{label}</span>
        {lap && (
          <span className="num text-sm ml-auto" style={{ color }}>
            {formatLapTime(lap.meta.lapTimeMs)}
          </span>
        )}
      </div>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="no-drag w-full bg-racing-panel2 border border-racing-border rounded-lg px-3 py-2 text-sm outline-none"
      >
        <option value="">— seleziona —</option>
        {laps.map((l) => (
          <option key={l.id} value={l.id}>
            {prettyName(l.meta.track)} · {l.meta.driver} · {formatLapTime(l.meta.lapTimeMs)}
          </option>
        ))}
      </select>
    </div>
  )
}

function OverlayChart({ title, rows, keyA, keyB, small }) {
  return (
    <div className="panel p-4">
      <div className="label mb-2">{title}</div>
      <ResponsiveContainer width="100%" height={small ? 180 : 230}>
        <LineChart data={rows}>
          {axes()}
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey={keyA} stroke={COLOR_A} dot={false} strokeWidth={2} name="A" />
          <Line type="monotone" dataKey={keyB} stroke={COLOR_B} dot={false} strokeWidth={2} name="B" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function axes() {
  return (
    <>
      <CartesianGrid stroke="#232834" vertical={false} />
      <XAxis
        dataKey="d"
        tick={{ fill: '#6b7280', fontSize: 11 }}
        tickLine={false}
        axisLine={{ stroke: '#232834' }}
        unit="%"
      />
      <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} width={42} />
      <Tooltip
        contentStyle={{
          background: '#12151c',
          border: '1px solid #232834',
          borderRadius: 8,
          fontSize: 12
        }}
        labelFormatter={(v) => `${v}% giro`}
      />
    </>
  )
}
