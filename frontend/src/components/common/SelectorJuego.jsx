import { useEffect, useRef, useState } from 'react'
import { LogoThumb } from './LogoThumb'

// Combo desplegable con búsqueda integrada: escribe dentro para filtrar y elige.
export function SelectorJuego({ juegos, sel, onSel }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const triggerRef = useRef(null)

  if (juegos.length === 0) return null

  const q = query.trim().toLowerCase()
  const filtrados = q
    ? juegos.filter((j) => j.nombre.toLowerCase().includes(q))
    : juegos

  const cerrar = () => { setOpen(false); setQuery('') }

  function actualizarPos() {
    const r = triggerRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 6, left: r.left, width: r.width })
  }

  function abrir() {
    actualizarPos()
    setOpen(true)
  }

  // El panel se posiciona en "fixed" (coordenadas de viewport) para no
  // quedar recortado por el overflow:auto del popup de torneos; hay que
  // recalcular su posición si el contenedor hace scroll o cambia el tamaño.
  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', actualizarPos, true)
    window.addEventListener('resize', actualizarPos)
    return () => {
      window.removeEventListener('scroll', actualizarPos, true)
      window.removeEventListener('resize', actualizarPos)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <div className="selector campo-selector-torneo">
      <label className="selector-lbl">JUEGO:</label>
      <div className="combo">
        <button
          ref={triggerRef}
          type="button"
          className="combo-trigger"
          onClick={() => (open ? cerrar() : abrir())}
        >
          <span className={sel ? 'combo-valor' : 'combo-valor combo-valor-vacio'}>
            {sel ? sel.nombre : '-- elige juego --'}
          </span>
          {sel && <LogoThumb juego={sel} size={3} />}
          <span className="combo-caret" aria-hidden="true">▾</span>
        </button>

        {open && pos && (
          <div className="combo-panel combo-panel-flotante" style={{ top: pos.top, left: pos.left, width: pos.width }}>
            <input
              className="combo-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍 Buscar juego..."
              autoComplete="off"
            />
            <ul className="combo-list">
              {filtrados.length === 0 && <li className="combo-vacio">Sin coincidencias</li>}
              {filtrados.map((j) => (
                <li
                  key={j.id}
                  className={sel && sel.id === j.id ? 'sel' : ''}
                  onClick={() => { onSel(j); cerrar() }}
                >
                  <span className="combo-nombre">{j.nombre}</span>
                  <LogoThumb juego={j} size={3} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {open && <div className="combo-overlay" onClick={cerrar} />}
    </div>
  )
}
