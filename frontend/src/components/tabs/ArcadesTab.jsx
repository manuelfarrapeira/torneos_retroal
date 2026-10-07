import { useEffect, useRef, useState } from 'react'
import { AsyncImage } from '../common/AsyncImage'
import { DropZone } from '../common/DropZone'
import { fileToDataUrl } from '../../utils/file'

const FILAS_VISIBLES = 2

export function ArcadesTab({
  esAdmin,
  arcades,
  usuarios = [],
  guardarArcade,
  eliminarArcade,
  avisarError,
  formArcade,
  setFormArcade,
}) {
  const [imagenEnModal, setImagenEnModal] = useState(null)
  const [cerrandoModal, setCerrandoModal] = useState(false)
  const gridRef = useRef(null)
  const [alturaMax, setAlturaMax] = useState(null)

  // Limita la altura a FILAS_VISIBLES filas (se recalcula al cambiar el tamaño/columnas)
  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const calcular = () => {
      const tarjetas = Array.from(grid.children)
      const filas = [...new Set(tarjetas.map((t) => t.offsetTop))].sort((a, b) => a - b)
      if (filas.length <= FILAS_VISIBLES) {
        setAlturaMax(null)
        return
      }
      const gap = parseFloat(getComputedStyle(grid).rowGap) || 0
      setAlturaMax(filas[FILAS_VISIBLES] - filas[0] - gap)
    }
    calcular()
    const ro = new ResizeObserver(calcular)
    ro.observe(grid)
    Array.from(grid.children).forEach((c) => ro.observe(c))
    return () => ro.disconnect()
  }, [arcades])

  const cerrarModal = () => {
    setCerrandoModal(true)
    setTimeout(() => {
      setImagenEnModal(null)
      setCerrandoModal(false)
    }, 300)
  }

  return (
    <section className="screen">
      <h2 className="panel-title">🏪 ARCADES RETROAL</h2>

      {esAdmin && (
        <div style={{ marginBottom: '20px', display: 'flex', gap: '8px' }}>
          <button 
            className="btn-primario"
            onClick={() => setFormArcade('nuevo')}
            style={{ padding: '10px 20px', fontSize: '12px', fontFamily: 'var(--font-pixel)' }}
          >
            + AÑADIR ARCADE
          </button>
        </div>
      )}

      <div
        className="arcades-scroll"
        style={alturaMax ? { maxHeight: `${alturaMax}px`, overflowY: 'auto' } : undefined}
      >
      <div className="arcades-grid" ref={gridRef}>
        {arcades.length === 0 && (
          <div className="vacio">No hay arcades todavía</div>
        )}

        {arcades.map((arcade) => (
          <div
            key={arcade.id}
            className="arcade-card"
            style={{
              borderColor: formArcade?.id === arcade.id ? 'var(--sms-cyan)' : undefined,
              boxShadow: formArcade?.id === arcade.id ? '0 0 15px var(--sms-cyan)' : undefined,
            }}
          >
            <div className="arcade-img-wrap" style={{ cursor: arcade.imagen ? 'pointer' : 'default' }} onClick={() => arcade.imagen && setImagenEnModal(arcade.imagen)}>
              {arcade.imagen && (
                <AsyncImage src={arcade.imagen} alt="Arcade" className="arcade-img" style={{ height: '100%' }} />
              )}
              {!arcade.imagen && <div className="arcade-img-placeholder">Sin imagen</div>}
            </div>

            <div className="arcade-info">
              {(() => {
                const nombres = [arcade.usuario_id, arcade.usuario_id2]
                  .map((uid) => uid && usuarios.find((u) => u.id === uid)?.nombre)
                  .filter(Boolean)
                return nombres.length > 0 && <div className="arcade-jugador">🕹 {nombres.join(' · ')}</div>
              })()}
              {arcade.enlace && (
                <a
                  href={arcade.enlace}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="arcade-btn-ver-video"
                  title="Ver video / Ir a la web"
                >
                  📹 VER VIDEO
                </a>
              )}
              
              {esAdmin && (
                <div className="arcade-info-admin">
                  <button
                    className="arcade-btn-editar"
                    onClick={() => setFormArcade(arcade)}
                    title="Editar"
                  >
                    ✎ EDITAR
                  </button>
                  <button
                    className="arcade-btn-eliminar"
                    onClick={() => eliminarArcade(arcade.id)}
                    title="Eliminar"
                  >
                    ✕ ELIMINAR
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      </div>

      {imagenEnModal && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className={`arcade-modal-imagen ${cerrandoModal ? 'arcade-modal-closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            <button 
              className="arcade-modal-cerrar"
              onClick={cerrarModal}
              title="Cerrar"
            >
              ✕
            </button>
            <img src={imagenEnModal} alt="Vista completa" className="arcade-imagen-completa" />
          </div>
        </div>
      )}
    </section>
  )
}
