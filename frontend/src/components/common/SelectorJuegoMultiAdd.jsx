import { useEffect, useRef, useState } from 'react'
import { LogoThumb } from './LogoThumb'

// Combo desplegable para ir añadiendo juegos a un supertorneo: al hacer clic
// en un elemento se añade y el panel permanece abierto para seguir eligiendo.
export function SelectorJuegoMultiAdd({ juegos, onAdd, placeholder }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const triggerRef = useRef(null)

  const q = query.trim().toLowerCase()
  const filtrados = q ? juegos.filter((j) => j.nombre.toLowerCase().includes(q)) : juegos

  const cerrar = () => { setOpen(false); setQuery('') }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <div className="selector">
      <div className="combo">
        <button
          ref={triggerRef}
          type="button"
          className="combo-trigger"
          onClick={() => (open ? cerrar() : abrir())}
        >
          <span className="combo-valor combo-valor-vacio">{placeholder}</span>
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
              {filtrados.length === 0 && (
                <li className="combo-vacio">{juegos.length === 0 ? 'Ya están todos añadidos' : 'Sin coincidencias'}</li>
              )}
              {filtrados.map((j) => (
                <li key={j.id} onClick={() => onAdd(j)}>
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
