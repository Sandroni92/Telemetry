import { useEffect, useRef, useState } from 'react'

const HISTORY = 600 // ~20s di storico live a 30Hz per le sparkline

/**
 * Sottoscrive il flusso di frame dal main process. Espone l'ultimo frame e un
 * ring-buffer di storico recente, senza causare re-render eccessivi.
 */
export function useTelemetry() {
  const [frame, setFrame] = useState(null)
  const historyRef = useRef([])

  useEffect(() => {
    window.api.startTelemetry('auto')
    const off = window.api.onFrame((f) => {
      const h = historyRef.current
      h.push(f)
      if (h.length > HISTORY) h.shift()
      setFrame(f)
    })
    return () => {
      off?.()
      window.api.stopTelemetry()
    }
  }, [])

  return { frame, history: historyRef }
}
