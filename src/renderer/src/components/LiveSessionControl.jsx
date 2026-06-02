import { useEffect, useState } from 'react'
import {
  Radio,
  Wifi,
  X,
  MonitorSmartphone,
  Cast,
  Copy,
  Check,
  Users,
  Search,
  Laptop,
  Plug,
  ArrowLeft,
  CircleDot,
  Globe,
  Network,
  ShieldCheck
} from 'lucide-react'
import { useLiveSession } from '../hooks/useLiveSession'
import { decodeInvite } from '../lib/invite'

const DEFAULT_PORT = 8788
const RELAY_PORT = 8787

const getRelayUrl = () => localStorage.getItem('acc-relay-url') || ''
const setRelayUrl = (v) => localStorage.setItem('acc-relay-url', v)

/** Pillola di stato nella barra superiore + modale di connessione. */
export default function LiveSessionControl() {
  const [open, setOpen] = useState(false)
  const live = useLiveSession()
  const { state } = live

  const label =
    state.mode === 'host'
      ? state.transport === 'relay' && !state.connected
        ? 'Connessione al relay…'
        : `In hosting · ${state.peers} ${state.peers === 1 ? 'collegato' : 'collegati'}`
      : state.mode === 'engineer'
        ? state.connected
          ? `Live da ${state.hostInfo?.name || 'host'}`
          : 'Connessione…'
        : 'Sessione live'

  const dotColor =
    state.mode === 'offline'
      ? 'bg-white/30'
      : state.connected
        ? 'bg-racing-green animate-pulse-fast'
        : 'bg-racing-amber animate-pulse-fast'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="no-drag flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border border-racing-border hover:border-white/25 hover:bg-white/5 transition-colors"
      >
        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        {state.mode === 'host' ? <Cast size={13} /> : state.mode === 'engineer' ? <Wifi size={13} /> : <Radio size={13} />}
        <span className="text-white/70">{label}</span>
      </button>

      {open && <LiveModal live={live} onClose={() => setOpen(false)} />}
    </>
  )
}

function LiveModal({ live, onClose }) {
  const { state, error, clearError, leave } = live
  const [screen, setScreen] = useState('choose') // choose | host-setup | join-setup
  const inSession = state.mode !== 'offline'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="no-drag w-[500px] max-w-[92vw] panel p-0 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-racing-border">
          <div className="flex items-center gap-2 font-semibold">
            <Radio size={16} className="text-racing-accent" /> Sessione Live
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-3 text-xs text-racing-accent bg-racing-accent/10 rounded-lg px-3 py-2 flex justify-between">
              {error}
              <button onClick={clearError} className="text-white/40 hover:text-white">
                <X size={14} />
              </button>
            </div>
          )}

          {inSession ? (
            state.mode === 'host' ? (
              <HostView state={state} onLeave={leave} />
            ) : (
              <EngineerView state={state} onLeave={leave} />
            )
          ) : screen === 'choose' ? (
            <Chooser onHost={() => setScreen('host-setup')} onJoin={() => setScreen('join-setup')} />
          ) : screen === 'host-setup' ? (
            <HostSetup live={live} onBack={() => setScreen('choose')} />
          ) : (
            <JoinSetup live={live} onBack={() => setScreen('choose')} />
          )}
        </div>
      </div>
    </div>
  )
}

function Chooser({ onHost, onJoin }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-white/50">
        Condividi telemetria e strategia in tempo reale tra il PC del pilota e quello
        dell'ingegnere — sulla stessa rete oppure da remoto via Internet.
      </p>
      <BigCard
        icon={Cast}
        title="Ospita la sessione"
        sub="Questo è il PC con Assetto Corsa. Trasmette telemetria + strategia."
        onClick={onHost}
        accent
      />
      <BigCard
        icon={MonitorSmartphone}
        title="Unisciti come ingegnere"
        sub="Ricevi la telemetria live del pilota e modifica la strategia."
        onClick={onJoin}
      />
    </div>
  )
}

function ConnTabs({ tab, setTab }) {
  return (
    <div className="flex gap-1.5 p-0.5 bg-racing-panel2 border border-racing-border rounded-lg mb-4">
      <TabBtn active={tab === 'lan'} onClick={() => setTab('lan')} icon={Network} label="Stessa rete (LAN)" />
      <TabBtn active={tab === 'relay'} onClick={() => setTab('relay')} icon={Globe} label="Remoto (Internet)" />
    </div>
  )
}

function TabBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
        active ? 'bg-racing-accent text-white' : 'text-white/55 hover:text-white'
      }`}
    >
      <Icon size={14} /> {label}
    </button>
  )
}

function HostSetup({ live, onBack }) {
  const [tab, setTab] = useState('lan')
  const [relay, setRelay] = useState(getRelayUrl())

  const startExternalRelay = () => {
    const url = relay.trim()
    if (!url) return
    setRelayUrl(url)
    live.hostRelay(url)
  }

  return (
    <div className="space-y-1">
      <BackBtn onBack={onBack} />
      <ConnTabs tab={tab} setTab={setTab} />
      {tab === 'lan' ? (
        <div className="space-y-3">
          <p className="text-sm text-white/50">
            Avvia l'hosting: l'app si annuncia sulla rete locale e l'ingegnere ti trova
            automaticamente. Ideale se siete sulla stessa rete/Wi‑Fi.
          </p>
          <button onClick={() => live.host()} className="btn-accent w-full">
            <Cast size={16} /> Avvia hosting LAN
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-white/50">
            Genera un relay <span className="text-white/80">direttamente nell'app</span>:
            ottieni un <span className="text-white/80">invito sicuro</span> (un solo codice,
            protetto da token) da dare all'ingegnere. Nessun server esterno da configurare.
          </p>
          <button onClick={() => live.hostEmbeddedRelay(RELAY_PORT)} className="btn-accent w-full">
            <ShieldCheck size={16} /> Genera relay sicuro nell'app
          </button>
          <p className="text-[11px] text-white/35 flex items-start gap-1.5">
            <Globe size={13} className="mt-px shrink-0" />
            <span>
              Per giocare via Internet la porta {RELAY_PORT} dev'essere raggiungibile
              (port‑forward sul router o un tunnel). In LAN o VPN funziona senza configurazione.
            </span>
          </p>

          <details className="pt-1">
            <summary className="text-xs text-white/45 cursor-pointer hover:text-white/70 select-none">
              Usa invece un relay esterno
            </summary>
            <div className="space-y-3 mt-3">
              <Field label="URL del relay">
                <input
                  value={relay}
                  onChange={(e) => setRelay(e.target.value)}
                  placeholder="ws://mio-relay.example.com:8787"
                  className="input num"
                />
              </Field>
              <button
                onClick={startExternalRelay}
                disabled={!relay.trim()}
                className="w-full py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors disabled:opacity-30"
              >
                Avvia con relay esterno
              </button>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}

function JoinSetup({ live, onBack }) {
  const [tab, setTab] = useState('lan')
  const { discovered, startDiscovery, stopDiscovery, join, joinRelay } = live
  const [manual, setManual] = useState('')
  const [relay, setRelay] = useState(getRelayUrl())
  const [room, setRoom] = useState('')
  const [token, setToken] = useState('')
  const [invite, setInvite] = useState('')
  const [inviteErr, setInviteErr] = useState('')

  useEffect(() => {
    if (tab === 'lan') startDiscovery()
    else stopDiscovery()
    return () => stopDiscovery()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const connectManual = () => {
    const v = manual.trim()
    if (!v) return
    const [host, port] = v.split(':')
    join(host, port ? parseInt(port, 10) : DEFAULT_PORT)
  }

  const connectInvite = () => {
    const dec = decodeInvite(invite)
    if (!dec) {
      setInviteErr('Invito non valido: controlla di averlo copiato per intero.')
      return
    }
    setInviteErr('')
    setRelayUrl(dec.url)
    joinRelay(dec.url, dec.room, dec.token)
  }

  const connectRelay = () => {
    const url = relay.trim()
    const code = room.trim().toUpperCase()
    const tok = token.trim()
    if (!url || !code || !tok) return
    setRelayUrl(url)
    joinRelay(url, code, tok)
  }

  return (
    <div className="space-y-1">
      <BackBtn onBack={onBack} />
      <ConnTabs tab={tab} setTab={setTab} />

      {tab === 'lan' ? (
        <div className="space-y-4">
          <div>
            <div className="label flex items-center gap-2 mb-2">
              <Search size={12} className="animate-pulse-fast" /> Ricerca host sulla rete…
            </div>
            {discovered.length === 0 ? (
              <div className="text-sm text-white/40 bg-white/[0.02] rounded-lg p-4 text-center">
                Nessun host trovato. Avvia l'hosting sull'altro PC, oppure connettiti manualmente.
              </div>
            ) : (
              <div className="space-y-1.5">
                {discovered.map((d) => (
                  <button
                    key={`${d.host}:${d.port}`}
                    onClick={() => join(d.host, d.port)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-racing-border bg-white/[0.02] hover:bg-racing-accent/10 hover:border-racing-accent/40 transition-colors"
                  >
                    <Laptop size={18} className="text-racing-cyan" />
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">{d.name}</div>
                      <div className="text-[11px] text-white/40 num">
                        {d.host}:{d.port}
                      </div>
                    </div>
                    <Plug size={15} className="text-white/40" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <Field label="Connessione manuale">
            <div className="flex items-center gap-2">
              <input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && connectManual()}
                placeholder="192.168.1.50:8788"
                className="input num flex-1"
              />
              <button onClick={connectManual} className="btn-accent">
                Connetti
              </button>
            </div>
          </Field>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-white/50">
            Incolla l'<span className="text-white/80">invito sicuro</span> che ti ha dato il
            pilota: contiene già relay, stanza e token.
          </p>
          <Field label="Invito">
            <input
              value={invite}
              onChange={(e) => {
                setInvite(e.target.value)
                setInviteErr('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && connectInvite()}
              placeholder="acc1:…"
              className="input num"
            />
          </Field>
          {inviteErr && <div className="text-[11px] text-racing-accent">{inviteErr}</div>}
          <button
            onClick={connectInvite}
            disabled={!invite.trim()}
            className="btn-accent w-full disabled:opacity-30"
          >
            <ShieldCheck size={16} /> Connetti con invito
          </button>

          <details className="pt-1">
            <summary className="text-xs text-white/45 cursor-pointer hover:text-white/70 select-none">
              Inserisci i dati manualmente
            </summary>
            <div className="space-y-3 mt-3">
              <Field label="URL del relay">
                <input
                  value={relay}
                  onChange={(e) => setRelay(e.target.value)}
                  placeholder="ws://mio-relay.example.com:8787"
                  className="input num"
                />
              </Field>
              <Field label="Codice stanza">
                <input
                  value={room}
                  onChange={(e) => setRoom(e.target.value.toUpperCase())}
                  placeholder="ES. 7K2P9"
                  className="input num tracking-[0.3em] uppercase"
                />
              </Field>
              <Field label="Token">
                <input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && connectRelay()}
                  placeholder="token segreto"
                  className="input num"
                />
              </Field>
              <button
                onClick={connectRelay}
                disabled={!relay.trim() || !room.trim() || !token.trim()}
                className="w-full py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors disabled:opacity-30"
              >
                <Globe size={15} className="inline mr-1.5 -mt-0.5" /> Connetti da remoto
              </button>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}

function HostView({ state, onLeave }) {
  const relay = state.transport === 'relay'
  const info = state.hostInfo || {}

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <CircleDot size={15} className={state.connected ? 'text-racing-green animate-pulse-fast' : 'text-racing-amber'} />
        <span className="text-white/80 font-medium">
          {relay ? (state.connected ? 'Sessione remota attiva' : 'Connessione al relay…') : 'Sessione LAN attiva'}
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-white/50">
          <Users size={14} /> {state.peers} {state.peers === 1 ? 'collegato' : 'collegati'}
        </span>
      </div>

      {relay ? <RelayHostShare info={info} /> : <LanHostShare info={info} />}

      <button onClick={onLeave} className="btn-accent w-full">
        Termina sessione
      </button>
    </div>
  )
}

/** Condivisione dell'invito sicuro (relay generato dall'app o esterno). */
function RelayHostShare({ info }) {
  return (
    <div>
      <div className="label mb-1.5 flex items-center gap-1.5">
        <ShieldCheck size={13} className="text-racing-green" /> Invito sicuro per l'ingegnere
      </div>
      <p className="text-xs text-white/45 mb-2">
        Nella sua app: <span className="text-white/70">Unisciti → Remoto → Connetti con invito</span>.
        L'invito include relay, stanza e token: senza di esso nessuno può collegarsi.
      </p>

      <CopyBox value={info.invite} label="Copia invito" mono />

      <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px] text-white/40">
        <span className="text-white/30">Stanza</span>
        <span className="num text-white/60">{info.room}</span>
        {info.embedded && info.publicIp && (
          <>
            <span className="text-white/30">IP pubblico</span>
            <span className="num text-white/60">
              {info.publicIp}:{info.port}
            </span>
          </>
        )}
        {info.embedded && info.addresses?.[0] && (
          <>
            <span className="text-white/30">In LAN/VPN</span>
            <span className="num text-white/60">
              {info.addresses[0]}:{info.port}
            </span>
          </>
        )}
        {!info.embedded && (
          <>
            <span className="text-white/30">Relay</span>
            <span className="num text-white/60 break-all">{info.relayUrl}</span>
          </>
        )}
      </div>

      {info.embedded && (
        <p className="text-[11px] text-white/35 mt-3 flex items-start gap-1.5">
          <Globe size={13} className="mt-px shrink-0" />
          <span>
            Per Internet inoltra la porta {info.port} sul router verso questo PC (o usa un
            tunnel). In LAN o VPN l'invito funziona già così.
          </span>
        </p>
      )}
    </div>
  )
}

/** Condivisione dell'indirizzo per la sessione LAN. */
function LanHostShare({ info }) {
  const addr = info.addresses?.[0]
  const value = addr ? `${addr}:${info.port}` : `porta ${info.port}`
  return (
    <div>
      <div className="label mb-1.5">L'ingegnere ti trova automaticamente sulla LAN</div>
      <p className="text-xs text-white/45 mb-2">
        Sull'altro PC: Unisciti come ingegnere → comparirà in lista. Oppure indirizzo manuale:
      </p>
      <CopyBox value={value} label="Copia indirizzo" mono />
      {info.addresses?.length > 1 && (
        <div className="text-[11px] text-white/35 mt-2">
          Altri: {info.addresses.slice(1).map((a) => `${a}:${info.port}`).join(' · ')}
        </div>
      )}
    </div>
  )
}

/** Casella con valore selezionabile + pulsante "copia". */
function CopyBox({ value, label = 'Copia', mono }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    if (!value) return
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="flex items-center gap-2">
      <code
        className={`flex-1 min-w-0 truncate bg-racing-panel2 border border-racing-border rounded-lg px-3 py-2.5 text-sm ${
          mono ? 'num' : ''
        }`}
        title={value || ''}
      >
        {value || '—'}
      </code>
      <button
        onClick={copy}
        disabled={!value}
        className="h-10 px-3 flex items-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium disabled:opacity-30 whitespace-nowrap"
        title={label}
      >
        {copied ? <Check size={15} className="text-racing-green" /> : <Copy size={15} />}
        {copied ? 'Copiato' : label}
      </button>
    </div>
  )
}

function EngineerView({ state, onLeave }) {
  const connected = state.connected
  const relay = state.transport === 'relay'
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <div
          className={`h-14 w-14 rounded-full flex items-center justify-center mb-3 ${
            connected ? 'bg-racing-green/15 text-racing-green' : 'bg-racing-amber/15 text-racing-amber'
          }`}
        >
          {connected ? <Wifi size={26} /> : <Plug size={26} className="animate-pulse-fast" />}
        </div>
        <div className="font-semibold">
          {connected
            ? relay
              ? `Connesso · stanza ${state.room}`
              : `Connesso a ${state.hostInfo?.name || state.hostInfo?.host}`
            : 'Connessione in corso…'}
        </div>
        <div className="text-xs text-white/45 mt-1">
          {connected
            ? 'Stai ricevendo la telemetria live. Apri la Dashboard o i grafici.'
            : relay
              ? `Riconnessione al relay (stanza ${state.room})`
              : `Riconnessione a ${state.hostInfo?.host}:${state.hostInfo?.port}`}
        </div>
      </div>
      <button onClick={onLeave} className="w-full py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors">
        Disconnetti
      </button>
    </div>
  )
}

// ---- piccoli helper UI ----

function BigCard({ icon: Icon, title, sub, onClick, accent }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border transition-colors ${
        accent
          ? 'border-racing-accent/40 bg-racing-accent/10 hover:bg-racing-accent/15'
          : 'border-racing-border bg-white/[0.02] hover:bg-white/[0.05]'
      }`}
    >
      <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${accent ? 'bg-racing-accent/20 text-racing-accent' : 'bg-white/5 text-white/70'}`}>
        <Icon size={22} />
      </div>
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-white/45 mt-0.5">{sub}</div>
      </div>
    </button>
  )
}

function BackBtn({ onBack }) {
  return (
    <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white mb-3">
      <ArrowLeft size={14} /> Indietro
    </button>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
