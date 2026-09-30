import { LogoThumb } from '../common/LogoThumb'

export function TorneosTab({
  esAdmin,
  setFormTorneo,
  gestionSubTab,
  setGestionSubTab,
  torneosMensuales,
  formTorneo,
  setSelTorneo,
  setVerSubTab,
  setTab,
  eliminarTorneo,
  torneosSuper,
}) {
  return (
    <section className="screen">
      <h2 className="panel-title">▸ RETOS Y SUPERTORNEOS</h2>
      <p className="form-ayuda">
        Crea y edita aquí los retos y supertorneos. Para ver su clasificación y meter récords, ve a
        la pestaña PUNTUACIONES → subpestaña RETOS.
      </p>

      {esAdmin && (
        <button className="btn-nuevo" onClick={() => setFormTorneo('nuevo')}>+ NUEVO RETO / SUPERTORNEO</button>
      )}

      <nav className="tabs subtabs">
        <button className={gestionSubTab === 'torneos' ? 'tab activa' : 'tab'} onClick={() => setGestionSubTab('torneos')}>
          <span className="tab-icon">🏅</span><span className="tab-label">RETOS</span>
        </button>
        <button className={gestionSubTab === 'supertorneos' ? 'tab activa' : 'tab'} onClick={() => setGestionSubTab('supertorneos')}>
          <span className="tab-icon">🎖️</span><span className="tab-label">SUPERTORNEOS</span>
        </button>
        <select className="subtabs-select" value={gestionSubTab} onChange={(e) => setGestionSubTab(e.target.value)}>
          <option value="torneos">🏅 RETOS</option>
          <option value="supertorneos">🎖️ SUPERTORNEOS</option>
        </select>
      </nav>

      {gestionSubTab === 'torneos' && (
        <div className="subtab-panel">
          <p className="torneos-total">🏅 {torneosMensuales.length} reto{torneosMensuales.length === 1 ? '' : 's'}</p>
          <ul className="lista-juegos lista-torneos-grid">
            {torneosMensuales.length === 0 && <li className="vacio">No hay retos todavía</li>}
            {torneosMensuales.map((t) => (
              <li key={t.id} className={formTorneo && formTorneo !== 'nuevo' && formTorneo.id === t.id ? 'activo' : ''}>
                <div className="jinfo-click" onClick={() => { setSelTorneo(t); setVerSubTab('torneos'); setTab('ver') }}>
                  <div className="jicono">
                    <LogoThumb juego={t.juegos[0] ? { id: t.juegos[0].id, logo: t.juegos[0].logo } : { id: t.id, logo: null }} size={7} />
                  </div>
                  <div className="jinfo">
                    <span className="jnombre">{t.nombre}</span>
                    <span className="jmeta jmeta-torneo jmeta-juego">{t.juegos[0]?.nombre || 'sin juego'}</span>
                    <span className="jmeta jmeta-torneo">{t.total_scores} récords</span>
                  </div>
                </div>
                {esAdmin && (
                  <>
                    <button className="borrar editar" onClick={() => setFormTorneo(t)} data-tooltip="Editar reto" data-tooltip-pos="left">✎</button>
                    {t.total_scores > 0 ? (
                      <button className="borrar bloqueado" disabled data-tooltip="No se puede eliminar: ya tiene récords" data-tooltip-pos="left">🔒</button>
                    ) : (
                      <button className="borrar" onClick={() => eliminarTorneo(t)} data-tooltip="Eliminar reto" data-tooltip-pos="left">✕</button>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {gestionSubTab === 'supertorneos' && (
        <div className="subtab-panel">
          <p className="torneos-total">🎖️ {torneosSuper.length} supertorneo{torneosSuper.length === 1 ? '' : 's'}</p>
          <ul className="lista-juegos lista-torneos-grid">
            {torneosSuper.length === 0 && <li className="vacio">No hay supertorneos todavía</li>}
            {torneosSuper.map((t) => (
              <li key={t.id} className={formTorneo && formTorneo !== 'nuevo' && formTorneo.id === t.id ? 'activo' : ''}>
                <div className="jinfo-click" onClick={() => { setSelTorneo(t); setVerSubTab('supertorneos'); setTab('ver') }}>
                  <div className="jicono">
                    <LogoThumb juego={{ id: t.id, logo: t.logo }} size={7} />
                  </div>
                  <div className="jinfo">
                    <span className="jnombre">{t.nombre}</span>
                    <span className="jmeta jmeta-torneo jmeta-juego">{t.juegos.length} juego{t.juegos.length === 1 ? '' : 's'}</span>
                    <span className="jmeta jmeta-torneo">{t.total_scores} récords</span>
                  </div>
                </div>
                {esAdmin && (
                  <>
                    <button className="borrar editar" onClick={() => setFormTorneo(t)} data-tooltip="Editar torneo" data-tooltip-pos="left">✎</button>
                    {t.total_scores > 0 ? (
                      <button className="borrar bloqueado" disabled data-tooltip="No se puede eliminar: ya tiene récords" data-tooltip-pos="left">🔒</button>
                    ) : (
                      <button className="borrar" onClick={() => eliminarTorneo(t)} data-tooltip="Eliminar supertorneo" data-tooltip-pos="left">✕</button>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
