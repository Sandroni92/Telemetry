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
  Network
} from 'lucide-react'
import { useLiveSession } from '../hooks/useLiveSession'

const DEFAULT_PORT = 8788

const genRoom = () => Math.random().toString(36).slice(2, 7).toUpperCase()
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

  const startRelay = () => {
    const url = relay.trim()
    if (!url) return
    setRelayUrl(url)
    live.hostRelay(url, genRoom())
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
            Collega un relay raggiungibile da entrambi (vedi <code>npm run relay</code>).
            Verrà generato un codice‑stanza da dare all'ingegnere.
          </p>
          <Field label="URL del relay">
            <input
              value={relay}
              onChange={(e) => setRelay(e.target.value)}
              placeholder="ws://mio-relay.example.com:8787"
              className="input num"
            />
          </Field>
          <button onClick={startRelay} disabled={!relay.trim()} className="btn-accent w-full disabled:opacity-30">
            <Globe size={16} /> Avvia hosting remoto
          </button>
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

  const connectRelay = () => {
    const url = relay.trim()
    const code = room.trim().toUpperCase()
    if (!url || !code) return
    setRelayUrl(url)
    joinRelay(url, code)
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
            Inserisci l'URL del relay e il codice‑stanza che ti ha dato il pilota.
          </p>
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
              onKeyDown={(e) => e.key === 'Enter' && connectRelay()}
              placeholder="ES. 7K2P9"
              className="input num tracking-[0.3em] uppercase"
            />
          </Field>
          <button onClick={connectRelay} disabled={!relay.trim() || !room.trim()} className="btn-accent w-full disabled:opacity-30">
            <Globe size={16} /> Connetti da remoto
          </button>
        </div>
      )}
    </div>
  )
}

function HostView({ state, onLeave }) {
  const relay = state.transport === 'relay'
  const info = state.hostInfo || {}
  const addr = info.addresses?.[0]
  const code = relay ? info.room : addr ? `${addr}:${info.port}` : `porta ${info.port}`
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

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

      <div>
        <div className="label mb-1.5">
          {relay ? 'Dai questo codice all’ingegnere' : "L'ingegnere ti trova automaticamente sulla LAN"}
        </div>
        <p className="text-xs text-white/45 mb-2">
          {relay
            ? 'Nella sua app: Unisciti → Remoto, stesso URL del relay e questo codice‑stanza.'
            : 'Sull’altro PC: Unisciti come ingegnere → comparirà in lista. Oppure indirizzo manuale:'}
        </p>
        <div className="flex items-center gap-2">
          <code
            className={`flex-1 num bg-racing-panel2 border border-racing-border rounded-lg px-3 py-2.5 ${
              relay ? 'text-2xl font-bold tracking-[0.3em] text-center text-racing-accent' : 'text-sm'
            }`}
          >
            {code}
          </code>
          <button
            onClick={copy}
            className="h-10 w-10 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10"
            title="Copia"
          >
            {copied ? <Check size={16} className="text-racing-green" /> : <Copy size={16} />}
          </button>
        </div>
        {relay && <div className="text-[11px] text-white/35 mt-2">Relay: {info.relayUrl}</div>}
        {!relay && info.addresses?.length > 1 && (
          <div className="text-[11px] text-white/35 mt-2">
            Altri: {info.addresses.slice(1).map((a) => `${a}:${info.port}`).join(' · ')}
          </div>
        )}
      </div>

      <button onClick={onLeave} className="btn-accent w-full">
        Termina sessione
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
