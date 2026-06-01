import { Timer, Fuel, Flag, Disc3, Activity } from 'lucide-react'
import { formatLapTime, formatDelta, prettyName } from '../lib/format'
import LiveTrace from './LiveTrace'

export default function LiveDashboard({ frame, history }) {
  if (!frame) {
    return (
      <div className="h-full flex items-center justify-center text-white/40">
        <div className="text-center animate-fade-in max-w-md px-6">
          <Activity size={40} className="mx-auto mb-3 opacity-40" />
          <div className="text-white/70 font-medium">In attesa di Assetto Corsa Competizione</div>
          <p className="text-sm mt-2 leading-relaxed">
            Avvia ACC ed entra in pista: la telemetria live comparirà qui automaticamente.
            Nel frattempo puoi usare la sezione <span className="text-white/60">Race Strategy &amp; Setup</span>
            o importare giri nella Libreria.
          </p>
        </div>
      </div>
    )
  }

  const { physics: p, graphics: g, statics: s } = frame
  const delta = g.deltaMs
  const fuelLaps = g.fuelPerLap > 0 ? p.fuel / g.fuelPerLap : 0

  return (
    <div className="p-5 grid grid-cols-12 gap-4 animate-fade-in">
      {/* Riga superiore: tempi e delta */}
      <div className="col-span-12 grid grid-cols-4 gap-4">
        <TimeCard icon={Flag} label="Giro" value={`#${g.lap}`} sub={prettyName(s.track)} />
        <TimeCard icon={Timer} label="Tempo Corrente" value={formatLapTime(g.currentTimeMs)} accent />
        <TimeCard
          icon={Timer}
          label="Delta / Best"
          value={formatDelta(delta)}
          sub={formatLapTime(g.bestTimeMs)}
          color={delta <= 0 ? 'text-racing-green' : 'text-racing-accent'}
        />
        <TimeCard icon={Timer} label="Ultimo Giro" value={formatLapTime(g.lastTimeMs)} />
      </div>

      {/* Colonna sinistra: velocità / marcia / rpm + pedali */}
      <div className="col-span-7 space-y-4">
        <div className="panel p-5 flex items-center gap-6">
          <Speedo speed={p.speedKmh} gear={p.gear} />
          <div className="flex-1">
            <RpmBar rpm={p.rpm} maxRpm={s.maxRpm} />
          </div>
        </div>

        <div className="panel p-5">
          <SectionTitle>Input Pilota</SectionTitle>
          <div className="grid grid-cols-3 gap-5 mt-4">
            <PedalBar label="Gas" value={p.throttle} color="bg-racing-green" />
            <PedalBar label="Freno" value={p.brake} color="bg-racing-accent" />
            <PedalBar label="Frizione" value={p.clutch} color="bg-racing-cyan" />
          </div>
          <Steering angle={p.steerAngle} />
        </div>

        <div className="panel p-4">
          <SectionTitle>Velocità (live)</SectionTitle>
          <LiveTrace history={history} />
        </div>
      </div>

      {/* Colonna destra: gomme + carburante */}
      <div className="col-span-5 space-y-4">
        <div className="panel p-5">
          <SectionTitle icon={Disc3}>Pneumatici</SectionTitle>
          <Tyres pressure={p.tyrePressure} temp={p.tyreCoreTemp} />
        </div>

        <div className="panel p-5">
          <SectionTitle icon={Fuel}>Carburante</SectionTitle>
          <div className="mt-4 flex items-end justify-between">
            <Metric value={p.fuel.toFixed(1)} unit="L" label="In serbatoio" big />
            <Metric value={g.fuelPerLap.toFixed(2)} unit="L/giro" label="Consumo" />
            <Metric
              value={Math.floor(fuelLaps)}
              unit="giri"
              label="Autonomia"
              color={fuelLaps < 3 ? 'text-racing-accent' : 'text-white'}
            />
          </div>
          <div className="mt-4 h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-racing-amber to-racing-green transition-all"
              style={{ width: `${Math.min(100, (p.fuel / s.maxFuel) * 100)}%` }}
            />
          </div>
        </div>

        <div className="panel p-5">
          <SectionTitle>Sessione</SectionTitle>
          <div className="mt-3 space-y-2 text-sm">
            <Row k="Auto" v={prettyName(s.carModel)} />
            <Row k="Pilota" v={s.playerName} />
            <Row k="Posizione" v={`P${g.position}`} />
            <Row k="Mescola" v={g.tyreCompound === 'dry' ? 'Slick' : 'Wet'} />
          </div>
        </div>
      </div>
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

function TimeCard({ icon: Icon, label, value, sub, accent, color }) {
  return (
    <div className={`panel p-4 ${accent ? 'ring-1 ring-racing-accent/30' : ''}`}>
      <div className="flex items-center gap-1.5 label">
        <Icon size={11} /> {label}
      </div>
      <div className={`mt-1.5 text-2xl num font-semibold ${color || 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-white/40 num mt-0.5">{sub}</div>}
    </div>
  )
}

function Speedo({ speed, gear }) {
  const gearLabel = gear <= 0 ? (gear === 0 ? 'N' : 'R') : gear
  return (
    <div className="text-center">
      <div className="text-6xl num font-bold leading-none">{Math.round(speed)}</div>
      <div className="label mt-1">km/h</div>
      <div className="mt-3 inline-flex items-center justify-center h-14 w-14 rounded-xl bg-racing-accent/15 text-racing-accent">
        <span className="text-3xl num font-bold">{gearLabel}</span>
      </div>
    </div>
  )
}

function RpmBar({ rpm, maxRpm }) {
  const pct = Math.min(100, (rpm / maxRpm) * 100)
  const danger = pct > 92
  return (
    <div>
      <div className="flex justify-between label mb-1">
        <span>RPM</span>
        <span className="num text-white/70">
          {rpm} / {maxRpm}
        </span>
      </div>
      <div className="h-6 rounded-md bg-white/5 overflow-hidden flex">
        {Array.from({ length: 40 }).map((_, i) => {
          const on = i / 40 <= pct / 100
          const seg = i / 40
          const c = seg > 0.92 ? 'bg-racing-accent' : seg > 0.78 ? 'bg-racing-amber' : 'bg-racing-green'
          return (
            <div
              key={i}
              className={`flex-1 mx-px rounded-sm transition-opacity ${on ? c : 'bg-transparent'} ${
                danger && on ? 'animate-pulse-fast' : ''
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}

function PedalBar({ label, value, color }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-40 w-9 rounded-lg bg-white/5 overflow-hidden">
        <div
          className={`absolute bottom-0 left-0 right-0 ${color} transition-[height] duration-75`}
          style={{ height: `${pct}%` }}
        />
      </div>
      <div className="num text-lg font-semibold mt-2">{pct}</div>
      <div className="label">{label}</div>
    </div>
  )
}

function Steering({ angle }) {
  const deg = angle * 180 // -1..1 mappato a ±180°
  return (
    <div className="mt-5 flex items-center gap-3">
      <span className="label">Sterzo</span>
      <div className="relative flex-1 h-1 rounded-full bg-white/10">
        <div className="absolute left-1/2 top-1/2 -translate-y-1/2 h-3 w-px bg-white/30" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-racing-cyan transition-all"
          style={{ left: `calc(${50 + angle * 50}% - 6px)` }}
        />
      </div>
      <span className="num text-sm text-white/70 w-14 text-right">{Math.round(deg)}°</span>
    </div>
  )
}

function Tyres({ pressure, temp }) {
  const pos = ['Ant. Sx', 'Ant. Dx', 'Post. Sx', 'Post. Dx']
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      {pressure.map((press, i) => {
        const t = temp[i]
        const tempColor =
          t < 70 ? 'text-racing-cyan' : t > 100 ? 'text-racing-accent' : 'text-racing-green'
        return (
          <div key={i} className="panel-2 p-3">
            <div className="label">{pos[i]}</div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="num text-xl font-semibold">{press.toFixed(1)}</span>
              <span className="text-[10px] text-white/40">psi</span>
            </div>
            <div className={`num text-sm mt-0.5 ${tempColor}`}>{Math.round(t)}°C</div>
          </div>
        )
      })}
    </div>
  )
}

function Metric({ value, unit, label, big, color = 'text-white' }) {
  return (
    <div>
      <div className={`num font-semibold ${color} ${big ? 'text-3xl' : 'text-xl'}`}>
        {value}
        <span className="text-xs text-white/40 ml-1">{unit}</span>
      </div>
      <div className="label mt-0.5">{label}</div>
    </div>
  )
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between">
      <span className="text-white/45">{k}</span>
      <span className="text-white/85 font-medium">{v}</span>
    </div>
  )
}
