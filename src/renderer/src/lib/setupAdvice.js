/**
 * Base di conoscenza dell'"Ingegnere Virtuale" per ACC.
 *
 * Ogni problema di guida è collegato a una fase della curva e a una lista di
 * correzioni d'assetto, ordinate dalla più incisiva alla più fine. Ogni correzione
 * indica l'area dell'assetto ACC, la modifica suggerita e una breve spiegazione
 * della dinamica del veicolo.
 *
 * impact: 1 (regolazione fine) → 3 (intervento primario)
 */

export const PHASES = [
  { id: 'entry', label: 'Inserimento / Frenata' },
  { id: 'mid', label: 'Percorrenza (centro curva)' },
  { id: 'exit', label: 'Uscita / Trazione' },
  { id: 'stability', label: 'Stabilità & Cordoli' },
  { id: 'tyres', label: 'Gomme & Temperature' }
]

export const PROBLEMS = [
  {
    id: 'understeer_entry',
    phase: 'entry',
    label: 'Sottosterzo in inserimento',
    symptom: "L'anteriore non gira quando stacchi e imposti la curva: l'auto va larga.",
    fixes: [
      { area: 'Barra antirollio ant.', change: 'Ammorbidisci di 1–2 click', impact: 3, why: 'Più carico verticale e grip al transitorio sull’avantreno in inserimento.' },
      { area: 'Altezza anteriore', change: 'Abbassa di 1–2 mm', why: 'Sposta il bilanciamento aerodinamico/meccanico in avanti, più appoggio anteriore.', impact: 2 },
      { area: 'Frenata (brake bias)', change: 'Sposta indietro 0.5–1%', impact: 2, why: 'Libera l’anteriore in trail-braking, favorendo la rotazione.' },
      { area: 'Convergenza ant. (toe)', change: 'Verso toe-out di 1 tacca', impact: 1, why: 'Risposta più reattiva dello sterzo all’ingresso.' },
      { area: 'Pressioni ant.', change: 'Riduci di 0.2–0.3 psi', impact: 1, why: 'Aumenta l’impronta a terra se le gomme ant. sono fredde/sovragonfie.' }
    ]
  },
  {
    id: 'understeer_mid',
    phase: 'mid',
    label: 'Sottosterzo in percorrenza',
    symptom: 'A centro curva, a velocità costante, l’auto tende ad allargare la traiettoria.',
    fixes: [
      { area: 'Barra antirollio ant.', change: 'Ammorbidisci di 1–2 click', impact: 3, why: 'Migliora il bilanciamento meccanico verso l’anteriore in appoggio.' },
      { area: 'Camber anteriore', change: 'Aumenta il negativo di 0.2–0.4°', impact: 2, why: 'Più impronta in appoggio laterale, picco di grip anteriore più alto.' },
      { area: 'Ala posteriore', change: 'Riduci di 1 click (piste veloci)', impact: 2, why: 'Riduce il carico posteriore relativo, alleggerendo il sottosterzo aerodinamico.' },
      { area: 'Molle posteriori', change: 'Irrigidisci leggermente', impact: 1, why: 'Trasferisce bilanciamento in rotazione verso il retrotreno.' }
    ]
  },
  {
    id: 'oversteer_mid',
    phase: 'mid',
    label: 'Sovrasterzo in percorrenza',
    symptom: 'A centro curva il posteriore scivola/ruota più del previsto.',
    fixes: [
      { area: 'Barra antirollio post.', change: 'Ammorbidisci di 1–2 click', impact: 3, why: 'Più grip meccanico al retrotreno in appoggio laterale.' },
      { area: 'Ala posteriore', change: 'Aumenta di 1–2 click', impact: 2, why: 'Più carico aerodinamico posteriore, stabilità a media/alta velocità.' },
      { area: 'Camber posteriore', change: 'Aumenta il negativo di 0.2°', impact: 1, why: 'Migliora l’impronta posteriore in curva.' },
      { area: 'Pressioni post.', change: 'Avvicina alla finestra ottimale', impact: 1, why: 'Gomme fuori finestra riducono il grip posteriore.' }
    ]
  },
  {
    id: 'oversteer_exit',
    phase: 'exit',
    label: 'Sovrasterzo / perdita di trazione in uscita',
    symptom: 'Aprendo il gas in uscita il posteriore pattina o scoda.',
    fixes: [
      { area: 'Precarico differenziale', change: 'Aumenta di 10–20 Nm', impact: 3, why: 'Blocca prima il differenziale in accelerazione, retrotreno più stabile e trazione lineare.' },
      { area: 'Barra antirollio post.', change: 'Ammorbidisci di 1 click', impact: 2, why: 'Più grip posteriore meccanico nella fase di trazione.' },
      { area: 'Ala posteriore', change: 'Aumenta di 1 click', impact: 2, why: 'Stabilità posteriore in uscita ad alta velocità.' },
      { area: 'TC (traction control)', change: 'Aumenta di 1 livello', impact: 1, why: 'Limita il pattinamento ruota se il problema è di gestione gas.' },
      { area: 'Bump rubber / bumpstop post.', change: 'Aumenta il range', impact: 1, why: 'Evita finecorsa brusco della sospensione posteriore in trazione.' }
    ]
  },
  {
    id: 'understeer_exit',
    phase: 'exit',
    label: 'Sottosterzo in trazione (uscita)',
    symptom: 'In uscita, aprendo il gas, l’anteriore scivola e l’auto va larga.',
    fixes: [
      { area: 'Precarico differenziale', change: 'Riduci di 10–20 Nm', impact: 3, why: 'Differenziale meno bloccato lascia ruotare meglio l’auto in trazione.' },
      { area: 'Barra antirollio ant.', change: 'Ammorbidisci di 1 click', impact: 2, why: 'Più grip anteriore nella fase di apertura gas.' },
      { area: 'Camber anteriore', change: 'Aumenta il negativo di 0.2°', impact: 1, why: 'Migliora l’impronta anteriore sotto carico in uscita.' }
    ]
  },
  {
    id: 'braking_instability',
    phase: 'entry',
    label: 'Instabilità in frenata',
    symptom: 'In staccata il posteriore diventa nervoso/scodante e l’auto è difficile da rallentare dritta.',
    fixes: [
      { area: 'Frenata (brake bias)', change: 'Sposta avanti 0.5–1.5%', impact: 3, why: 'Più frenata all’anteriore stabilizza il retrotreno in staccata.' },
      { area: 'Rebound posteriore (slow)', change: 'Aumenta di 1–2 click', impact: 2, why: 'Controlla il trasferimento di carico, retrotreno meno reattivo in rilascio.' },
      { area: 'Ala posteriore', change: 'Aumenta di 1 click', impact: 2, why: 'Carico aerodinamico posteriore = stabilità nelle staccate veloci.' },
      { area: 'ABS', change: 'Aumenta di 1 livello', impact: 1, why: 'Riduce il bloccaggio se l’instabilità nasce da una ruota in stallo.' },
      { area: 'Convergenza post. (toe-in)', change: 'Aumenta leggermente', impact: 1, why: 'Più stabilità direzionale del retrotreno in rettilineo/frenata.' }
    ]
  },
  {
    id: 'kerb_instability',
    phase: 'stability',
    label: 'Spanciamento / instabilità sui cordoli',
    symptom: 'Sui cordoli l’auto rimbalza, tocca il fondo o si destabilizza.',
    fixes: [
      { area: 'Altezza da terra', change: 'Alza di 2–3 mm', impact: 3, why: 'Evita il contatto del fondo (bottoming) sui cordoli alti.' },
      { area: 'Bumpstop range', change: 'Aumenta il range/gap', impact: 2, why: 'Più escursione utile prima del finecorsa, assorbe meglio i cordoli.' },
      { area: 'Bump veloce (fast bump)', change: 'Ammorbidisci', impact: 2, why: 'La sospensione assorbe gli impatti rapidi invece di rimbalzare.' },
      { area: 'Barre antirollio', change: 'Ammorbidisci entrambe di 1 click', impact: 1, why: 'Maggiore compliance meccanica sui dislivelli.' }
    ]
  },
  {
    id: 'highspeed_instability',
    phase: 'stability',
    label: 'Instabilità ad alta velocità',
    symptom: 'In rettilineo o curvoni veloci l’auto è "leggera" e nervosa.',
    fixes: [
      { area: 'Ala posteriore', change: 'Aumenta di 2–3 click', impact: 3, why: 'Più carico posteriore, stabilità aerodinamica alle alte velocità.' },
      { area: 'Altezza posteriore', change: 'Alza leggermente vs anteriore (più rake)', impact: 2, why: 'Aumenta il carico aerodinamico complessivo e la stabilità.' },
      { area: 'Convergenza post. (toe-in)', change: 'Aumenta', impact: 1, why: 'Migliora la stabilità direzionale in rettilineo.' }
    ]
  },
  {
    id: 'tyre_overheat_front',
    phase: 'tyres',
    label: 'Surriscaldamento gomme anteriori',
    symptom: 'Le anteriori vanno sopra finestra, calo di grip e degrado rapido.',
    fixes: [
      { area: 'Pressioni ant.', change: 'Riduci di 0.3–0.5 psi', impact: 2, why: 'Pressione più bassa = meno temperatura di esercizio.' },
      { area: 'Camber anteriore', change: 'Riduci il negativo di 0.2°', impact: 2, why: 'Distribuisce meglio la temperatura sulla larghezza del battistrada.' },
      { area: 'Stile di guida / sottosterzo', change: 'Correggi il sottosterzo di base', impact: 1, why: 'Lo strisciamento dell’anteriore (scrub) genera calore.' }
    ]
  },
  {
    id: 'tyre_overheat_rear',
    phase: 'tyres',
    label: 'Surriscaldamento gomme posteriori',
    symptom: 'Le posteriori vanno sopra finestra, soprattutto in trazione.',
    fixes: [
      { area: 'Pressioni post.', change: 'Riduci di 0.3–0.5 psi', impact: 2, why: 'Abbassa la temperatura di esercizio del posteriore.' },
      { area: 'TC (traction control)', change: 'Aumenta di 1 livello', impact: 2, why: 'Meno pattinamento = meno calore generato in trazione.' },
      { area: 'Precarico differenziale', change: 'Riduci leggermente', impact: 1, why: 'Riduce lo slittamento differenziale che scalda il retrotreno.' }
    ]
  }
]

export function problemsByPhase(phaseId) {
  return PROBLEMS.filter((p) => p.phase === phaseId)
}

export function getProblem(id) {
  return PROBLEMS.find((p) => p.id === id) || null
}
