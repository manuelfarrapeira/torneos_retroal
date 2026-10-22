import { useEffect, useRef, useState } from 'react'
import '../../navidad.css'

const COLORES_LUCES = ['#ff3b3b', '#ffd23b', '#3bd45a', '#3ba4ff', '#ff6bd6']
const NUM_LUCES = 44
const COLORES_BOLAS = ['#e0291c', '#2f9e44', '#f2b705', '#2f7de1', '#c2379b']

function Luces() {
  return (
    <div className="nv-luces">
      <svg className="nv-cable" viewBox="0 0 100 10" preserveAspectRatio="none" width="100%" height="100%" fill="none">
        <path d="M0 1 Q 25 9 50 1 T 100 1" stroke="#0e2a14" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      </svg>
      {Array.from({ length: NUM_LUCES }, (_, i) => {
        const x = (i / (NUM_LUCES - 1)) * 100
        // Misma curva que el cable: dos arcos por pantalla para que las bombillas cuelguen de él
        const t = (x / 50) % 1
        const y = 4 * t * (1 - t) * 8
        const c = COLORES_LUCES[i % COLORES_LUCES.length]
        return (
          <span
            key={i}
            className="nv-bombilla"
            style={{ left: `${x}%`, top: `${y + 1}%`, '--c': c, animationDelay: `${(i % 5) * 0.35}s` }}
          />
        )
      })}
    </div>
  )
}

function Bolas() {
  const posiciones = [8, 21, 36, 64, 79, 92]
  return posiciones.map((p, i) => (
    <div key={p} className="nv-bola" style={{ left: `${p}%`, animationDelay: `${i * 0.5}s`, '--len': `${34 + (i % 3) * 18}px` }}>
      <span className="nv-hilo"></span>
      <svg viewBox="0 0 30 36" width="100%" height="100%">
        <rect x="11" y="0" width="8" height="5" rx="1" fill="#d9b44a" />
        <circle cx="15" cy="21" r="13" fill={COLORES_BOLAS[i % COLORES_BOLAS.length]} />
        <path d="M5 19 Q15 25 25 19" stroke="rgba(255,255,255,0.7)" strokeWidth="2" fill="none" />
        <ellipse cx="10" cy="15" rx="3" ry="4.5" fill="rgba(255,255,255,0.45)" />
      </svg>
    </div>
  ))
}

