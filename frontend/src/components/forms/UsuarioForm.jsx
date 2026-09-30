import { useState } from 'react'

// ---------- Formulario de usuario ----------
export function UsuarioForm({ usuario, onGuardar, onCancelar, onError }) {
  const editando = !!usuario && usuario !== 'nuevo'
  const [nombre, setNombre] = useState(usuario?.nombre || '')

  function submit(e) {
    e.preventDefault()
    if (!nombre.trim()) { onError('El nombre es obligatorio'); return }
    onGuardar({ nombre: nombre.trim() }, editando ? usuario.id : null)
  }

  return (
    <form className="form" onSubmit={submit}>
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del jugador..." maxLength={40} autoFocus />
      <button type="submit">{editando ? 'GUARDAR' : 'CREAR'}</button>
      {editando && <button type="button" className="borrar" onClick={onCancelar}>CANCELAR</button>}
    </form>
  )
}
