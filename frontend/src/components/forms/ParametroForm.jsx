import { useState } from 'react'

// ---------- Formulario de parámetro (catálogo) ----------
export function ParametroForm({ parametro, onGuardar, onCancelar, onError }) {
  const editando = !!parametro && parametro !== 'nuevo'
  const [nombre, setNombre] = useState(parametro?.nombre || '')
  const [tipo, setTipo] = useState(parametro?.tipo || 'numero')

  function submit(e) {
    e.preventDefault()
    if (!nombre.trim()) { onError('El nombre es obligatorio'); return }
    onGuardar({ nombre: nombre.trim(), tipo }, editando ? parametro.id : null)
  }

  return (
    <form className="form form-parametro" onSubmit={submit}>
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Puntos, Fase, Personaje, Tiempo..." maxLength={40} autoFocus />
      <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
        <option value="numero">Número</option>
        <option value="tiempo">Tiempo</option>
        <option value="texto">Texto</option>
      </select>
      <button type="submit">{editando ? 'GUARDAR' : 'CREAR'}</button>
      {editando && <button type="button" className="borrar" onClick={onCancelar}>CANCELAR</button>}
    </form>
  )
}
