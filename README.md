# ACC Telemetry Engineer 🏁

App desktop **cross-platform** (macOS / Windows) di telemetria per **Assetto Corsa
Competizione**, in stile *dark racing*. Pensata come strumento da ingegnere di pista:
dashboard in tempo reale, analisi post-sessione e **sovrapposizione di due giri**
(es. il tuo vs quello di un amico) per studiare distacchi e linee.

Stack: **Electron + React + Tailwind + Lucide + Recharts**.

---

## ✨ Funzionalità

1. **Acquisizione dati**
   - Lettura della **Shared Memory** di ACC su Windows (`acpmf_physics`,
     `acpmf_graphics`, `acpmf_static`) → tempi, delta, gomme (pressione/temperatura),
     carburante, input pedali/sterzo, marcia, RPM.
   - **Simulatore integrato**: l'app è subito utilizzabile su macOS o senza il gioco
     aperto, con un flusso di dati realistico.
2. **Dashboard Ingegnere di Pista** — velocità, marcia, barra RPM, traccia pedali e
   sterzo, gomme 2×2, carburante con autonomia stimata, traccia velocità live su Canvas.
3. **Analisi post-sessione** — grafici interattivi (Recharts) di velocità, gas/freno,
   RPM e marcia lungo il giro.
4. **Condivisione** — ogni giro completato viene salvato come **JSON leggero**;
   esportazione del singolo giro o **"Esporta tutto"** (intera telemetria in un unico
   file), importazione di giri e bundle con un click per scambiarli con altri piloti.
5. **Sovrapposizione (Overlay)** — carica due giri e sovrapponi le curve, con calcolo
   del **delta cumulato** punto per punto sul tracciato.
6. **Race Strategy & Setup** — modulo da muretto box (vedi sotto).

### 🏎️ Race Strategy & Setup

Tab dedicata con tre strumenti, **sincronizzati in tempo reale** tra pilota e
ingegnere (anche remoto, vedi sezione Sync):

- **Calcolatore Carburante & Strategia Endurance** — da durata gara, tempo sul giro,
  consumo, serbatoio e durata max stint calcola: litri totali, numero di pit stop,
  **giro esatto di rientro** e **litri da imbarcare a ogni sosta**, con margine di
  sicurezza di 1 giro. Pulsante "Da telemetria" per precompilare dai dati reali.
- **Database Piste & Setup** — 24 circuiti ufficiali ACC con consumo/tempo/usura
  indicativi, **sovrascrivibili** con i dati reali della telemetria, più **Note di
  Setup** salvate per combinazione Auto / Pista / Meteo.
- **Diagnostica Assetto (Ingegnere Virtuale)** — interfaccia guidata "Feedback Pilota":
  scegli fase e comportamento (sottosterzo, sovrasterzo, instabilità in frenata,
  spanciamento sui cordoli…) e ricevi le correzioni d'assetto ordinate per efficacia,
  basate sulla dinamica del veicolo ACC (ARB, altezze, differenziale, ali, pressioni…).

---

## 🚀 Sviluppo

```bash
npm install      # installa le dipendenze
npm run dev      # avvia in modalità sviluppo (hot reload)
```

All'avvio parte automaticamente il **simulatore**: dopo un paio di giri compariranno
i primi lap nella Libreria, pronti per analisi e confronto.

---

## 📦 Build degli eseguibili

Gli script usano **electron-builder**:

```bash
npm run build:win    # → dist/ACC Telemetry Engineer-1.0.0-setup.exe  (Windows, NSIS)
npm run build:mac    # → dist/ACC Telemetry Engineer-1.0.0-arm64.dmg  (macOS .dmg + .zip)
npm run build:all    # entrambe le piattaforme (richiede ambiente adatto)
```

> Nota: la build di Windows da macOS (e viceversa) richiede gli strumenti di cross-build
> di electron-builder; il modo più affidabile è compilare ogni target sul rispettivo SO
> (o via CI con runner Windows + macOS).

---

## 📡 Sessione Live: pilota + ingegnere in tempo reale

Due PC sulla stessa rete (LAN/Wi‑Fi) condividono **telemetria e strategia in diretta**,
con connessione **diretta peer‑to‑peer** (un solo hop = latenza minima, TCP_NODELAY,
nessuna compressione) e **auto‑discovery**: niente IP da digitare.

1. **PC del pilota** (con ACC): in alto clicca *Sessione Live → Ospita la sessione*.
   L'app avvia un server embedded e si annuncia sulla rete.
2. **PC dell'ingegnere**: *Sessione Live → Unisciti come ingegnere*. Il PC del pilota
   compare automaticamente nella lista: un click e sei connesso (in alternativa si può
   inserire `indirizzo:porta` manualmente).

Da quel momento l'ingegnere vede la **dashboard live**, i **grafici** e la **libreria
giri** che si popola in diretta, e può modificare la **strategia** che si sincronizza
istantaneamente con il pilota (il selettore di ruolo Pilota/Ingegnere etichetta chi
modifica). Porta di default: `8788` (TCP) + `48788` (UDP discovery).

### 🌍 Ingegnere remoto via Internet (da un'altra casa)

