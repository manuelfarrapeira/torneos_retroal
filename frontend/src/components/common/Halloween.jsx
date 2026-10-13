import { useEffect, useRef, useState } from 'react'
import '../../halloween.css'

function Telarana() {
  const radios = [0, 18, 36, 54, 72, 90]
  const anillos = [25, 50, 75, 100]
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="0.8">
      {radios.map((a) => {
        const r = (a * Math.PI) / 180
        return <line key={a} x1="0" y1="0" x2={100 * Math.cos(r)} y2={100 * Math.sin(r)} />
      })}
      {anillos.map((d) => {
        const pts = radios.map((a) => {
          const r = (a * Math.PI) / 180
          return `${(d * Math.cos(r)).toFixed(1)},${(d * Math.sin(r)).toFixed(1)}`
        })
        return <polyline key={d} points={pts.join(' ')} />
      })}
      <g transform="translate(62 58)" fill="currentColor" stroke="none">
        <ellipse cx="0" cy="0" rx="3" ry="3.6" />
        <circle cx="0" cy="-4" r="2" />
      </g>
    </svg>
  )
}

function Murcielago() {
  return (
    <svg viewBox="0 0 64 32" width="100%" height="100%" fill="currentColor">
      <path className="ala ala-izq" d="M32 16 C26 4 14 2 2 6 C8 10 8 16 12 22 C16 16 22 18 24 26 C28 22 30 20 32 16Z" />
      <path className="ala ala-der" d="M32 16 C38 4 50 2 62 6 C56 10 56 16 52 22 C48 16 42 18 40 26 C36 22 34 20 32 16Z" />
      <ellipse cx="32" cy="17" rx="4" ry="7" />
      <path d="M28.5 11 L29.5 5 L32 9 L34.5 5 L35.5 11Z" />
    </svg>
  )
}

function Fantasma() {
  return (
    <svg viewBox="0 0 60 70" width="100%" height="100%">
      <path d="M6 66 V28 C6 12 18 2 30 2 C42 2 54 12 54 28 V66 L46 58 L38 66 L30 58 L22 66 L14 58Z" fill="#fff" />
      <ellipse cx="22" cy="28" rx="4" ry="6" fill="#222" />
      <ellipse cx="38" cy="28" rx="4" ry="6" fill="#222" />
      <ellipse cx="30" cy="44" rx="5" ry="6" fill="#222" />
    </svg>
  )
}

function Calabaza() {
  return (
    <svg viewBox="0 0 80 70" width="100%" height="100%">
      <path d="M36 12 C36 6 40 2 46 2 C44 6 44 9 44 12Z" fill="#3b7a1f" />
      <ellipse cx="22" cy="42" rx="18" ry="24" fill="#e8660c" />
      <ellipse cx="58" cy="42" rx="18" ry="24" fill="#e8660c" />
      <ellipse cx="40" cy="42" rx="19" ry="26" fill="#ff8a1f" />
      <path d="M22 34 L30 26 L36 36Z M58 34 L50 26 L44 36Z" fill="#2a1200" />
      <path d="M40 42 L35 50 H45Z" fill="#2a1200" />
      <path d="M22 54 L28 60 L34 54 L40 61 L46 54 L52 60 L58 54 L52 48 H28Z" fill="#2a1200" />
    </svg>
  )
}

function useDeambular(ref, { rotar, velBase, velExtra, probParada }) {
  useEffect(() => {
    const el = ref.current
    const cont = el?.parentElement
    if (!el || !cont) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let x = Math.random() * Math.max(1, cont.clientWidth - el.offsetWidth)
    let y = Math.random() * Math.max(1, cont.clientHeight - el.offsetHeight)
    let ang = Math.random() * Math.PI * 2
    let giro = 0
    let vel = velBase
    let objetivoVel = velBase
    let ultimo = performance.now()
    let tCambio = 0
    let raf
    const paso = (t) => {
      const dt = Math.min(0.05, (t - ultimo) / 1000)
      ultimo = t
      tCambio -= dt
      if (tCambio <= 0) {
        giro = (Math.random() - 0.5) * 3
        objetivoVel = Math.random() < probParada ? 0 : velBase + Math.random() * velExtra
        tCambio = 0.4 + Math.random() * 1.6
      }
      vel += (objetivoVel - vel) * Math.min(1, dt * 4)
      ang += giro * dt
      x += Math.cos(ang) * vel * dt
      y += Math.sin(ang) * vel * dt
      const w = cont.clientWidth - el.offsetWidth
      const h = cont.clientHeight - el.offsetHeight
      if (x < 0 || x > w || y < 0 || y > h) {
        x = Math.min(Math.max(x, 0), w)
        y = Math.min(Math.max(y, 0), h)
        ang = Math.atan2(h / 2 - y, w / 2 - x) + (Math.random() - 0.5)
      }
      const giroVisual = rotar ? ` rotate(${ang + Math.PI / 2}rad)` : ` scaleX(${Math.cos(ang) < 0 ? -1 : 1})`
      el.style.transform = `translate(${x}px, ${y}px)${giroVisual}`
      el.classList.toggle('hw-quieto', vel < 4)
      raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf)
  }, [ref, rotar, velBase, velExtra, probParada])
}

