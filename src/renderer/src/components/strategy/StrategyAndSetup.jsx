import { useState } from 'react'
import { Fuel, Database, Stethoscope, Radio, Wifi, WifiOff } from 'lucide-react'
import { useStrategy } from '../../hooks/useStrategy'
import FuelStrategy from './FuelStrategy'
import TrackDatabase from './TrackDatabase'
import SetupDoctor from './SetupDoctor'

const TABS = [
  {
    id: 'fuel',
    label: 'Carburante & Strategia',
    icon: Fuel,
    desc: 'Inserisci i dati gara a sinistra: a destra ottieni litri, soste e giri di rientro.'
  },
  {
    id: 'tracks',
    label: 'Database Piste & Setup',
    icon: Database,
    desc: 'Consulta i circuiti ACC, sovrascrivi i valori con la tua telemetria e salva le note di setup.'
  },
  {
    id: 'doctor',
    label: 'Diagnostica Assetto',
    icon: Stethoscope,
    desc: "Dì all'ingegnere virtuale come si comporta l'auto: ti propone le correzioni d'assetto."
  }
]

// Ruolo locale: etichetta le modifiche nello scambio pilota <-> ingegnere.
function useRole() {
  const [role, setRole] = useState(() => localStorage.getItem('acc-role') || 'Pilota')
  const change = (r) => {
    localStorage.setItem('acc-role', r)
    setRole(r)
  }
  return [role, change]
}

export default function StrategyAndSetup({ frame }) {
  const [tab, setTab] = useState('fuel')
  const [role, setRole] = useRole()
  const { strategy, update, sync } = useStrategy()
  const activeTab = TABS.find((t) => t.id === tab)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-racing-border">
        <div className="flex gap-1.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`no-drag flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === id ? 'bg-racing-accent/15 text-white' : 'text-white/55 hover:bg-white/5'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <RoleSelector role={role} setRole={setRole} />
          <SyncBadge sync={sync} updatedBy={strategy?.by} />
        </div>
      </div>

      <div className="px-5 py-2.5 border-b border-racing-border bg-racing-panel/40 text-xs text-white/45">
        {activeTab?.desc}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {tab === 'fuel' && <FuelStrategy strategy={strategy} update={update} role={role} frame={frame} />}
        {tab === 'tracks' && <TrackDatabase strategy={strategy} update={update} role={role} />}
        {tab === 'doctor' && <SetupDoctor />}
      </div>
    </div>
  )
}

function RoleSelector({ role, setRole }) {
  return (
    <div className="no-drag flex items-center rounded-lg bg-racing-panel2 border border-racing-border p-0.5 text-xs">
      {['Pilota', 'Ingegnere'].map((r) => (
        <button
          key={r}
          onClick={() => setRole(r)}
          className={`px-2.5 py-1 rounded-md transition-colors ${
            role === r ? 'bg-racing-accent text-white' : 'text-white/55'
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  )
}

function SyncBadge({ sync, updatedBy }) {
  const remote = sync?.mode === 'remote'
  const connected = remote && sync.connected
  const Icon = connected ? Wifi : remote ? WifiOff : Radio
  const color = connected ? 'text-racing-green' : remote ? 'text-racing-amber' : 'text-white/50'
  const text = connected ? 'Remoto · live' : remote ? 'Remoto · offline' : 'Sync locale'
  return (
    <div className="flex items-center gap-2 text-xs" title={updatedBy ? `Ultima modifica: ${updatedBy}` : ''}>
      <Icon size={14} className={`${color} ${connected ? 'animate-pulse-fast' : ''}`} />
      <span className="text-white/50">{text}</span>
    </div>
  )
}
