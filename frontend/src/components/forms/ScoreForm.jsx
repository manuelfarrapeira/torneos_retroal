import { useState } from 'react'
import { SelectorUsuario } from '../common/SelectorUsuario'
import { TiempoInput, soloNumeroComa } from '../common/TiempoInput'
import { hoyISO } from '../../utils/date'

// ---------- Formulario de puntuación (nueva o edición) ----------
export function ScoreForm({ juego, usuarios, score, onGuardar, onCancelar, onError }) {
  const editando = !!score
  const [usuarioId, setUsuarioId] = useState(score?.usuario_id || '')
  const [fecha, setFecha] = useState(score?.fecha || hoyISO())
  const [valores, setValores] = useState(() => {
    const init = {}
    if (score) score.valores.forEach((v) => { init[v.parametro_id] = v.valor_texto })
    return init
  })

  function setValor(pid, v) { setValores({ ...valores, [pid]: v }) }

  function submit(e) {
    e.preventDefault()
    if (!usuarioId) { onError('Elige un jugador'); return }
    onGuardar({ usuario_id: Number(usuarioId), fecha, valores }, editando ? score.id : null)
  }

  return (
    <form className="form-score-completo" onSubmit={submit}>
      <div className="fila-jugador-fecha">
        <div className="campo">
          <span>JUGADOR</span>
          {editando ? (
            <div className="valor-fijo">{score.usuario}</div>
          ) : (
            <SelectorUsuario usuarios={usuarios} sel={usuarioId} onSel={setUsuarioId} />
          )}
        </div>
        <div className="campo">
          <span>FECHA</span>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
      </div>
      <div className="campos-parametros">
        {juego.parametros.map((p) => (
          <div className="campo" key={p.parametro_id}>
            <span>{p.nombre.toUpperCase()}</span>
            {p.tipo === 'numero' && (
              <input
                type="text"
                inputMode="decimal"
                value={(valores[p.parametro_id] ?? '').replace('.', ',')}
                onChange={(e) => setValor(p.parametro_id, soloNumeroComa(e.target.value).replace(',', '.'))}
                placeholder="(opcional)"
              />
            )}
            {p.tipo === 'tiempo' && (
              <TiempoInput
                value={valores[p.parametro_id] ?? ''}
                onChange={(v) => setValor(p.parametro_id, v)}
              />
            )}
            {p.tipo === 'texto' && (
              <input
                type="text"
                value={valores[p.parametro_id] ?? ''}
                onChange={(e) => setValor(p.parametro_id, e.target.value)}
                placeholder="(opcional)"
                maxLength={60}
              />
            )}
          </div>
        ))}
      </div>
      <div className="acciones-form">
        <button type="submit">{editando ? 'GUARDAR CAMBIOS' : 'GUARDAR'}</button>
        {editando && <button type="button" className="btn-secundario" onClick={onCancelar}>CANCELAR EDICIÓN</button>}
      </div>
    </form>
  )
}
