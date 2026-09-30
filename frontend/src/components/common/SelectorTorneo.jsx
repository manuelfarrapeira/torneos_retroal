import { useEffect, useRef, useState } from 'react'
import { normalizarTexto } from '../../utils/text'
import { LogoThumb } from './LogoThumb'

// Desplegable para elegir un torneo existente (usado en PUNTUACIONES y NUEVO RÉCORD).
// Muestra el logo del torneo: en mensuales el del juego, en supertorneos su
// imagen (o el sprite aleatorio si no tiene).
export function SelectorTorneo({ torneos, sel, onSel, label }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const triggerRef = useRef(null)

  const esSoloMensual = torneos.length > 0 && torneos.every((t) => t.tipo === 'mensual')
  const esSoloSuper = torneos.length > 0 && torneos.every((t) => t.tipo === 'super')

  const labelText = label || (esSoloMensual ? 'RETO:' : esSoloSuper ? 'SUPERTORNEO:' : 'RETO / TORNEO:')
  const placeholderText = esSoloMensual ? '-- elige reto --' : esSoloSuper ? '-- elige supertorneo --' : '-- elige reto / torneo --'
  const searchPlaceholder = esSoloMensual ? '🔍 Buscar reto...' : esSoloSuper ? '🔍 Buscar supertorneo...' : '🔍 Buscar reto / torneo...'

  const q = normalizarTexto(query)
  const filtrados = q
    ? torneos.filter((t) => normalizarTexto(t.nombre).includes(q))
    : torneos

  const cerrar = () => { setOpen(false); setQuery('') }
  const logoJuego = (t) =>
    t.tipo === 'super'
      ? { id: t.id, logo: t.logo }
      : (t.juegos[0] ? { id: t.juegos[0].id, logo: t.juegos[0].logo } : { id: t.id, logo: null })
  const meta = (t) =>
    t.tipo === 'mensual'
      ? (t.juegos[0]?.nombre || 'sin juego')
      : `${t.juegos.length} juego${t.juegos.length === 1 ? '' : 's'}`

  function actualizarPos() {
    const r = triggerRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 6, left: r.left, width: r.width })
  }

  function abrir() {
    actualizarPos()
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', actualizarPos, true)
    window.addEventListener('resize', actualizarPos)
    return () => {
      window.removeEventListener('scroll', actualizarPos, true)
      window.removeEventListener('resize', actualizarPos)
    }
  }, [open])

  return (
    <div className="selector campo-selector-torneo">
      <label className="selector-lbl">{labelText}</label>
      <div className="combo">
        <button
          ref={triggerRef}
          type="button"
          className="combo-trigger"
          onClick={() => (open ? cerrar() : abrir())}
        >
          <span className={sel ? 'combo-valor' : 'combo-valor combo-valor-vacio'}>
            {sel ? sel.nombre : placeholderText}
          </span>
          {sel && <LogoThumb juego={logoJuego(sel)} size={3} />}
          <span className="combo-caret" aria-hidden="true">▾</span>
        </button>

        {open && pos && (
          <div className="combo-panel combo-panel-flotante" style={{ top: pos.top, left: pos.left, width: pos.width }}>
            <input
              className="combo-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              autoComplete="off"
            />
            <ul className="combo-list">
              {filtrados.length === 0 && <li className="combo-vacio">Sin coincidencias</li>}
              {filtrados.map((t) => (
                <li
                  key={t.id}
                  className={sel && sel.id === t.id ? 'sel' : ''}
                  onClick={() => { onSel(t); cerrar() }}
                >
                  <span className="combo-nombre">{t.nombre} <span className="combo-meta">· {meta(t)}</span></span>
                  <LogoThumb juego={logoJuego(t)} size={3} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {open && <div className="combo-overlay" onClick={cerrar} />}
      </div>
    </div>
  )
}
