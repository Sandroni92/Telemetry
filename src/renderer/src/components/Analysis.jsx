import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { BarChart3 } from 'lucide-react'
import { useStore } from '../store'
import { lapToRows } from '../lib/lapData'
import { formatLapTime, prettyName } from '../lib/format'

export default function Analysis() {
  const laps = useStore((s) => s.laps)
  const [lapId, setLapId] = useState(null)
  const [lap, setLap] = useState(null)

  useEffect(() => {
    if (!lapId && laps.length) setLapId(laps[0].id)
  }, [laps, lapId])

  useEffect(() => {
    if (lapId) window.api.loadLap(lapId).then(setLap)
  }, [lapId])

  if (!laps.length) return <Empty />

  const rows = lap ? lapToRows(lap) : []

  return (
    <div className="p-5 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <select
          value={lapId || ''}
          onChange={(e) => setLapId(e.target.value)}
          className="no-drag bg-racing-panel2 border border-racing-border rounded-lg px-3 py-2 text-sm outline-none"
        >
          {laps.map((l) => (
            <option key={l.id} value={l.id}>
              {prettyName(l.meta.track)} · {l.meta.driver} · {formatLapTime(l.meta.lapTimeMs)}
            </option>
          ))}
        </select>
        {lap && (
          <span className="num text-sm text-white/50">
            {formatLapTime(lap.meta.lapTimeMs)} · {prettyName(lap.meta.car)}
          </span>
        )}
      </div>

      <Chart title="Velocità (km/h)">
        <LineChart data={rows}>
          {axes()}
          <Line type="monotone" dataKey="speed" stroke="#06b6d4" dot={false} strokeWidth={2} />
        </LineChart>
      </Chart>

      <Chart title="Gas / Freno (%)">
        <AreaChart data={rows}>
          {axes(true)}
          <Area type="monotone" dataKey="throttle" stroke="#22c55e" fill="rgba(34,197,94,0.2)" dot={false} />
          <Area type="monotone" dataKey="brake" stroke="#e10600" fill="rgba(225,6,0,0.2)" dot={false} />
        </AreaChart>
      </Chart>

      <div className="grid grid-cols-2 gap-4">
        <Chart title="RPM" small>
          <LineChart data={rows}>
            {axes()}
            <Line type="monotone" dataKey="rpm" stroke="#f59e0b" dot={false} strokeWidth={2} />
          </LineChart>
        </Chart>
        <Chart title="Marcia" small>
          <LineChart data={rows}>
            {axes()}
            <Line type="stepAfter" dataKey="gear" stroke="#a855f7" dot={false} strokeWidth={2} />
          </LineChart>
        </Chart>
      </div>
    </div>
  )
}

function axes(pct) {
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
      <YAxis
        tick={{ fill: '#6b7280', fontSize: 11 }}
        tickLine={false}
        axisLine={false}
        width={38}
        domain={pct ? [0, 100] : ['auto', 'auto']}
      />
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

function Chart({ title, children, small }) {
  return (
    <div className="panel p-4">
      <div className="label mb-2">{title}</div>
      <ResponsiveContainer width="100%" height={small ? 180 : 220}>
        {children}
      </ResponsiveContainer>
    </div>
  )
}

function Empty() {
  return (
    <div className="h-full flex items-center justify-center text-white/40">
      <div className="text-center">
        <BarChart3 size={40} className="mx-auto mb-3 opacity-40" />
        Nessun giro registrato. Lascia girare la dashboard live o importa un giro.
      </div>
    </div>
  )
}
