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
  quitarCaratulaReto,
  torneosSuper,
}) {
  return (
    <section className="screen">
      <h2 className="panel-title">▸ RETOS Y SUPERTORNEOS</h2>

      {esAdmin && (
        <button className="btn-nuevo" onClick={() => setFormTorneo('nuevo')}>+ NUEVO RETO / SUPERTORNEO</button>
      )}

      <nav className="tabs subtabs subtabs-siempre-visible">
        <button className={gestionSubTab === 'torneos' ? 'tab activa' : 'tab'} onClick={() => setGestionSubTab('torneos')}>
          <span className="tab-icon">🏅</span><span className="tab-label">RETOS</span>
        </button>
        <button className={gestionSubTab === 'archivo' ? 'tab activa' : 'tab'} onClick={() => setGestionSubTab('archivo')}>
          <span className="tab-icon">📸</span><span className="tab-label">ARCHIVO RETOS</span>
        </button>
        <button className={gestionSubTab === 'supertorneos' ? 'tab activa' : 'tab'} onClick={() => setGestionSubTab('supertorneos')}>
          <span className="tab-icon">🎖️</span><span className="tab-label">SUPERTORNEOS</span>
        </button>
        <select className="subtabs-select" value={gestionSubTab} onChange={(e) => setGestionSubTab(e.target.value)}>
          <option value="torneos">🏅 RETOS</option>
          <option value="archivo">📸 ARCHIVO RETOS</option>
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

      {gestionSubTab === 'archivo' && (
        <div className="subtab-panel">
          <p className="torneos-total">📸 ARCHIVO DE CARÁTULAS</p>
          <div className="panteon-scroll-wrap">
            <div className="panteon-grid">
              {torneosMensuales.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px' }}>
                  <span className="vacio">No hay retos todavía</span>
                </div>
              )}
              {torneosMensuales.filter((t) => t.caratula_reto).length === 0 && torneosMensuales.length > 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px' }}>
                  <span className="vacio">Ningún reto tiene carátula aún</span>
                </div>
              ) : (
                torneosMensuales
                  .filter((t) => t.caratula_reto)
                  .map((t) => (
                    <div key={t.id} className="panteon-card">
                      <div className="panteon-img-wrap">
                        <img src={t.caratula_reto} alt={t.nombre} className="panteon-img" loading="lazy" decoding="async" />
                      </div>
                      <div className="panteon-info">
                        <div className="panteon-header-row">
                          <span className="panteon-nombre">{t.nombre}</span>
                          {esAdmin && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                className="borrar sm editar"
                                onClick={() => setFormTorneo(t)}
                                data-tooltip="Cambiar carátula / Editar reto"
                                data-tooltip-pos="left"
                              >
                                ✎
                              </button>
                              <button
                                className="borrar sm"
                                onClick={() => quitarCaratulaReto(t.id)}
                                data-tooltip="Eliminar carátula"
                                data-tooltip-pos="left"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                        <span className="panteon-juego">{t.juegos[0]?.nombre || 'sin juego'}</span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
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
