import { UsuarioForm } from '../forms/UsuarioForm'
import { normalizarTexto } from '../../utils/text'
import { PixelSprite } from '../sprites/PixelSprite'

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
          <span className="tab-icon">🕹️</span><span className="tab-label">JUGADORES</span>
        </button>
        <button className={usuariosSubTab === 'arcades' ? 'tab activa' : 'tab'} onClick={() => setUsuariosSubTab('arcades')}>
          <span className="tab-icon">🏪</span><span className="tab-label">ARCADES RETROAL</span>
        </button>
        <select className="subtabs-select" value={usuariosSubTab} onChange={(e) => setUsuariosSubTab(e.target.value)}>
          <option value="jugadores">🕹️ JUGADORES</option>
          <option value="arcades">🏪 ARCADES RETROAL</option>
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
          {esAdmin && (
            <form className="form form-compact" onSubmit={(e) => {
              e.preventDefault()
              if (!formArcade?.nombre?.trim()) {
                avisarError('El nombre del arcade es obligatorio')
                return
              }
              guardarArcade(formArcade)
            }}>
              <input
                type="text"
                className="form-input"
                placeholder="Nombre del arcade"
                value={formArcade?.nombre || ''}
                onChange={(e) => setFormArcade({ ...formArcade, nombre: e.target.value })}
              />
              <input
                type="url"
                className="form-input"
                placeholder="URL (abrir en nueva pestaña)"
                value={formArcade?.url || ''}
                onChange={(e) => setFormArcade({ ...formArcade, url: e.target.value })}
              />
              <input
                type="file"
                className="form-input"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = (evt) => {
                      setFormArcade({ ...formArcade, logo_data: evt.target.result })
                    }
                    reader.readAsDataURL(file)
                  }
                }}
              />
              <button type="submit" className="btn">{formArcade?.id ? 'EDITAR' : 'CREAR'} ARCADE</button>
              {formArcade?.id && <button type="button" className="btn btn-cancel" onClick={() => setFormArcade(null)}>CANCELAR</button>}
            </form>
          )}

          <div className="arcades-grid">
            {arcades.length === 0 && (
              <div className="placeholder">
                <PixelSprite name="moneda" size={7} />
                <p>NO HAY ARCADES\nREGISTRADOS</p>
              </div>
            )}
            {arcades.map((a) => (
              <div key={a.id} className="arcade-card">
                {a.logo && <img src={a.logo} alt={a.nombre} className="arcade-logo" />}
                <h3>{a.nombre}</h3>
                {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="arcade-link">Visitar →</a>}
                {esAdmin && (
                  <div className="arcade-actions">
                    <button className="btn btn-small" onClick={() => setFormArcade(a)}>✎ Editar</button>
                    <button className="btn btn-small btn-danger" onClick={() => eliminarArcade(a)}>✕ Eliminar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
