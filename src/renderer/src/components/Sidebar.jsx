import { useStore } from '../store'

const isMac = window.api?.platform === 'darwin'

export default function Sidebar({ views }) {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const laps = useStore((s) => s.laps)

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-racing-panel border-r border-racing-border">
      <div
        className={`drag-region flex items-center px-5 border-b border-racing-border ${
          isMac ? 'h-14 pl-[78px]' : 'h-12'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="h-6 w-1.5 rounded-full bg-racing-accent" />
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-wide">ACC TELEMETRY</div>
            <div className="text-[10px] text-white/40 tracking-[0.2em]">RACE ENGINEER</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {Object.entries(views).map(([key, { label, icon: Icon }]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`nav-btn w-full ${view === key ? 'nav-btn-active' : ''}`}
          >
            <Icon size={17} />
            <span>{label}</span>
            {key === 'library' && laps.length > 0 && (
              <span className="ml-auto text-[10px] num bg-white/10 px-1.5 py-0.5 rounded">
                {laps.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-racing-border">
        <div className="text-[10px] text-white/30 leading-relaxed">
          v1.0.0 · Cross-platform
          <br />
          Shared Memory & UDP ready
        </div>
      </div>
    </aside>
  )
}
