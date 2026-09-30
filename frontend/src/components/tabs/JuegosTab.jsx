import { esMediaMp4 } from '../common/AsyncImage'
import { LogoThumb } from '../common/LogoThumb'
import { JuegoForm } from '../forms/JuegoForm'

export function JuegosTab({
  esAdmin,
  formJuego,
  parametros,
  juegos,
  guardarJuego,
  setFormJuego,
  avisarError,
  filtro,
  setFiltro,
  juegosFiltrados,
  sel,
  abrirDetalleJuego,
  eliminarJuego,
}) {
  return (
    <section className="screen">
      <h2 className="panel-title">▸ JUEGOS</h2>

      {esAdmin && formJuego ? (
        <JuegoForm
          juego={formJuego}
          catalogo={parametros}
          juegos={juegos}
          onGuardar={guardarJuego}
          onCancelar={() => setFormJuego(null)}
          onError={avisarError}
        />
      ) : (
        <>
          {esAdmin && (
            <button className="btn-nuevo" onClick={() => setFormJuego('nuevo')}>+ NUEVO JUEGO</button>
          )}

          {juegos.length > 0 && (
            <input
              className="buscador"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="🔍 Filtrar juegos..."
            />
          )}

          <div className="grid-juegos lista-scroll">
            {juegos.length === 0 && (
              <div className="vacio">No hay juegos todavía</div>
            )}
            {juegosFiltrados.length === 0 && juegos.length > 0 && (
              <div className="vacio">Sin coincidencias</div>
            )}
            {juegosFiltrados.map((j) => (
              <div
                key={j.id}
                className={`card-juego ${sel && sel.id === j.id ? 'activo' : ''}`}
                onClick={() => abrirDetalleJuego(j)}
              >
                <div className="card-juego-top">
                  <div className="card-juego-left">
                    <div className="celda-logo"><LogoThumb juego={j} size={8} /></div>
                    <div className="jinfo">
                      <span className="jnombre">{j.nombre}</span>
                      <span className="jmeta">
                        {[j.anio, j.tipo, j.desarrollador].filter(Boolean).join(' · ') || 'Sin ficha completa'}
                      </span>
                      <span className="jmeta jmeta-records">
                        {j.total_scores} {j.total_scores === 1 ? 'récord' : 'récords'}
                      </span>
                    </div>
                    {esAdmin && (
                      <div className="celda-acciones">
                        <button className="borrar editar" onClick={(e) => { e.stopPropagation(); setFormJuego(j) }} data-tooltip="Editar juego" data-tooltip-pos="left">✎</button>
                        {(j.total_scores_all ?? j.total_scores) > 0 ? (
                          <button className="borrar bloqueado" disabled data-tooltip="No se puede eliminar: ya tiene récords" data-tooltip-pos="left" onClick={(e) => e.stopPropagation()}>🔒</button>
                        ) : (
                          <button className="borrar" onClick={(e) => { e.stopPropagation(); eliminarJuego(j) }} data-tooltip="Eliminar juego" data-tooltip-pos="left">✕</button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="card-juego-thumbs">
                    {j.caratula && <img className="caratula-thumb" src={j.caratula} alt="Carátula" />}
                    {j.screenshot && (
                      esMediaMp4(j.screenshot) ? (
                        <video
                          className="shot-thumb"
                          src={j.screenshot}
                          autoPlay
                          muted
                          playsInline
                          onTimeUpdate={(e) => {
                            const v = e.target
                            if (v.duration && v.currentTime >= v.duration - 0.12) {
                              v.currentTime = 0
                            }
                          }}
                          onEnded={(e) => {
                            const v = e.target
                            v.currentTime = 0
                            v.play().catch(() => {})
                          }}
                        />
                      ) : (
                        <img className="shot-thumb" src={j.screenshot} alt="Captura" />
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
