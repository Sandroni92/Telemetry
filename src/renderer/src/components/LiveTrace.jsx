import { useEffect, useRef } from 'react'

/**
 * Sparkline live su Canvas: disegna velocità, gas e freno dell'ultimo storico.
 * Usa requestAnimationFrame e legge direttamente dal ring-buffer (nessun re-render
 * React per frame -> massima fluidità).
 */
export default function LiveTrace({ history }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let raf

    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr
        canvas.height = h * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const data = history.current
      if (data.length > 1) {
        drawLine(ctx, w, h, data, (f) => f.physics.speedKmh / 320, '#06b6d4', 2)
        drawArea(ctx, w, h, data, (f) => f.physics.throttle, 'rgba(34,197,94,0.18)')
        drawArea(ctx, w, h, data, (f) => f.physics.brake, 'rgba(225,6,0,0.18)')
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [history])

  return <canvas ref={canvasRef} className="w-full h-28 mt-2" />
}

function drawLine(ctx, w, h, data, accessor, color, width) {
  ctx.beginPath()
  ctx.lineWidth = width
  ctx.strokeStyle = color
  data.forEach((f, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - Math.min(1, Math.max(0, accessor(f))) * h
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  })
  ctx.stroke()
}

function drawArea(ctx, w, h, data, accessor, fill) {
  ctx.beginPath()
  ctx.moveTo(0, h)
  data.forEach((f, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - Math.min(1, Math.max(0, accessor(f))) * h
    ctx.lineTo(x, y)
  })
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}
