import { AsyncImage } from '../common/AsyncImage'
import { BannerPlaceholder } from '../common/BannerPlaceholder'
import { LogoThumb } from '../common/LogoThumb'
import { SelectorJuego } from '../common/SelectorJuego'
import { SelectorTorneo } from '../common/SelectorTorneo'
import { PixelSprite } from '../sprites/PixelSprite'
import { RankingTable } from '../tables/RankingTable'
import { SuperGeneralTable, calcularClasificacionGeneralSuper } from '../tables/SuperGeneralTable'
import { formatearNombreJuegoClasificacion } from '../../utils/format'
import { normalizarTexto } from '../../utils/text'

export function VerTab({
  verSubTab,
  setVerSubTab,
  clasificacion,
  filtroClasifJugador,
  setFiltroClasifJugador,
  abrirDetalleJugador,
  filtroClasifJuego,
  setFiltroClasifJuego,
  dragScroll,
  setSel,
  juegos,
  sel,
  abrirNormas,
  esAdmin,
  setModalNuevoRecordGen,
  scores,
  scoresCargando,
  filtroUser,
  setFiltroUser,
  editarScore,
  eliminarScore,
  torneosMensuales,
  selTorneo,
  setSelTorneo,
  torneoJuego,
  selTorneoJuegoId,
  setSelTorneoJuegoId,
  setModalNuevoRecordSuper,
  torneoScores,
  torneoScoresCargando,
  filtroTorneoUser,
  setFiltroTorneoUser,
  editarTorneoScore,
  eliminarTorneoScore,
  copiarRetoATorneito,
  torneosSuper,
  torneoTodasScores,
  avisarError,
  setPanteonTorneoId,
  setPanteonPreview,
  setFormPanteonModal,
  quitarImagenPanteon,
}) {
  return (
    <section className="screen">
      <h2 className="panel-title">▸ TABLA DE RÉCORDS</h2>

      <nav className="tabs subtabs">
        <button className={verSubTab === 'clasificacion' ? 'tab activa' : 'tab'} onClick={() => setVerSubTab('clasificacion')}>
          <span className="tab-icon">🥇</span><span className="tab-label">CLASIFICACIÓN</span>
        </button>
        <button className={verSubTab === 'general' ? 'tab activa' : 'tab'} onClick={() => setVerSubTab('general')}>
          <span className="tab-icon">🏆</span><span className="tab-label">TORNEITO RETROAL</span>
        </button>
        <button className={verSubTab === 'torneos' ? 'tab activa' : 'tab'} onClick={() => setVerSubTab('torneos')}>
          <span className="tab-icon">🏅</span><span className="tab-label">RETOS</span>
        </button>
        <button className={verSubTab === 'supertorneos' ? 'tab activa' : 'tab'} onClick={() => setVerSubTab('supertorneos')}>
          <span className="tab-icon">🎖️</span><span className="tab-label">SUPERTORNEOS</span>
        </button>
        <button className={verSubTab === 'panteon' ? 'tab activa' : 'tab'} onClick={() => setVerSubTab('panteon')}>
          <span className="tab-icon">👑</span><span className="tab-label">PANTEÓN</span>
        </button>
        <select className="subtabs-select" value={verSubTab} onChange={(e) => setVerSubTab(e.target.value)}>
          <option value="clasificacion">🥇 CLASIFICACIÓN</option>
          <option value="general">🏆 TORNEITO RETROAL</option>
          <option value="torneos">🏅 RETOS</option>
          <option value="supertorneos">🎖️ SUPERTORNEOS</option>
          <option value="panteon">👑 EL PANTEÓN DE LOS CAMPEONES</option>
        </select>
      </nav>

      {verSubTab === 'clasificacion' && (
        <div className="subtab-panel">
          {!clasificacion ? (
            <div className="loading-spinner-wrap">
              <span className="loading-spinner" />
              <p className="loading">Cargando clasificación…</p>
            </div>
          ) : clasificacion.jugadores.length === 0 ? (
            <div className="placeholder">
              <PixelSprite name="moneda" size={7} />
              <p>TODAVÍA NO HAY\nPUNTUACIONES SUFICIENTES</p>
            </div>
          ) : (
            <div className="clasificacion-layout">
              <div className="clasificacion-columna">
                <input
                  className="buscador"
                  value={filtroClasifJugador}
                  onChange={(e) => setFiltroClasifJugador(e.target.value)}
                  placeholder="🔍 Filtrar jugadores..."
                />
                <div className="clasificacion-tabla-wrap">
                  <div className="clasificacion-tabla-head-wrap">
                    <table className="tabla-clasificacion">
                      <colgroup>
                        <col className="col-pos" />
                        <col />
                        <col className="col-puntos" />
                      </colgroup>
                      <thead>
                        <tr><th>POS</th><th>NOMBRE</th><th>PUNTOS</th></tr>
                      </thead>
                    </table>
                  </div>
                  <div className="clasificacion-tabla-body-wrap">
                    <table className="tabla-clasificacion">
                      <colgroup>
                        <col className="col-pos" />
                        <col />
                        <col className="col-puntos" />
                      </colgroup>
                      <tbody>
                        {clasificacion.jugadores
                          .map((j, i) => ({ ...j, pos: i + 1 }))
                          .filter((j) => normalizarTexto(j.nombre).includes(normalizarTexto(filtroClasifJugador)))
                          .map((j) => (
                            <tr
                              key={j.nombre}
                              className={`fila-jugador-clic ${
                                j.pos <= 10 ? 'medalla-oro' : j.pos <= 20 ? 'medalla-plata' : j.pos <= 30 ? 'medalla-bronce' : ''
                              }`}
                              onClick={() => abrirDetalleJugador(j.nombre)}
                            >
                              <td className="pos">{j.pos}</td>
                              <td className="nombre">{j.nombre}</td>
                              <td className="puntos">{j.puntos.toLocaleString()}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="clasificacion-columna clasificacion-columna-ancha">
                <input
                  className="buscador"
                  value={filtroClasifJuego}
                  onChange={(e) => setFiltroClasifJuego(e.target.value)}
                  placeholder="🔍 Filtrar juegos..."
                />
                <div className="recreativas-tabla-wrap arrastrable" {...dragScroll}>
                  <table className="tabla-recreativas">
                    <thead>
                      <tr>
                        <th className="recreativa-juego-th">JUEGO</th>
                        {['1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º', '9º', '10º'].map((p) => (
                          <th key={p}>{p}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {clasificacion.filasJuegos
                        .filter(({ juego }) => normalizarTexto(juego.nombre).includes(normalizarTexto(filtroClasifJuego)))
                        .map(({ juego, posiciones }) => (
                          <tr key={juego.id}>
                            <td className="recreativa-juego-cell fila-juego-clic" onClick={() => { setSel(juego); setVerSubTab('general') }}>
                              <LogoThumb juego={juego} size={5} />
                              <span className="recreativa-nombre-text">{formatearNombreJuegoClasificacion(juego.nombre)}</span>
                            </td>
                            {Array.from({ length: 10 }).map((_, i) => (
                              <td key={i}>{posiciones[i] || ''}</td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {verSubTab === 'general' && (() => {
        const juegosConRecordsGeneral = juegos.filter((j) => (j.total_scores || 0) > 0)
        return (
          <div className="subtab-panel">
            {juegosConRecordsGeneral.length === 0 ? (
              <p className="vacio-inline">Aún no hay juegos con récords en Torneito Retroal.</p>
            ) : (
              <>
                <div className="selector-torneo-header-row">
                  <SelectorJuego juegos={juegosConRecordsGeneral} sel={sel} onSel={setSel} />
                  <button
                    type="button"
                    className="btn-normas"
                    onClick={() => abrirNormas('general')}
                  >
                    📜 NORMAS
                  </button>
                </div>

                {!sel || (sel.total_scores || 0) === 0 ? (
                  <BannerPlaceholder />
                ) : (
                  <div key={`fondo-general-${sel.id}`} className="juego-detalle-fondo">
                    <div className="juego-ficha">
                      <LogoThumb juego={sel} size={7} />
                      <div className="juego-ficha-info">
                        <span className="jnombre">{sel.nombre}</span>
                        <span className="jmeta">
                          {[sel.anio, sel.tipo, sel.desarrollador].filter(Boolean).join(' · ') || 'Sin ficha completa'}
                        </span>
                        <span className="jmeta jmeta-records">
                          {sel.total_scores} récords
                        </span>
                      </div>
                      {esAdmin && (
                        <button
                          type="button"
                          className="btn-nuevo btn-nuevo-record-ficha"
                          onClick={() => setModalNuevoRecordGen(true)}
                        >
                          + AÑADIR RÉCORD
                        </button>
                      )}
                    </div>

                    {sel.parametros.length === 0 ? (
                      <p className="vacio-inline">
                        Este juego no tiene parámetros de puntuación. Edítalo en la pestaña JUEGOS para añadirlos.
                      </p>
                    ) : (
                      <div className="juego-detalle-con-imagenes">
                        {sel.caratula && (
                          <div className="juego-imagen-izquierda">
                            <AsyncImage src={sel.caratula} alt="Carátula" className="lateral-caratula" />
                          </div>
                        )}
                        <div className="juego-ranking-wrap">
                          <RankingTable
                            juego={sel}
                            scores={scores}
                            cargando={scoresCargando}
                            filtro={filtroUser}
                            setFiltro={setFiltroUser}
                            onEditar={editarScore}
                            onEliminar={eliminarScore}
                            esAdmin={esAdmin}
                          />
                        </div>
                        {sel.screenshot && (
                          <div className="juego-imagen-derecha">
                            <AsyncImage src={sel.screenshot} alt="Captura" className="lateral-screenshot" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )
      })()}

      {verSubTab === 'torneos' && (
        <div className="subtab-panel">
          <div className="selector-torneo-header-row">
            <SelectorTorneo torneos={torneosMensuales} sel={selTorneo} onSel={setSelTorneo} />
            <button
              type="button"
              className="btn-normas"
              onClick={() => abrirNormas('retos')}
            >
              📜 NORMAS
            </button>
          </div>

          {!selTorneo ? (
            <BannerPlaceholder />
          ) : selTorneo.juegos.length === 0 ? (
            <p className="vacio-inline">Este reto todavía no tiene juegos asociados.</p>
          ) : !torneoJuego ? (
            <p className="vacio-inline">Cargando…</p>
          ) : (
            <div key={`fondo-torneo-${selTorneo.id}-${selTorneoJuegoId}`} className="juego-detalle-fondo">
              {selTorneo.juegos.length > 1 && (
                <SelectorJuego
                  juegos={selTorneo.juegos}
                  sel={torneoJuego}
                  onSel={(j) => setSelTorneoJuegoId(j.id)}
                />
              )}
              <div className="juego-ficha">
                <LogoThumb juego={torneoJuego} size={7} />
                <div className="juego-ficha-info">
                  <span className="jnombre">{selTorneo.nombre}</span>
                  <span className="jmeta">
                    {torneoJuego.nombre}
                    {' · '}{selTorneo.juegos.find((j) => j.id === torneoJuego.id)?.total_scores ?? 0} récords
                  </span>
                </div>
                {esAdmin && (
                  <button
                    type="button"
                    className="btn-nuevo btn-nuevo-record-ficha"
                    onClick={() => setModalNuevoRecordSuper(true)}
                  >
                    + AÑADIR RÉCORD
                  </button>
                )}
              </div>

              {torneoJuego.parametros.length === 0 ? (
                <p className="vacio-inline">
                  Este juego no tiene parámetros de puntuación. Edítalo en la pestaña JUEGOS para añadirlos.
                </p>
              ) : (
                <div className="juego-detalle-con-imagenes">
                  {torneoJuego.caratula && (
                    <div className="juego-imagen-izquierda">
                      <AsyncImage src={torneoJuego.caratula} alt="Carátula" className="lateral-caratula" />
                    </div>
                  )}
                  <div className="juego-ranking-wrap">
                    <RankingTable
                      juego={torneoJuego}
                      scores={torneoScores}
                      cargando={torneoScoresCargando}
                      filtro={filtroTorneoUser}
                      setFiltro={setFiltroTorneoUser}
                      onEditar={editarTorneoScore}
                      onEliminar={eliminarTorneoScore}
                      esAdmin={esAdmin}
                    />
                    {esAdmin && (
                      <button
                        type="button"
                        className="btn-normas btn-copiar-torneito"
                        disabled={(torneoJuego.total_scores ?? 0) > 0}
                        onClick={() => copiarRetoATorneito(selTorneo, torneoJuego)}
                        data-tooltip={
                          (torneoJuego.total_scores ?? 0) > 0
                            ? 'Este juego ya tiene puntuaciones en Torneíto Retroal'
                            : 'Copiar las puntuaciones de este reto a Torneíto Retroal'
                        }
                        data-tooltip-pos="right"
                      >
                        📋 COPIAR A TORNEÍTO
                      </button>
                    )}
                  </div>
                  {torneoJuego.screenshot && (
                    <div className="juego-imagen-derecha">
                      <AsyncImage src={torneoJuego.screenshot} alt="Captura" className="lateral-screenshot" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {verSubTab === 'supertorneos' && (
        <div className="subtab-panel">
          <div className="selector-torneo-header-row">
            <SelectorTorneo torneos={torneosSuper} sel={selTorneo} onSel={setSelTorneo} />
            {(() => {
              if (!selTorneo) return null
              const tieneNormas = !!(selTorneo.normas && selTorneo.normas.trim() !== '')
              if (tieneNormas) {
                return (
                  <button
                    type="button"
                    className="btn-normas"
                    onClick={() => abrirNormas('supertorneos', selTorneo)}
                  >
                    📜 NORMAS
                  </button>
                )
              }
              if (esAdmin) {
                return (
                  <button
                    type="button"
                    className="btn-normas"
                    onClick={() => abrirNormas('supertorneos', selTorneo)}
                  >
                    📜 AÑADIR NORMAS
                  </button>
                )
              }
              return null
            })()}
          </div>

          {!selTorneo ? (
            <BannerPlaceholder />
          ) : selTorneo.juegos.length === 0 ? (
            <p className="vacio-inline">Este torneo todavía no tiene juegos asociados.</p>
          ) : !torneoJuego ? (
            <p className="vacio-inline">Cargando…</p>
          ) : (
            <div key={`fondo-supertorneo-${selTorneo.id}-${selTorneoJuegoId}`} className="juego-detalle-fondo">
              <div className="supertorneo-layout">
                <div className="supertorneo-col-general">
                  <SuperGeneralTable generalStandings={calcularClasificacionGeneralSuper(selTorneo, torneoTodasScores, juegos)} />
                  {esAdmin && (
                    <button
                      type="button"
                      className="btn-nuevo btn-record-bajo-clasif"
                      style={{ marginTop: '14px', width: '100%' }}
                      onClick={() => setModalNuevoRecordSuper(true)}
                    >
                      + AÑADIR RÉCORD
                    </button>
                  )}
                </div>

                <div className="supertorneo-col-juego">
                  {selTorneo.juegos.length > 0 && (
                    <SelectorJuego
                      juegos={selTorneo.juegos}
                      sel={torneoJuego}
                      onSel={(j) => setSelTorneoJuegoId(j.id)}
                    />
                  )}
                  <div className="juego-ficha">
                    <LogoThumb juego={torneoJuego} size={7} />
                    <div className="juego-ficha-info">
                      <span className="jnombre">{selTorneo.nombre}</span>
                      <span className="jmeta">
                        {torneoJuego.nombre}
                        {' · '}{selTorneo.juegos.find((j) => j.id === torneoJuego.id)?.total_scores ?? 0} récords
                      </span>
                    </div>
                    {(torneoJuego.caratula || torneoJuego.screenshot) && (
                      <div className="juego-ficha-imagenes">
                        {torneoJuego.caratula && <AsyncImage src={torneoJuego.caratula} alt="Carátula" className="ficha-caratula" />}
                        {torneoJuego.screenshot && <AsyncImage src={torneoJuego.screenshot} alt="Captura" className="ficha-screenshot" />}
                      </div>
                    )}
                  </div>

                  {torneoJuego.parametros.length === 0 ? (
                    <p className="vacio-inline">
                      Este juego no tiene parámetros de puntuación. Edítalo en la pestaña JUEGOS para añadirlos.
                    </p>
                  ) : (
                    <>
                      <RankingTable
                        juego={torneoJuego}
                        scores={torneoScores}
                        cargando={torneoScoresCargando}
                        filtro={filtroTorneoUser}
                        setFiltro={setFiltroTorneoUser}
                        onEditar={editarTorneoScore}
                        onEliminar={eliminarTorneoScore}
                        esAdmin={esAdmin}
                      />
                      {(torneoJuego.caratula || torneoJuego.screenshot) && (
                        <div className="juego-imagenes-debajo-movil">
                          {torneoJuego.caratula && (
                            <div className="imagen-debajo-movil-item">
                              <AsyncImage src={torneoJuego.caratula} alt="Carátula" className="lateral-caratula" />
                            </div>
                          )}
                          {torneoJuego.screenshot && (
                            <div className="imagen-debajo-movil-item">
                              <AsyncImage src={torneoJuego.screenshot} alt="Captura" className="lateral-screenshot" />
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {verSubTab === 'panteon' && (
        <div className="subtab-panel">
          {esAdmin && (
            <button
              className="btn-nuevo"
              onClick={() => {
                const sinImagen = torneosMensuales.filter((t) => !t.imagen_campeon)
                if (sinImagen.length === 0) {
                  avisarError('Todos los retos mensuales ya tienen una imagen asignada. Elimina alguna del Panteón si deseas cambiarla.')
                  return
                }
                setPanteonTorneoId('')
                setPanteonPreview(null)
                setFormPanteonModal(true)
              }}
            >
              + ASIGNAR CAMPEÓN
            </button>
          )}

          <div className="panteon-galeria" style={{ marginTop: esAdmin ? '20px' : '0' }}>
            <h3 className="panel-subtitle">👑 EL PANTEÓN DE LOS CAMPEONES</h3>
            {torneosMensuales.filter((t) => t.imagen_campeon).length === 0 ? (
              <p className="vacio-inline">Todavía no hay carteles asignados en el Panteón de los Campeones.</p>
            ) : (
              <div className="panteon-scroll-wrap">
                <div className="panteon-grid">
                  {torneosMensuales
                    .filter((t) => t.imagen_campeon)
                    .map((t) => (
                      <div key={t.id} className="panteon-card">
                        <div className="panteon-img-wrap">
                          <img src={t.imagen_campeon} alt={t.nombre} className="panteon-img" decoding="async" loading="eager" />
                        </div>
                        <div className="panteon-info">
                          <div className="panteon-header-row">
                            <span className="panteon-nombre">{t.nombre}</span>
                            {esAdmin && (
                              <button
                                className="borrar sm"
                                onClick={() => quitarImagenPanteon(t.id)}
                                data-tooltip="Quitar imagen"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          <span className="panteon-juego">{t.juegos[0]?.nombre || 'Sin juego'}</span>
                          {t.campeon && (
                            <span className="panteon-campeon-tag">👑 {t.campeon}</span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