Quando i due PC NON sono sulla stessa rete, si usa la modalità **Remoto** con un relay
e un **codice‑stanza** — niente porte da aprire sul router (entrambi i PC fanno solo
connessioni in uscita verso il relay), e il relay inoltra **sia telemetria che strategia**.

```bash
# Su una macchina raggiungibile da entrambi (VPS, oppure rete esposta con ngrok/cloudflared)
npm run relay            # ws://0.0.0.0:8787  (PORT=9000 per cambiare porta)
```

Poi nell'app:
- **Pilota** → *Sessione Live → Ospita → Remoto*: incolla l'URL del relay → ottieni un
  **codice‑stanza** (es. `7K2P9`) da dare all'ingegnere.
- **Ingegnere** → *Sessione Live → Unisciti → Remoto*: stesso URL del relay + codice‑stanza.

L'ingegnere remoto vede così la **dashboard live**, i **grafici** e modifica la
**strategia** esattamente come in LAN. (In alternativa al relay, una VPN tipo Tailscale
rende trasparente anche la modalità LAN tra case diverse.)

## 🔄 Aggiornamenti automatici (auto-update)

L'app si aggiorna da sola via **GitHub Releases**: il tuo amico installa una volta sola,
poi a ogni nuova versione riceve in automatico **solo le parti cambiate** (blockmap) e
applica l'update con un click ("Riavvia e aggiorna"). Nessuna reinstallazione.

**Setup iniziale (una tantum):**
1. Crea un repository GitHub (anche pubblico) per l'app.
2. In `electron-builder.yml` imposta `publish.owner` (il tuo username) e `publish.repo`.
3. Crea un **Personal Access Token** GitHub (scope `repo`) ed esportalo:
   ```bash
   export GH_TOKEN=ghp_xxx
   ```

**Pubblicare un aggiornamento:**
```bash
# 1) alza la versione (es. 1.0.0 -> 1.0.1)
npm version patch --no-git-tag-version
# 2) builda e pubblica su GitHub Releases
npm run release
```
`electron-updater` carica l'installer + `latest.yml` (+ blockmap) sulla Release. Alla
successiva apertura, l'app dell'amico rileva la versione, scarica in background e mostra
il toast per riavviare. (Il primo invio all'amico è il normale `.exe` da `dist/`.)

> Su **Windows** funziona senza firma. Su **macOS** l'auto-update richiede firma +
> notarizzazione Apple (Developer ID); senza, l'aggiornamento va riscaricato a mano.

## 🔌 Abilitare i dati reali di ACC su Windows

ACC pubblica i dati su *named shared memory* di Windows, non leggibile da Node senza
un addon nativo. L'architettura è già predisposta: il `SharedMemoryReader` carica a
runtime un backend opzionale che esponga `readBuffer(name, size) → Buffer`.

1. Installa/fornisci un backend nativo (es. un piccolo addon su `OpenFileMapping`)
   pubblicato come `acc-shm-native` (o `@acc/shm`).
2. Avvia ACC e poi l'app: il `TelemetryManager` rileva il backend e passa
   automaticamente dalla sorgente *Simulatore* a *Shared Memory*.

Se il backend non è presente, l'app ricade in automatico sul simulatore — nessun crash.

---

## 🗂️ Struttura del progetto

```
src/
  main/                      # processo principale Electron
    index.js                 # finestra, IPC, dialog import/export
    telemetry/
      accStructs.js          # decoder delle struct Shared Memory ACC
      sharedMemoryReader.js   # sorgente Windows (backend nativo opzionale)
      simulator.js           # sorgente dati simulata (cross-platform)
      lapRecorder.js         # registrazione + ricampionamento giri (JSON)
      manager.js             # orchestrazione sorgenti + persistenza
    strategy/
      strategyStore.js       # stato condiviso strategia + key-value (note/override)
      remoteSync.js          # sync WebSocket opzionale (ingegnere remoto)
  preload/index.js           # bridge IPC sicuro (contextIsolation)
  renderer/                  # frontend React + Tailwind
    src/
      App.jsx
      store.js               # stato globale (zustand)
      hooks/                 # useTelemetry (stream live), useStrategy (sync strategia)
      lib/                   # tempi, dati giri, fuelCalc, accTracks, setupAdvice
      components/            # Sidebar, LiveDashboard, Analysis, Compare, LapLibrary, LiveTrace
        strategy/            # StrategyAndSetup, FuelStrategy, TrackDatabase, SetupDoctor
relay-server.mjs             # relay WebSocket standalone (npm run relay)
```

## 📄 Formato file giro (.json)

```jsonc
{
  "version": 1,
  "id": "monza_1717000000000",
  "meta": { "car": "...", "track": "monza", "driver": "You", "lapTimeMs": 105234, "date": "ISO", "source": "simulator" },
  "samples": {              // tutti gli array sono lunghi 200, indicizzati su distanza 0..1
    "d": [...],            // posizione normalizzata sul giro
    "speed": [...], "throttle": [...], "brake": [...],
    "steer": [...], "gear": [...], "rpm": [...], "time": [...]
  }
}
```

Il ricampionamento su griglia di distanza fissa rende **qualsiasi coppia di giri
direttamente sovrapponibile**, anche con tempi diversi.
