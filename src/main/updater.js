/**
 * Auto-update tramite electron-updater (feed: GitHub Releases).
 *
 * All'avvio (solo in app impacchettata) controlla se c'è una nuova versione, la
 * scarica in background — sfruttando i blockmap per scaricare SOLO le parti
 * cambiate — e notifica il renderer. L'utente applica l'update con un click
 * ("Riavvia e aggiorna"), senza reinstallare nulla.
 */

import { app, ipcMain } from 'electron'
import electronUpdater from 'electron-updater'

const { autoUpdater } = electronUpdater
const CHECK_INTERVAL_MS = 1000 * 60 * 60 * 6 // ricontrolla ogni 6 ore

export function setupUpdater(broadcast) {
  // In sviluppo l'updater non è applicabile: si esce silenziosamente.
  if (!app.isPackaged) {
    ipcMain.handle('update:check', () => ({ dev: true }))
    ipcMain.handle('update:install', () => false)
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => broadcast('update:available', info.version))
  autoUpdater.on('update-not-available', () => broadcast('update:none', null))
  autoUpdater.on('download-progress', (p) => broadcast('update:progress', Math.round(p.percent)))
  autoUpdater.on('update-downloaded', (info) => broadcast('update:downloaded', info.version))
  autoUpdater.on('error', (err) => broadcast('update:error', String(err?.message || err)))

  ipcMain.handle('update:check', () => autoUpdater.checkForUpdates().catch(() => null))
  ipcMain.handle('update:install', () => {
    // quitAndInstall chiude l'app e installa l'aggiornamento già scaricato.
    setImmediate(() => autoUpdater.quitAndInstall())
    return true
  })

  // Primo controllo poco dopo l'avvio + controlli periodici.
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 4000)
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), CHECK_INTERVAL_MS)
}
