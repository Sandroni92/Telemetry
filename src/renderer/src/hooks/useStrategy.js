import { useCallback, useEffect, useState } from 'react'

/**
 * Strategia condivisa con aggiornamento in tempo reale.
 * Ogni modifica viene inviata al main, persistita e ri-trasmessa a tutte le
 * istanze (incluso l'ingegnere remoto). L'update locale è ottimistico per non
 * far "saltare" gli input mentre si digita.
 */
export function useStrategy() {
  const [strategy, setStrategy] = useState(null)
  const [sync, setSync] = useState({ mode: 'local' })

  useEffect(() => {
    window.api.getStrategy().then(setStrategy)
    window.api.getSyncStatus().then(setSync)
    const offStrat = window.api.onStrategyChanged(setStrategy)
    const offSync = window.api.onSyncStatus(setSync)
    return () => {
      offStrat?.()
      offSync?.()
    }
  }, [])

  const update = useCallback((patch, by) => {
    const full = by ? { ...patch, by } : patch
    setStrategy((s) => ({ ...(s || {}), ...full })) // ottimistico
    window.api.setStrategy(full)
  }, [])

  return { strategy, update, sync }
}
