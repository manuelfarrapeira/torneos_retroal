import { SelectorJuego } from '../common/SelectorJuego'
import { SelectorTorneo } from '../common/SelectorTorneo'
import { ScoreForm } from '../forms/ScoreForm'
import { PixelSprite } from '../sprites/PixelSprite'

export function MeterTab({
  meterSubTab,
  setMeterSubTab,
  juegos,
  sel,
  setSel,
  usuarios,
  scoreFormKey,
  guardarScore,
  avisarError,
  torneosMensuales,
  selTorneo,
  setSelTorneo,
  torneoJuego,
  setSelTorneoJuegoId,
  selTorneoJuegoId,
  torneoScoreFormKey,
  guardarTorneoScore,
  torneosSuper,
  abrirNormas,
  esAdmin,
}) {
  return (
    <section className="screen">
      <h2 className="panel-title">▸ NUEVO RÉCORD</h2>

      <nav className="tabs subtabs">
        <button className={meterSubTab === 'general' ? 'tab activa' : 'tab'} onClick={() => setMeterSubTab('general')}>
          <span className="tab-icon">🏆</span><span className="tab-label">TORNEITO RETROAL</span>
        </button>
        <button className={meterSubTab === 'torneos' ? 'tab activa' : 'tab'} onClick={() => setMeterSubTab('torneos')}>
          <span className="tab-icon">🏅</span><span className="tab-label">RETOS</span>
        </button>
        <button className={meterSubTab === 'supertorneos' ? 'tab activa' : 'tab'} onClick={() => setMeterSubTab('supertorneos')}>
          <span className="tab-icon">🎖️</span><span className="tab-label">SUPERTORNEOS</span>
        </button>
        <select className="subtabs-select" value={meterSubTab} onChange={(e) => setMeterSubTab(e.target.value)}>
          <option value="general">🏆 TORNEITO RETROAL</option>
          <option value="torneos">🏅 RETOS</option>
          <option value="supertorneos">🎖️ SUPERTORNEOS</option>
        </select>
      </nav>

      {meterSubTab === 'general' && (
        <div className="subtab-panel">
          <SelectorJuego juegos={juegos} sel={sel} onSel={setSel} />

          {!sel ? (
            <div className="placeholder">
              <PixelSprite name="luchador" size={6} />
              <p>{juegos.length === 0
                ? 'CREA UN JUEGO EN LA\nPESTAÑA "JUEGOS"'
                : 'SELECCIONA UN JUEGO\nPARA METER SU RÉCORD'}</p>
            </div>
          ) : sel.parametros.length === 0 ? (
            <p className="vacio-inline">
              Este juego no tiene parámetros de puntuación. Edítalo en la pestaña JUEGOS para añadirlos.
            </p>
          ) : usuarios.length === 0 ? (
            <p className="vacio-inline">
              No hay jugadores todavía. Crea uno en la pestaña JUGADORES antes de meter un récord.
            </p>
          ) : (
            <ScoreForm
              key={`gen-${sel?.id}-${scoreFormKey}`}
              juego={sel}
              usuarios={usuarios}
              score={null}
              onGuardar={guardarScore}
              onCancelar={() => {}}
              onError={avisarError}
            />
          )}
        </div>
      )}

      {meterSubTab === 'torneos' && (
        <div className="subtab-panel">
          <SelectorTorneo torneos={torneosMensuales} sel={selTorneo} onSel={setSelTorneo} />

          {!selTorneo ? (
            <div className="placeholder">
              <PixelSprite name="luchador" size={6} />
              <p>{torneosMensuales.length === 0
                ? 'CREA UN RETO EN LA\nPESTAÑA "RETOS Y SUPERTORNEOS"'
                : 'SELECCIONA UN RETO\nPARA METER SU RÉCORD'}</p>
            </div>
          ) : selTorneo.juegos.length === 0 ? (
            <p className="vacio-inline">Este reto todavía no tiene juegos asociados.</p>
          ) : !torneoJuego ? (
            <p className="vacio-inline">Cargando…</p>
          ) : torneoJuego.parametros.length === 0 ? (
            <p className="vacio-inline">
              Este juego no tiene parámetros de puntuación. Edítalo en la pestaña JUEGOS para añadirlos.
            </p>
          ) : usuarios.length === 0 ? (
            <p className="vacio-inline">
              No hay jugadores todavía. Crea uno en la pestaña JUGADORES antes de meter un récord.
            </p>
          ) : (
            <>
              {selTorneo.juegos.length > 1 && (
                <SelectorJuego
                  juegos={selTorneo.juegos}
                  sel={torneoJuego}
                  onSel={(j) => setSelTorneoJuegoId(j.id)}
                />
              )}
              <ScoreForm
                key={`torneo-${selTorneo?.id}-${selTorneoJuegoId}-${torneoScoreFormKey}`}
                juego={torneoJuego}
                usuarios={usuarios}
                score={null}
                onGuardar={guardarTorneoScore}
                onCancelar={() => {}}
                onError={avisarError}
              />
            </>
          )}
        </div>
      )}

      {meterSubTab === 'supertorneos' && (
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
            <div className="placeholder">
              <PixelSprite name="luchador" size={6} />
              <p>{torneosSuper.length === 0
                ? 'CREA UN SUPERTORNEO EN LA\nPESTAÑA "TORNEOS"'
                : 'SELECCIONA UN SUPERTORNEO\nPARA METER SU RÉCORD'}</p>
            </div>
          ) : selTorneo.juegos.length === 0 ? (
            <p className="vacio-inline">Este torneo todavía no tiene juegos asociados.</p>
          ) : !torneoJuego ? (
            <p className="vacio-inline">Cargando…</p>
          ) : torneoJuego.parametros.length === 0 ? (
            <p className="vacio-inline">
              Este juego no tiene parámetros de puntuación. Edítalo en la pestaña JUEGOS para añadirlos.
            </p>
          ) : usuarios.length === 0 ? (
            <p className="vacio-inline">
              No hay jugadores todavía. Crea uno en la pestaña JUGADORES antes de meter un récord.
            </p>
          ) : (
            <>
              {selTorneo.juegos.length > 0 && (
                <SelectorJuego
                  juegos={selTorneo.juegos}
                  sel={torneoJuego}
                  onSel={(j) => setSelTorneoJuegoId(j.id)}
                />
              )}
              <ScoreForm
                key={`super-${selTorneo?.id}-${selTorneoJuegoId}-${torneoScoreFormKey}`}
                juego={torneoJuego}
                usuarios={usuarios}
                score={null}
                onGuardar={guardarTorneoScore}
                onCancelar={() => {}}
                onError={avisarError}
              />
            </>
          )}
        </div>
      )}
    </section>
  )
}
