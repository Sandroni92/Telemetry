import { useEffect, useState } from 'react'
import { Download, RefreshCw, X } from 'lucide-react'

/**
 * Notifica di aggiornamento in basso a destra:
 * - mostra il download in corso (con percentuale)
 * - a download completato propone "Riavvia e aggiorna"
 */
export default function UpdateToast() {
  const [phase, setPhase] = useState(null) // 'downloading' | 'ready'
  const [version, setVersion] = useState(null)
  const [progress, setProgress] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const offA = window.api.onUpdateAvailable((v) => {
      setVersion(v)
      setPhase('downloading')
      setDismissed(false)
    })
    const offP = window.api.onUpdateProgress((p) => setProgress(p))
    const offD = window.api.onUpdateDownloaded((v) => {
      setVersion(v)
      setPhase('ready')
      setDismissed(false)
    })
    return () => {
      offA?.()
      offP?.()
      offD?.()
    }
  }, [])

  if (!phase || dismissed) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 w-80 panel p-4 shadow-2xl animate-fade-in">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-white/40 hover:text-white"
      >
        <X size={15} />
      </button>

      {phase === 'downloading' ? (
        <>
          <div className="flex items-center gap-2 font-medium text-sm">
            <Download size={16} className="text-racing-cyan" />
            Download aggiornamento {version}
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-racing-cyan transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-[11px] text-white/40 num mt-1.5">{progress}%</div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 font-medium text-sm">
            <RefreshCw size={16} className="text-racing-green" />
            Aggiornamento {version} pronto
          </div>
          <p className="text-xs text-white/45 mt-1">
            Riavvia per applicarlo. I tuoi dati e giri restano salvati.
          </p>
          <button
            onClick={() => window.api.installUpdate()}
            className="btn-accent w-full mt-3"
          >
            <RefreshCw size={15} /> Riavvia e aggiorna
          </button>
        </>
      )}
    </div>
  )
}
