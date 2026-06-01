import { Upload, Download, Trash2, GitCompareArrows, FolderOpen, Share2 } from 'lucide-react'
import { useStore } from '../store'
import { formatLapTime, prettyName, formatDate } from '../lib/format'

export default function LapLibrary() {
  const laps = useStore((s) => s.laps)
  const refreshLaps = useStore((s) => s.refreshLaps)
  const selectLap = useStore((s) => s.selectLap)
  const setView = useStore((s) => s.setView)
  const selectedA = useStore((s) => s.selectedA)
  const selectedB = useStore((s) => s.selectedB)

  const handleImport = async () => {
    await window.api.importLaps()
    refreshLaps()
  }

  const handleExport = (id) => window.api.exportLap(id)
  const handleExportAll = () => window.api.exportAllLaps()

  const handleDelete = async (id) => {
    await window.api.deleteLap(id)
    refreshLaps()
  }

  const assign = (id) => {
    // Assegna allo slot libero, poi vai al confronto.
    if (!selectedA || selectedA === id) selectLap('A', id)
    else selectLap('B', id)
    setView('compare')
  }

  return (
    <div className="p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Libreria Giri</h2>
          <p className="text-sm text-white/40">
            {laps.length} giri salvati · esporta/importa JSON leggeri per il confronto
          </p>
        </div>
        <div className="flex items-center gap-2">
          {laps.length > 0 && (
            <button
              onClick={handleExportAll}
              title="Esporta tutti i giri in un unico file da condividere"
              className="no-drag flex items-center gap-2 border border-racing-border hover:border-white/25 hover:bg-white/5 text-white/80 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Share2 size={15} /> Esporta tutto
            </button>
          )}
          <button
            onClick={handleImport}
            className="no-drag flex items-center gap-2 bg-racing-accent hover:bg-racing-accent/85 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Upload size={15} /> Importa
          </button>
        </div>
      </div>

      {laps.length === 0 ? (
        <div className="panel p-12 text-center text-white/40">
          <FolderOpen size={40} className="mx-auto mb-3 opacity-40" />
          Nessun giro ancora. Lascia girare la Live Dashboard: ogni giro completato
          viene salvato automaticamente qui.
        </div>
      ) : (
        <div className="space-y-2">
          {laps.map((l) => {
            const slot = selectedA === l.id ? 'A' : selectedB === l.id ? 'B' : null
            return (
              <div
                key={l.id}
                className="panel p-3.5 flex items-center gap-4 hover:border-white/15 transition-colors"
              >
                <div className="h-10 w-1 rounded-full bg-racing-accent/60" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {prettyName(l.meta.track)}
                    <span className="text-white/35 font-normal"> · {prettyName(l.meta.car)}</span>
                  </div>
                  <div className="text-xs text-white/40 flex gap-3 mt-0.5">
                    <span>{l.meta.driver}</span>
                    <span>{formatDate(l.meta.date)}</span>
                    <span className="uppercase">{l.meta.source}</span>
                  </div>
                </div>
                <div className="num text-lg font-semibold text-racing-cyan">
                  {formatLapTime(l.meta.lapTimeMs)}
                </div>
                <div className="flex items-center gap-1.5 no-drag">
                  {slot && (
                    <span className="text-[10px] num bg-white/10 px-2 py-1 rounded">Slot {slot}</span>
                  )}
                  <IconBtn title="Confronta" onClick={() => assign(l.id)}>
                    <GitCompareArrows size={15} />
                  </IconBtn>
                  <IconBtn title="Esporta JSON" onClick={() => handleExport(l.id)}>
                    <Download size={15} />
                  </IconBtn>
                  <IconBtn title="Elimina" danger onClick={() => handleDelete(l.id)}>
                    <Trash2 size={15} />
                  </IconBtn>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function IconBtn({ children, onClick, title, danger }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors ${
        danger ? 'text-white/50 hover:text-racing-accent hover:bg-racing-accent/10' : 'text-white/55 hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}
