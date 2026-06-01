import { contextBridge, ipcRenderer } from 'electron'

/**
 * API sicura esposta al renderer. Nessun accesso diretto a Node dal frontend:
 * tutto passa per canali IPC tipizzati.
 */
const api = {
  platform: process.platform,

  // Telemetria live
  startTelemetry: (source = 'auto') => ipcRenderer.invoke('telemetry:start', source),
  stopTelemetry: () => ipcRenderer.invoke('telemetry:stop'),
  getSource: () => ipcRenderer.invoke('telemetry:source'),
  isSharedMemoryAvailable: () => ipcRenderer.invoke('telemetry:shm-available'),

  onFrame: (cb) => {
    const h = (_e, f) => cb(f)
    ipcRenderer.on('telemetry:frame', h)
    return () => ipcRenderer.removeListener('telemetry:frame', h)
  },
  onStatus: (cb) => {
    const h = (_e, s) => cb(s)
    ipcRenderer.on('telemetry:status', h)
    return () => ipcRenderer.removeListener('telemetry:status', h)
  },
  onLapSaved: (cb) => {
    const h = (_e, l) => cb(l)
    ipcRenderer.on('laps:saved', h)
    return () => ipcRenderer.removeListener('laps:saved', h)
  },

  // Libreria giri
  listLaps: () => ipcRenderer.invoke('laps:list'),
  loadLap: (id) => ipcRenderer.invoke('laps:load', id),
  deleteLap: (id) => ipcRenderer.invoke('laps:delete', id),
  importLaps: () => ipcRenderer.invoke('laps:import'),
  exportLap: (id) => ipcRenderer.invoke('laps:export', id),
  exportAllLaps: () => ipcRenderer.invoke('laps:export-all'),

  // Strategia condivisa (sync live pilota <-> ingegnere)
  getStrategy: () => ipcRenderer.invoke('strategy:get'),
  setStrategy: (patch) => ipcRenderer.invoke('strategy:set', patch),
  onStrategyChanged: (cb) => {
    const h = (_e, s) => cb(s)
    ipcRenderer.on('strategy:changed', h)
    return () => ipcRenderer.removeListener('strategy:changed', h)
  },
  getSyncStatus: () => ipcRenderer.invoke('sync:status'),
  onSyncStatus: (cb) => {
    const h = (_e, s) => cb(s)
    ipcRenderer.on('sync:status', h)
    return () => ipcRenderer.removeListener('sync:status', h)
  },

  // Key-value store: note di setup e override piste
  kvList: (prefix = '') => ipcRenderer.invoke('kv:list', prefix),
  kvGet: (key) => ipcRenderer.invoke('kv:get', key),
  kvSet: (key, value) => ipcRenderer.invoke('kv:set', key, value),
  kvDelete: (key) => ipcRenderer.invoke('kv:delete', key),
  onKvChanged: (cb) => {
    const h = (_e, e) => cb(e)
    ipcRenderer.on('strategy:kv-changed', h)
    return () => ipcRenderer.removeListener('strategy:kv-changed', h)
  },

  // Sessione live (telemetria + strategia in tempo reale, pilota <-> ingegnere)
  liveGetState: () => ipcRenderer.invoke('live:state'),
  liveHost: () => ipcRenderer.invoke('live:host'),
  liveJoin: (host, port) => ipcRenderer.invoke('live:join', host, port),
  liveHostRelay: (relayUrl, room) => ipcRenderer.invoke('live:host-relay', relayUrl, room),
  liveJoinRelay: (relayUrl, room) => ipcRenderer.invoke('live:join-relay', relayUrl, room),
  liveLeave: () => ipcRenderer.invoke('live:leave'),
  liveDiscoverStart: () => ipcRenderer.invoke('live:discover-start'),
  liveDiscoverStop: () => ipcRenderer.invoke('live:discover-stop'),
  liveDiscovered: () => ipcRenderer.invoke('live:discovered'),
  onLiveState: (cb) => {
    const h = (_e, s) => cb(s)
    ipcRenderer.on('live:state', h)
    return () => ipcRenderer.removeListener('live:state', h)
  },
  onLiveDiscovered: (cb) => {
    const h = (_e, l) => cb(l)
    ipcRenderer.on('live:discovered', h)
    return () => ipcRenderer.removeListener('live:discovered', h)
  },
  onLiveError: (cb) => {
    const h = (_e, m) => cb(m)
    ipcRenderer.on('live:error', h)
    return () => ipcRenderer.removeListener('live:error', h)
  },

  // Auto-update
  checkUpdate: () => ipcRenderer.invoke('update:check'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateAvailable: (cb) => {
    const h = (_e, v) => cb(v)
    ipcRenderer.on('update:available', h)
    return () => ipcRenderer.removeListener('update:available', h)
  },
  onUpdateProgress: (cb) => {
    const h = (_e, p) => cb(p)
    ipcRenderer.on('update:progress', h)
    return () => ipcRenderer.removeListener('update:progress', h)
  },
  onUpdateDownloaded: (cb) => {
    const h = (_e, v) => cb(v)
    ipcRenderer.on('update:downloaded', h)
    return () => ipcRenderer.removeListener('update:downloaded', h)
  }
}

contextBridge.exposeInMainWorld('api', api)