function MurcielagoErrante({ clase }) {
  const ref = useRef(null)
  useDeambular(ref, { rotar: false, velBase: 50, velExtra: 80, probParada: 0.05 })
  return <div className={`hw-bat ${clase}`} ref={ref}><Murcielago /></div>
}

function Arana() {
  const ref = useRef(null)
  useDeambular(ref, { rotar: true, velBase: 25, velExtra: 55, probParada: 0.25 })
  return (
    <div className="hw-arana" ref={ref}>
      <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round">
        <g className="hw-patas-a">
          <path d="M16 16 L6 8 L2 12" /><path d="M16 20 L5 20 L1 26" />
          <path d="M24 16 L34 8 L38 12" /><path d="M24 20 L35 20 L39 26" />
        </g>
        <g className="hw-patas-b">
          <path d="M17 14 L12 4 L8 3" /><path d="M17 24 L9 32 L7 38" />
          <path d="M23 14 L28 4 L32 3" /><path d="M23 24 L31 32 L33 38" />
        </g>
        <ellipse cx="20" cy="26" rx="6" ry="8" fill="#1a1a1a" />
        <circle cx="20" cy="15" r="4.5" fill="#1a1a1a" />
        <circle cx="18" cy="13" r="1" fill="#e0291c" stroke="none" />
        <circle cx="22" cy="13" r="1" fill="#e0291c" stroke="none" />
      </svg>
    </div>
  )
}

function ramaRayo(x, y, dir, pasos, grosor, ramas) {
  let d = `M${x.toFixed(2)} ${y.toFixed(2)}`
  const lista = []
  for (let i = 0; i < pasos; i++) {
    x += dir * (Math.random() * 1.2) + (Math.random() - 0.5) * 3
    y += 3 + Math.random() * 4.5
    d += ` L${x.toFixed(2)} ${y.toFixed(2)}`
    if (ramas > 0 && i > 0 && Math.random() < 0.4) {
      const sub = ramaRayo(x, y, Math.random() < 0.5 ? -3 : 3, 2 + Math.floor(Math.random() * 4), grosor * 0.6, ramas - 1)
      lista.push(...sub)
    }
  }
  lista.push({ d, grosor })
  return lista
}

function generaRayo() {
  const izq = Math.random() < 0.5
  const x0 = izq ? 50 + Math.random() * 45 : 5 + Math.random() * 45
  return ramaRayo(x0, 0, izq ? -4 : 4, 10 + Math.floor(Math.random() * 6), 1, 2)
}

function Rayo() {
  const [ramas, setRamas] = useState(generaRayo)
  const recolocar = () => setRamas(generaRayo())
  return (
    <div className="hw-rayo" onAnimationIteration={recolocar}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {ramas.map((r, i) => (
          <g key={i}>
            <path d={r.d} stroke="rgba(190,210,255,0.55)"             strokeWidth={r.grosor * 14} vectorEffect="non-scaling-stroke" />
                        <path d={r.d} stroke="#ffffff" strokeWidth={Math.max(1.5, r.grosor * 5)} vectorEffect="non-scaling-stroke" />
          </g>
        ))}
      </svg>
    </div>
  )
}

function FantasmaCabecera({ lado, clase }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    const capa = el?.parentElement
    const cont = capa?.parentElement
    const img = cont?.querySelector(lado === 'izq' ? '.header-title-left' : '.header-title-right')
    if (!el || !img) return
    const colocar = () => {
      const c = capa.getBoundingClientRect()
      const r = img.getBoundingClientRect()
      const w = el.offsetWidth
      const h = el.offsetHeight
      const x = lado === 'izq' ? r.left - c.left - w - 6 : r.right - c.left + 6
      const y = r.top - c.top + (r.height - h) / 2
      el.style.left = `${Math.min(Math.max(x, 2), c.width - w - 2)}px`
      el.style.top = `${Math.max(y, 0)}px`
    }
    colocar()
    const ro = new ResizeObserver(colocar)
    ro.observe(cont)
    ro.observe(img)
    return () => ro.disconnect()
  }, [lado])
  return <div className={`hw-ghost ${clase}`} ref={ref}><Fantasma /></div>
}

export function Halloween() {
  return (
    <div className="halloween" aria-hidden="true">
      <Arana />
      <Arana />
      <Arana />
      <div className="hw-oscuro"></div>
      <div className="hw-niebla"><span></span><span></span><span></span></div>
      <div className="hw-nube hw-nube-1"></div>
      <div className="hw-nube hw-nube-2"></div>
      <div className="hw-nube hw-nube-3"></div>
      <div className="hw-lluvia hw-lluvia-1"></div>
      <div className="hw-lluvia hw-lluvia-2"></div>
      <div className="hw-flash"></div>
      <Rayo />
      <div className="hw-web hw-web-tl"><Telarana /></div>
      <div className="hw-web hw-web-tr"><Telarana /></div>
      <div className="hw-web hw-web-bl"><Telarana /></div>
      <div className="hw-web hw-web-br"><Telarana /></div>

      <MurcielagoErrante clase="hw-bat-1" />
      <MurcielagoErrante clase="hw-bat-2" />

      <FantasmaCabecera lado="izq" clase="hw-ghost-1" />
      <FantasmaCabecera lado="der" clase="hw-ghost-2" />

      <div className="hw-pumpkin hw-pumpkin-l"><Calabaza /></div>
      <div className="hw-pumpkin hw-pumpkin-r"><Calabaza /></div>
    </div>
  )
}
