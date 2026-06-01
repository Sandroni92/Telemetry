import { useCallback, useEffect, useState } from 'react'

/**
 * Stato della sessione live + azioni (host / join / leave / discovery).
 * Lo stato è guidato dal main process via eventi 'live:state' / 'live:discovered'.
 */
export function useLiveSession() {
  const [state, setState] = useState({ mode: 'offline', connected: false, peers: 0 })
  const [discovered, setDiscovered] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    window.api.liveGetState().then(setState)
    const offState = window.api.onLiveState(setState)
    const offDisc = window.api.onLiveDiscovered(setDiscovered)
    const offErr = window.api.onLiveError((m) => setError(m))
    return () => {
      offState?.()
      offDisc?.()
      offErr?.()
    }
  }, [])

  const host = useCallback(() => window.api.liveHost(), [])
  const join = useCallback((h, p) => window.api.liveJoin(h, p), [])
  const hostRelay = useCallback((url, room) => window.api.liveHostRelay(url, room), [])
  const joinRelay = useCallback((url, room) => window.api.liveJoinRelay(url, room), [])
  const leave = useCallback(() => {
    setDiscovered([])
    return window.api.liveLeave()
  }, [])
  const startDiscovery = useCallback(() => window.api.liveDiscoverStart(), [])
  const stopDiscovery = useCallback(() => window.api.liveDiscoverStop(), [])

  return {
    state,
    discovered,
    error,
    clearError: () => setError(null),
    host,
    join,
    hostRelay,
    joinRelay,
    leave,
    startDiscovery,
    stopDiscovery
  }
}
