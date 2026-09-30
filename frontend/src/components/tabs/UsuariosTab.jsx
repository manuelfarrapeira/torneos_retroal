import { UsuarioForm } from '../forms/UsuarioForm'
import { normalizarTexto } from '../../utils/text'

export function UsuariosTab({
  esAdmin,
  formUsuario,
  usuarioFormKey,
  guardarUsuario,
  setFormUsuario,
  avisarError,
  usuarios,
  filtroJugador,
  setFiltroJugador,
  abrirDetalleJugador,
  eliminarUsuario,
}) {
  return (
    <section className="screen">
      <h2 className="panel-title">▸ JUGADORES</h2>

      {esAdmin && (
        <UsuarioForm
          key={formUsuario && typeof formUsuario === 'object' ? `edit-${formUsuario.id}` : `nuevo-${usuarioFormKey}`}
          usuario={formUsuario}
          onGuardar={guardarUsuario}
          onCancelar={() => setFormUsuario(null)}
          onError={avisarError}
        />
      )}

      {usuarios.length > 0 && (
        <input
          className="buscador"
          value={filtroJugador}
          onChange={(e) => setFiltroJugador(e.target.value)}
          placeholder="🔍 Filtrar jugadores..."
        />
      )}

      <ul className="lista-juegos lista-scroll lista-parametros">
        {usuarios.length === 0 && <li className="vacio">No hay jugadores todavía</li>}
        {usuarios.length > 0 && usuarios.filter((u) => normalizarTexto(u.nombre).includes(normalizarTexto(filtroJugador))).length === 0 && (
          <li className="vacio">Sin resultados</li>
        )}
        {usuarios
          .filter((u) => normalizarTexto(u.nombre).includes(normalizarTexto(filtroJugador)))
          .map((u) => (
            <li key={u.id} className={formUsuario && formUsuario !== 'nuevo' && formUsuario.id === u.id ? 'activo' : ''}>
              <div className="jinfo jinfo-jugador-clic" onClick={() => abrirDetalleJugador(u.nombre)}>
                <span className="jnombre">{u.nombre}</span>
                <span className="jmeta">{u.total_scores} récords registrados</span>
              </div>
              {esAdmin && (
                <>
                  <button className="borrar editar" onClick={() => setFormUsuario(u)} data-tooltip="Editar jugador" data-tooltip-pos="left">✎</button>
                  {(u.total_scores_all ?? u.total_scores) > 0 ? (
                    <button className="borrar bloqueado" disabled data-tooltip="No se puede eliminar: ya tiene récords" data-tooltip-pos="left">🔒</button>
                  ) : (
                    <button className="borrar" onClick={() => eliminarUsuario(u)} data-tooltip="Eliminar jugador" data-tooltip-pos="left">✕</button>
                  )}
                </>
              )}
            </li>
          ))}
      </ul>
    </section>
  )
}
