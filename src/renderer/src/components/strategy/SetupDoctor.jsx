import { useState } from 'react'
import { Stethoscope, Wrench, ArrowRight, Info, Sparkles } from 'lucide-react'
import { PHASES, problemsByPhase, getProblem } from '../../lib/setupAdvice'

export default function SetupDoctor() {
  const [phase, setPhase] = useState(PHASES[0].id)
  const [problemId, setProblemId] = useState(null)
  const problem = getProblem(problemId)
  const list = problemsByPhase(phase)

  return (
    <div className="p-5 grid grid-cols-12 gap-4 animate-fade-in">
      {/* Selettore guidato */}
      <div className="col-span-5 space-y-4">
        <div className="panel p-5">
          <SectionTitle icon={Stethoscope}>1 · In quale fase si manifesta?</SectionTitle>
          <div className="grid grid-cols-1 gap-1.5 mt-3">
            {PHASES.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPhase(p.id)
                  setProblemId(null)
                }}
                className={`no-drag flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm transition-colors ${
                  phase === p.id ? 'bg-racing-accent/15 text-white' : 'text-white/60 hover:bg-white/5'
                }`}
              >
                {p.label}
                <ArrowRight size={14} className="opacity-40" />
              </button>
            ))}
          </div>
        </div>

        <div className="panel p-5">
          <SectionTitle>2 · Cosa fa l'auto?</SectionTitle>
          <div className="grid grid-cols-1 gap-1.5 mt-3">
            {list.map((p) => (
              <button
                key={p.id}
                onClick={() => setProblemId(p.id)}
                className={`no-drag text-left px-3.5 py-2.5 rounded-lg text-sm transition-colors ${
                  problemId === p.id
                    ? 'bg-racing-accent text-white'
                    : 'bg-white/[0.03] text-white/70 hover:bg-white/[0.07]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Responso dell'ingegnere */}
      <div className="col-span-7">
        {!problem ? (
          <div className="panel h-full min-h-[300px] flex items-center justify-center text-white/40">
            <div className="text-center">
              <Wrench size={40} className="mx-auto mb-3 opacity-40" />
              Seleziona un comportamento: l'ingegnere virtuale proporrà le correzioni d'assetto.
            </div>
          </div>
        ) : (
          <div className="panel p-5 animate-fade-in">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} className="text-racing-accent" />
              <h3 className="text-lg font-semibold">{problem.label}</h3>
            </div>
            <div className="flex items-start gap-2 text-sm text-white/55 bg-white/[0.03] rounded-lg p-3 mb-4">
              <Info size={15} className="mt-0.5 shrink-0 text-racing-cyan" />
              {problem.symptom}
            </div>

            <SectionTitle icon={Wrench}>Correzioni consigliate (dalla più incisiva)</SectionTitle>
            <div className="mt-3 space-y-2.5">
              {[...problem.fixes]
                .sort((a, b) => (b.impact || 0) - (a.impact || 0))
                .map((f, i) => (
                  <FixCard key={i} fix={f} rank={i + 1} />
                ))}
            </div>

            <p className="text-[11px] text-white/35 mt-4">
              Applica una modifica alla volta e rivaluta in pista: l'assetto è un equilibrio,
              correzioni opposte possono annullarsi.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function FixCard({ fix, rank }) {
  const impact = fix.impact || 1
  const impactColor =
    impact >= 3 ? 'bg-racing-accent/20 text-racing-accent' : impact === 2 ? 'bg-racing-amber/20 text-racing-amber' : 'bg-white/10 text-white/60'
  const impactLabel = impact >= 3 ? 'Primario' : impact === 2 ? 'Medio' : 'Fine'

  return (
    <div className="panel-2 p-3.5 flex gap-3">
      <div className="h-7 w-7 shrink-0 rounded-lg bg-racing-accent/15 text-racing-accent flex items-center justify-center num text-sm font-bold">
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">{fix.area}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${impactColor}`}>{impactLabel}</span>
        </div>
        <div className="text-sm text-racing-green font-medium mt-0.5">{fix.change}</div>
        <div className="text-xs text-white/45 mt-1 leading-relaxed">{fix.why}</div>
      </div>
    </div>
  )
}

function SectionTitle({ children, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 label">
      {Icon && <Icon size={12} />}
      {children}
    </div>
  )
}
