import { useState } from 'react'
import { normalizarTexto } from '../../utils/text'

// Combo desplegable con búsqueda para elegir jugador: filtra sin distinguir tildes.
export function SelectorUsuario({ usuarios, sel, onSel }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const q = normalizarTexto(query)
  const filtrados = q
    ? usuarios.filter((u) => normalizarTexto(u.nombre).includes(q))
    : usuarios

  const cerrar = () => { setOpen(false); setQuery('') }
  const seleccionado = usuarios.find((u) => String(u.id) === String(sel))

  return (
    <div className="combo">
      <button
        type="button"
        className="combo-trigger"
        onClick={() => (open ? cerrar() : setOpen(true))}
      >
        <span className={seleccionado ? 'combo-valor' : 'combo-valor combo-valor-vacio'}>
          {seleccionado ? seleccionado.nombre : '-- elige jugador --'}
        </span>
        <span className="combo-caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="combo-panel">
          <input
            className="combo-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 Buscar jugador..."
            autoComplete="off"
          />
          <ul className="combo-list">
            {filtrados.length === 0 && <li className="combo-vacio">Sin coincidencias</li>}
            {filtrados.map((u) => (
              <li
                key={u.id}
                className={sel && String(sel) === String(u.id) ? 'sel' : ''}
                onClick={() => { onSel(u.id); cerrar() }}
              >
                <span className="combo-nombre">{u.nombre}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {open && <div className="combo-overlay" onClick={cerrar} />}
    </div>
  )
}