function Nieve() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const cont = canvas?.parentElement
    if (!canvas || !cont) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d')
    const MAX_ALTURA = 48
    const PERIODO_QUITANIEVES = 40
    const ANCHO_Q = 130
    const ALTO_Q = 46
    let quita = null
    let proximoQuita = PERIODO_QUITANIEVES
    let w = 0
    let h = 0
    let alturas = []
    let copos = []
    let raf
    let ultimo = performance.now()

    const nuevoCopo = (arriba) => ({
      x: Math.random() * w,
      y: arriba ? -5 : Math.random() * h,
      r: 1 + Math.random() * 2.6,
      vy: 25 + Math.random() * 45,
      fase: Math.random() * Math.PI * 2,
      deriva: 8 + Math.random() * 18,
    })

    const ajustar = () => {
      const dpr = window.devicePixelRatio || 1
      w = cont.clientWidth
      h = cont.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const prev = alturas
      alturas = Array.from({ length: Math.ceil(w) }, (_, i) => prev[i] || 0)
      const n = Math.min(260, Math.max(70, Math.round((w * h) / 5500)))
      copos = Array.from({ length: n }, () => nuevoCopo(false))
    }
    ajustar()
    const ro = new ResizeObserver(ajustar)
    ro.observe(cont)

    const paso = (t) => {
      const dt = Math.min(0.05, (t - ultimo) / 1000)
      ultimo = t
      ctx.clearRect(0, 0, w, h)

      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      for (const c of copos) {
        c.fase += dt * 1.5
        c.y += c.vy * dt
        c.x += Math.sin(c.fase) * c.deriva * dt
        const col = Math.min(alturas.length - 1, Math.max(0, Math.floor(c.x)))
        if (c.y >= h - (alturas[col] || 0)) {
          // El copo aterriza: sube el montón alrededor, suavizando con los vecinos
          for (let k = -6; k <= 6; k++) {
            const j = col + k
            if (j >= 0 && j < alturas.length && alturas[j] < MAX_ALTURA) {
              alturas[j] = Math.min(MAX_ALTURA, alturas[j] + c.r * 3.5 * (1 - Math.abs(k) / 7))
            }
          }
          Object.assign(c, nuevoCopo(true))
          continue
        }
        if (c.x < -5) c.x = w + 5
        if (c.x > w + 5) c.x = -5
        ctx.beginPath()
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // Alisado del montón para que no queden picos
      for (let i = 1; i < alturas.length - 1; i++) {
        alturas[i] += ((alturas[i - 1] + alturas[i + 1]) / 2 - alturas[i]) * 0.1
      }
      ctx.beginPath()
      ctx.moveTo(0, h)
      for (let i = 0; i < alturas.length; i++) ctx.lineTo(i, h - alturas[i] - 2)
      ctx.lineTo(w, h)
      ctx.closePath()
      const g = ctx.createLinearGradient(0, h - MAX_ALTURA - 4, 0, h)
      g.addColorStop(0, '#ffffff')
      g.addColorStop(1, '#cfe0f5')
      ctx.fillStyle = g
      ctx.fill()

      proximoQuita -= dt
      if (!quita && proximoQuita <= 0) {
        const dir = Math.random() < 0.5 ? 1 : -1
        const x = dir > 0 ? -ANCHO_Q - 10 : w + 10
        quita = { dir, x, empujado: 0, frente: dir > 0 ? x + ANCHO_Q : x }
      }
      if (quita) {
        const q = quita
        q.x += q.dir * 170 * dt
        const frente = q.dir > 0 ? q.x + ANCHO_Q : q.x
        const desde = Math.max(0, Math.floor(Math.min(q.frente, frente)))
        const hasta = Math.min(alturas.length - 1, Math.ceil(Math.max(q.frente, frente)))
        for (let i = desde; i <= hasta; i++) {
          q.empujado += alturas[i]
          alturas[i] = 0
        }
        q.frente = frente

        // Montón de nieve que va empujando la pala
        const mont = Math.min(40, 4 + q.empujado / 25)
        const mx = frente
        ctx.fillStyle = '#f4f8ff'
        ctx.beginPath()
        ctx.moveTo(mx - q.dir * 4, h)
        ctx.quadraticCurveTo(mx + q.dir * 14, h - mont * 1.3, mx + q.dir * 38, h)
        ctx.closePath()
        ctx.fill()

        ctx.save()
        if (q.dir > 0) ctx.translate(q.x, h - ALTO_Q)
        else ctx.transform(-1, 0, 0, 1, q.x + ANCHO_Q, h - ALTO_Q)
        // Pala
        ctx.fillStyle = '#9aa4b2'
        ctx.beginPath()
        ctx.moveTo(ANCHO_Q - 2, 10)
        ctx.lineTo(ANCHO_Q + 14, 20)
        ctx.lineTo(ANCHO_Q + 14, ALTO_Q)
        ctx.lineTo(ANCHO_Q - 2, ALTO_Q - 6)
        ctx.closePath()
        ctx.fill()
        // Carrocería
        ctx.fillStyle = '#f2b705'
        ctx.fillRect(0, 14, ANCHO_Q - 6, 22)
        ctx.fillStyle = '#d99a00'
        ctx.fillRect(0, 30, ANCHO_Q - 6, 6)
        // Cabina
        ctx.fillStyle = '#f2b705'
        ctx.fillRect(ANCHO_Q - 56, 0, 44, 16)
        ctx.fillStyle = '#bfe3ff'
        ctx.fillRect(ANCHO_Q - 50, 3, 32, 10)
        // Luz giratoria
        const on = Math.floor(t / 250) % 2 === 0
        ctx.fillStyle = on ? '#ff8a1f' : '#7a4a10'
        ctx.fillRect(ANCHO_Q - 40, -5, 12, 5)
        if (on) {
          ctx.shadowColor = '#ff8a1f'
          ctx.shadowBlur = 14
          ctx.fillRect(ANCHO_Q - 40, -5, 12, 5)
          ctx.shadowBlur = 0
        }
        // Ruedas
        ctx.fillStyle = '#222'
        for (const cx of [24, 64, 100]) {
          ctx.beginPath()
          ctx.arc(cx, ALTO_Q - 8, 9, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = '#aaa'
        for (const cx of [24, 64, 100]) {
          ctx.beginPath()
          ctx.arc(cx, ALTO_Q - 8, 3.5, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()

        if ((q.dir > 0 && q.x > w + 60) || (q.dir < 0 && q.x < -ANCHO_Q - 60)) {
          quita = null
          proximoQuita = PERIODO_QUITANIEVES
        }
      }

      raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return <canvas className="nv-nieve" ref={canvasRef}></canvas>
}

function PapaNoel() {
  const reno = (x, y) => (
    <g transform={`translate(${x} ${y})`}>
      <g className="nv-patas">
        <path d="M6 30 L2 44 M12 31 L14 44 M30 31 L28 44 M36 30 L40 44" stroke="#8f5a2c" strokeWidth="3.5" strokeLinecap="round" />
      </g>
      <ellipse cx="22" cy="24" rx="19" ry="10" fill="#a9703a" />
      <path d="M36 18 L46 6 L56 10 L54 20 L44 24Z" fill="#a9703a" />
      <path d="M48 7 L46 -4 M47 1 L41 -1 M52 8 L58 0" stroke="#7a5230" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="57" cy="14" r="3.2" fill="#ff2b2b" className="nv-nariz" />
      <circle cx="49" cy="11" r="1.4" fill="#222" />
      <ellipse cx="4" cy="22" rx="3" ry="4" fill="#f4f8ff" />
    </g>
  )
  return (
    <svg viewBox="0 0 400 100" width="100%" height="100%">
      <path d="M128 24 H318 M128 30 H318" stroke="#d9b44a" strokeWidth="1.2" fill="none" />
      {reno(300, 14)}
      {reno(236, 20)}
      {reno(172, 26)}
      <path d="M4 38 Q4 56 22 58 H110 Q122 58 122 46 L112 34 H60 Q40 34 36 24 Q30 38 4 38Z" fill="#c0392b" stroke="#7d1f15" strokeWidth="1.5" />
      <path d="M2 64 H116 Q124 64 122 54" stroke="#d9b44a" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M14 58 V64 M60 58 V64 M100 58 V64" stroke="#d9b44a" strokeWidth="2" />
      <rect x="22" y="14" width="30" height="24" rx="5" fill="#2f9e44" />
      <path d="M26 14 L26 38 M34 14 L34 38 M42 14 L42 38" stroke="#ffd23b" strokeWidth="1.5" />
      <ellipse cx="82" cy="34" rx="15" ry="14" fill="#d62d20" />
      <circle cx="84" cy="14" r="9" fill="#ffd9b3" />
      <path d="M75 18 Q84 34 93 18 Q93 26 84 28 Q75 26 75 18Z" fill="#fff" />
      <path d="M74 12 Q76 -4 90 2 Q92 8 93 12Z" fill="#d62d20" />
      <rect x="73" y="9" width="21" height="5" rx="2.5" fill="#fff" />
      <circle cx="92" cy="0" r="3.5" fill="#fff" />
      <circle cx="88" cy="14" r="1.2" fill="#222" />
      <path d="M92 28 L112 22" stroke="#d62d20" strokeWidth="5" strokeLinecap="round" />
      <path d="M108 22 L170 30" stroke="#8a5a2b" strokeWidth="1" fill="none" />
    </svg>
  )
}

function nuevoVuelo() {
  return { top: 10 + Math.random() * 55, izqADer: Math.random() < 0.5 }
}

function Trineo() {
  const [vuelo, setVuelo] = useState(nuevoVuelo)
  return (
    <div
      className="nv-trineo"
      style={{
        top: `${vuelo.top}%`,
        '--desde': vuelo.izqADer ? '-420px' : 'calc(100vw + 60px)',
        '--hasta': vuelo.izqADer ? 'calc(100vw + 60px)' : '-420px',
      }}
      onAnimationIteration={(e) => e.target === e.currentTarget && setVuelo(nuevoVuelo())}
    >
      <div className="nv-giro" style={{ transform: vuelo.izqADer ? 'none' : 'scaleX(-1)' }}><PapaNoel /></div>
    </div>
  )
}

export function Navidad() {
  return (
    <div className="navidad" aria-hidden="true">
      <div className="nv-tinte"></div>
      <Nieve />
      <Trineo />
      <Luces />
      <Bolas />
    </div>
  )
}
