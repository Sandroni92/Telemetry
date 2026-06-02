/**
 * Relay WebSocket con STANZE per la sessione live via Internet (versione standalone).
 *
 * NOTA: dalla v1 puoi generare il relay DIRETTAMENTE nell'app
 * (Sessione Live → Ospita → Remoto → "Genera relay sicuro nell'app"), senza avviare
 * nulla a mano. Questo script resta utile se preferisci un relay sempre attivo su un
 * VPS condiviso da più sessioni.
 *
 * Pilota e ingegnere si collegano allo stesso relay e alla stessa stanza: il relay
 * inoltra telemetria e strategia tra i membri. Nessuno deve aprire porte sul proprio
 * router, perché entrambi fanno solo connessioni in USCITA verso il relay.
 *
 * Sicurezza: ogni stanza è protetta da un token. Con RELAY_TOKEN imposti un token
 * unico per tutte le stanze del server; senza, ogni stanza adotta il token con cui
 * il primo client (il pilota) la crea — l'app lo inserisce nell'invito.
 *
 * Avvio:   npm run relay                       (porta 8787)
 *          PORT=9000 RELAY_TOKEN=segreto npm run relay
 */

import { startRelay } from './src/main/live/relayCore.js'

const PORT = Number(process.env.PORT) || 8787
const TOKEN = process.env.RELAY_TOKEN || null

startRelay({ port: PORT, token: TOKEN, log: (m) => console.log(m) })
  .then(() => {
    console.log(`🏁 Relay (stanze) in ascolto su ws://0.0.0.0:${PORT}`)
    console.log(
      TOKEN
        ? '🔒 Token globale attivo: i client devono presentare RELAY_TOKEN.'
        : '🔒 Ogni stanza usa il token del primo client (incluso nell’invito dell’app).'
    )
  })
  .catch((e) => {
    console.error(`Impossibile avviare il relay sulla porta ${PORT}:`, e.message)
    process.exit(1)
  })
