import { useEffect } from 'react'
import { Activity, BarChart3, GitCompareArrows, FolderOpen, Gauge, ClipboardList } from 'lucide-react'
import { useStore } from './store'
import { useTelemetry } from './hooks/useTelemetry'
import Sidebar from './components/Sidebar'
import LiveDashboard from './components/LiveDashboard'
import Analysis from './components/Analysis'
import Compare from './components/Compare'
import LapLibrary from './components/LapLibrary'
import StrategyAndSetup from './components/strategy/StrategyAndSetup'
import LiveSessionControl from './components/LiveSessionControl'
import UpdateToast from './components/UpdateToast'

const isMac = window.api?.platform === 'darwin'

const VIEWS = {
  live: { label: 'Live Dashboard', icon: Activity, comp: LiveDashboard },
  analysis: { label: 'Analisi', icon: BarChart3, comp: Analysis },
  compare: { label: 'Confronto', icon: GitCompareArrows, comp: Compare },
  strategy: { label: 'Race Strategy & Setup', icon: ClipboardList, comp: StrategyAndSetup },
  library: { label: 'Libreria Giri', icon: FolderOpen, comp: LapLibrary }
}

export default function App() {
  const view = useStore((s) => s.view)
  const setStatus = useStore((s) => s.setStatus)
  const refreshLaps = useStore((s) => s.refreshLaps)
  const { frame, history } = useTelemetry()

  useEffect(() => {
    refreshLaps()
    const offStatus = window.api.onStatus((s) => setStatus(s))
    const offSaved = window.api.onLapSaved(() => refreshLaps())
    return () => {
      offStatus?.()
      offSaved?.()
    }
  }, [refreshLaps, setStatus])

  const ActiveView = VIEWS[view].comp

  return (
    <div className="flex h-full w-full text-white/90">
      <Sidebar views={VIEWS} />
      <main className="flex-1 min-w-0 flex flex-col">
        <header
          className={`drag-region shrink-0 flex items-center justify-between px-6 border-b border-racing-border ${
            isMac ? 'h-14' : 'h-12'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold tracking-wide">
            <Gauge size={16} className="text-racing-accent" />
            {VIEWS[view].label}
          </div>
          <div className="no-drag flex items-center gap-3">
            <LiveSessionControl />
            <SourceBadge frame={frame} />
          </div>
        </header>
        <div className="flex-1 min-h-0 overflow-auto">
          <ActiveView frame={frame} history={history} />
        </div>
      </main>
      <UpdateToast />
    </div>
  )
}

function SourceBadge({ frame }) {
  const live = frame?.live
  return (
    <div className="no-drag flex items-center gap-2 text-xs">
      <span
        className={`h-2 w-2 rounded-full ${
          live ? 'bg-racing-green animate-pulse-fast' : 'bg-white/25'
        }`}
      />
      <span className="text-white/50">{frame ? 'ACC collegato' : 'In attesa di ACC…'}</span>
    </div>
  )
}
