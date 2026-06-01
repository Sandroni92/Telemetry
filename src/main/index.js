import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { TelemetryManager } from './telemetry/manager.js'
import { StrategyStore } from './strategy/strategyStore.js'
import { RemoteSync } from './strategy/remoteSync.js'
import { LiveSession } from './live/liveSession.js'
import { setupUpdater } from './updater.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow = null
let telemetry = null
let strategy = null
let remote = null
let live = null

function broadcast(channel, payload) {
  BrowserWindow.getAllWindows().forEach((w) => w.webContents.send(channel, payload))
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    backgroundColor: '#0a0c10',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    title: 'ACC Telemetry Engineer',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

function setupTelemetry() {
  const lapsDir = path.join(app.getPath('userData'), 'laps')
  telemetry = new TelemetryManager(lapsDir)

  telemetry.on('frame', (f) => {
    mainWindow?.webContents.send('telemetry:frame', f)
    live?.sendTelemetry(f) // se in hosting, inoltra all'ingegnere
  })
  telemetry.on('status', (s) => mainWindow?.webContents.send('telemetry:status', s))
  telemetry.on('lap-saved', (l) => mainWindow?.webContents.send('laps:saved', l))

  // ---- IPC handlers ------------------------------------------------------
  ipcMain.handle('telemetry:start', (_e, source) => telemetry.start(source))
  ipcMain.handle('telemetry:stop', () => telemetry.stop())
  ipcMain.handle('telemetry:source', () => telemetry.sourceName)
  ipcMain.handle('telemetry:shm-available', () => telemetry.shm.available)

  ipcMain.handle('laps:list', () => telemetry.listLaps())
  ipcMain.handle('laps:load', (_e, id) => telemetry.loadLap(id))
  ipcMain.handle('laps:delete', (_e, id) => telemetry.deleteLap(id))

  ipcMain.handle('laps:import', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Importa giro',
      filters: [{ name: 'Lap JSON', extensions: ['json'] }],
      properties: ['openFile', 'multiSelections']
    })
    if (res.canceled) return []
    let imported = []
    for (const file of res.filePaths) {
      try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'))
        imported = imported.concat(telemetry.importData(data))
      } catch (err) {
        dialog.showErrorBox('Import fallito', `${file}\n${err.message}`)
      }
    }
    return imported
  })

  ipcMain.handle('laps:export', async (_e, id) => {
    const lap = telemetry.loadLap(id)
    if (!lap) return false
    const res = await dialog.showSaveDialog(mainWindow, {
      title: 'Esporta giro',
      defaultPath: `${lap.meta.track}_${lap.meta.driver}_${formatLapName(lap.meta.lapTimeMs)}.json`,
      filters: [{ name: 'Lap JSON', extensions: ['json'] }]
    })
    if (res.canceled || !res.filePath) return false
    fs.writeFileSync(res.filePath, JSON.stringify(lap, null, 2))
    shell.showItemInFolder(res.filePath)
    return true
  })

  // Esporta tutta la telemetria (tutti i giri) in un unico file condivisibile.
  ipcMain.handle('laps:export-all', async () => {
    const bundle = telemetry.exportBundle()
    if (bundle.count === 0) return false
    const stamp = new Date().toISOString().slice(0, 10)
    const res = await dialog.showSaveDialog(mainWindow, {
      title: 'Esporta tutta la telemetria',
      defaultPath: `telemetria_acc_${stamp}_${bundle.count}giri.json`,
      filters: [{ name: 'Telemetry Bundle', extensions: ['json'] }]
    })
    if (res.canceled || !res.filePath) return false
    fs.writeFileSync(res.filePath, JSON.stringify(bundle))
    shell.showItemInFolder(res.filePath)
    return true
  })
}

function setupStrategy() {
  strategy = new StrategyStore(path.join(app.getPath('userData'), 'strategy'))
  remote = new RemoteSync(process.env.STRATEGY_RELAY_URL || '')

  // Ogni modifica (locale o remota) viene propagata a tutte le finestre.
  strategy.on('changed', (s, origin) => {
    broadcast('strategy:changed', s)
    if (origin !== 'remote') {
      remote.sendStrategy(s)
      live?.sendStrategy(s) // propaga sulla sessione live (host<->ingegnere)
    }
  })
  strategy.on('kv-changed', (e) => broadcast('strategy:kv-changed', e))

  // Aggiornamenti in arrivo dall'ingegnere remoto.
  remote.on('remote-strategy', (s) => strategy.replaceStrategy(s, 'remote'))
  remote.on('status', (st) => broadcast('sync:status', st))
  remote.start()

  ipcMain.handle('strategy:get', () => strategy.getStrategy())
  ipcMain.handle('strategy:set', (_e, patch) => strategy.setStrategy(patch, 'local'))
  ipcMain.handle('sync:status', () => remote.status)

  ipcMain.handle('kv:list', (_e, prefix) => strategy.kvList(prefix))
  ipcMain.handle('kv:get', (_e, key) => strategy.kvGet(key))
  ipcMain.handle('kv:set', (_e, key, value) => strategy.kvSet(key, value))
  ipcMain.handle('kv:delete', (_e, key) => strategy.kvDelete(key))
}

function setupLive() {
  live = new LiveSession()

  live.on('state', (st) => broadcast('live:state', st))
  live.on('discovered', (list) => broadcast('live:discovered', list))
  live.on('error', (msg) => broadcast('live:error', msg))

  // Frame ricevuti da remoto (lato ingegnere) -> alimentano dashboard + libreria.
  live.on('telemetry', (frame) => telemetry?.ingestRemoteFrame(frame))
  // Strategia ricevuta da remoto -> applicata e ridistribuita.
  live.on('strategy', (s) => strategy?.replaceStrategy(s, 'remote'))

  ipcMain.handle('live:state', () => live.state)
  ipcMain.handle('live:host', () => live.startHost())
  ipcMain.handle('live:join', (_e, host, port) => live.joinHost(host, port))
  ipcMain.handle('live:host-relay', (_e, relayUrl, room) => live.startHostRelay(relayUrl, room))
  ipcMain.handle('live:join-relay', (_e, relayUrl, room) => live.joinRelay(relayUrl, room))
  ipcMain.handle('live:leave', () => {
    live.stopDiscovery()
    live.stop()
  })
  ipcMain.handle('live:discover-start', () => live.startDiscovery())
  ipcMain.handle('live:discover-stop', () => live.stopDiscovery())
  ipcMain.handle('live:discovered', () => live.discoveredList())
}

function formatLapName(ms) {
  const m = Math.floor(ms / 60000)
  const s = ((ms % 60000) / 1000).toFixed(3)
  return `${m}m${s}s`
}

app.whenReady().then(() => {
  setupTelemetry()
  setupStrategy()
  setupLive()
  setupUpdater(broadcast)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  telemetry?.stop()
  remote?.stop()
  live?.stop()
  if (process.platform !== 'darwin') app.quit()
})
