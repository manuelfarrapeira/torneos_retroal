import { UsuarioForm } from '../forms/UsuarioForm'
import { normalizarTexto } from '../../utils/text'
import { ArcadesTab } from './ArcadesTab'

export function FamiliaTab({
  esAdmin,
  usuariosSubTab,
  setUsuariosSubTab,
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
  arcades,
  guardarArcade,
  eliminarArcade,
  formArcade,
  setFormArcade,
}) {
  return (
    <section className="screen">
      <h2 className="panel-title">👪 LA FAMILIA RETROAL</h2>

      <nav className="tabs subtabs">
        <button className={usuariosSubTab === 'jugadores' ? 'tab activa' : 'tab'} onClick={() => setUsuariosSubTab('jugadores')}>
          <span className="tab-icon">🕹️</span><span className="tab-label">JUGADORES</span> <span className="tab-badge">{usuarios.length}</span>
        </button>
        <button className={usuariosSubTab === 'arcades' ? 'tab activa' : 'tab'} onClick={() => setUsuariosSubTab('arcades')}>
          <span className="tab-icon">🏪</span><span className="tab-label">ARCADES RETROAL</span> <span className="tab-badge">{arcades.length}</span>
        </button>
        <select className="subtabs-select" value={usuariosSubTab} onChange={(e) => setUsuariosSubTab(e.target.value)}>
          <option value="jugadores">🕹️ JUGADORES ({usuarios.length})</option>
          <option value="arcades">🏪 ARCADES RETROAL ({arcades.length})</option>
        </select>
      </nav>

      {usuariosSubTab === 'jugadores' && (
        <div className="subtab-panel">
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
        </div>
      )}

      {usuariosSubTab === 'arcades' && (
        <div className="subtab-panel">
          <ArcadesTab
            esAdmin={esAdmin}
            arcades={arcades}
            usuarios={usuarios}
            guardarArcade={guardarArcade}
            eliminarArcade={eliminarArcade}
            avisarError={avisarError}
            formArcade={formArcade}
            setFormArcade={setFormArcade}
          />
        </div>
      )}
    </section>
  )
}
