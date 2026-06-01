/**
 * Genera il logo dell'app (SVG) in stile "dark racing":
 * un quadrante tachimetro con arco rosso ad alto regime e una traccia di
 * telemetria al centro. Output: build/icon.svg
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const S = 1024
const cx = S / 2
const cy = S / 2

const toRad = (d) => (d * Math.PI) / 180
const pt = (r, deg) => [cx + r * Math.cos(toRad(deg)), cy + r * Math.sin(toRad(deg))]
const f = (n) => n.toFixed(2)

// Quadrante: 270° con gap in basso (centrato a 90°).
const START = 135
const END = 405 // 45°
const VALUE = START + (END - START) * 0.66 // riempimento ~66%
const R = 360
const RT = 326 // raggio interno tacche

function arc(r, a0, a1) {
  const [x0, y0] = pt(r, a0)
  const [x1, y1] = pt(r, a1)
  const large = a1 - a0 > 180 ? 1 : 0
  return `M ${f(x0)} ${f(y0)} A ${r} ${r} 0 ${large} 1 ${f(x1)} ${f(y1)}`
}

// Tacche del quadrante
let ticks = ''
const N = 10
for (let i = 0; i <= N; i++) {
  const a = START + ((END - START) * i) / N
  const major = i % 2 === 0
  const [xo, yo] = pt(R - 8, a)
  const [xi, yi] = pt(major ? RT - 18 : RT, a)
  const redZone = i >= 7
  ticks += `<line x1="${f(xo)}" y1="${f(yo)}" x2="${f(xi)}" y2="${f(yi)}" stroke="${
    redZone ? '#ff3b30' : '#5b6677'
  }" stroke-width="${major ? 11 : 6}" stroke-linecap="round"/>`
}

// Needle verso il valore corrente
const [nx, ny] = pt(R - 70, VALUE)
const [bxL, byL] = pt(34, VALUE + 90)
const [bxR, byR] = pt(34, VALUE - 90)

// Traccia telemetria (sparkline) al centro
const pts = [
  [-200, 18], [-150, 18], [-120, -38], [-92, 60], [-58, -70],
  [-20, 22], [20, 22], [48, -52], [86, 40], [120, -30], [160, 18], [200, 18]
]
  .map(([x, y], i) => `${i ? 'L' : 'M'} ${f(cx + x)} ${f(cy + 96 + y)}`)
  .join(' ')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#171b24"/>
      <stop offset="1" stop-color="#080a0e"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.28" r="0.75">
      <stop offset="0" stop-color="#e10600" stop-opacity="0.30"/>
      <stop offset="1" stop-color="#e10600" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="red" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff4b3e"/>
      <stop offset="1" stop-color="#c70500"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="18" flood-color="#ff2d24" flood-opacity="0.55"/>
    </filter>
  </defs>

  <rect x="0" y="0" width="${S}" height="${S}" rx="225" fill="url(#bg)"/>
  <rect x="0" y="0" width="${S}" height="${S}" rx="225" fill="url(#glow)"/>
  <rect x="6" y="6" width="${S - 12}" height="${S - 12}" rx="220" fill="none" stroke="#2a3240" stroke-width="3"/>

  <!-- traccia quadrante -->
  <path d="${arc(R, START, END)}" fill="none" stroke="#2b3340" stroke-width="26" stroke-linecap="round"/>
  <!-- arco valore (rosso) -->
  <path d="${arc(R, START, VALUE)}" fill="none" stroke="url(#red)" stroke-width="26" stroke-linecap="round" filter="url(#shadow)"/>

  ${ticks}

  <!-- traccia telemetria -->
  <path d="${pts}" fill="none" stroke="#22d3ee" stroke-width="14" stroke-linejoin="round" stroke-linecap="round" opacity="0.95"/>

  <!-- lancetta -->
  <polygon points="${f(nx)} ${f(ny)}, ${f(bxL)} ${f(byL)}, ${f(bxR)} ${f(byR)}" fill="url(#red)" filter="url(#shadow)"/>
  <circle cx="${cx}" cy="${cy}" r="40" fill="#12151c" stroke="#ff3b30" stroke-width="9"/>
  <circle cx="${cx}" cy="${cy}" r="13" fill="#ff3b30"/>
</svg>
`

fs.writeFileSync(path.join(__dirname, 'icon.svg'), svg)
console.log('icon.svg generato')
