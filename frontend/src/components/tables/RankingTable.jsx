import { fechaLarga } from '../../utils/date'

export function RankingTable({ juego, scores, cargando = false, filtro = '', setFiltro, onEditar, onEliminar, esAdmin = false }) {
  const f = filtro ? filtro.trim().toLowerCase() : ''
  const filas = scores
    .map((s, i) => ({ ...s, rank: i + 1 }))
    .filter((s) => !f || s.usuario.toLowerCase().includes(f))

  const colSpanCount = juego.parametros.length + (esAdmin ? 4 : 3)

  return (
    <div className="ranking-tabla-wrap">
        <table className="tabla-ranking">
          <thead>
            <tr>
              <th className="pos">#</th>
              <th className="ini">JUGADOR</th>
              {juego.parametros.map((p) => (
                <th key={p.parametro_id} className="th-param">{p.nombre.toUpperCase()}</th>
              ))}
              <th className="fecha">FECHA</th>
              {esAdmin && <th className="del"></th>}
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={colSpanCount} className="vacio">
                  <div className="ranking-loading-inline">
                    <div className="async-img-spinner" />
                    <span>Cargando récords...</span>
                  </div>
                </td>
              </tr>
            ) : scores.length === 0 ? (
              <tr>
                <td colSpan={colSpanCount} className="vacio">
                  GAME OVER — sin récords
                </td>
              </tr>
            ) : filas.length === 0 ? (
              <tr>
                <td colSpan={colSpanCount} className="vacio">
                  Sin jugadores que coincidan
                </td>
              </tr>
            ) : (
              filas.map((s) => (
                <tr key={s.id} className={s.rank === 1 ? 'top1' : ''}>
                  <td className="pos">{String(s.rank).padStart(2, '0')}</td>
                  <td className="ini">
                    {s.usuario}
                    {s.rank <= 3 && (
                      <span className="medalla">{['🥇', '🥈', '🥉'][s.rank - 1]}</span>
                    )}
                  </td>
                  {juego.parametros.map((p) => {
                    const v = s.valores.find((x) => x.parametro_id === p.parametro_id)
                    const texto = v && v.valor_texto != null ? (p.tipo === 'numero' ? Number(v.valor_num).toLocaleString() : v.valor_texto) : ''
                    return <td key={p.parametro_id} className="pts">{texto}</td>
                  })}
                  <td className="fecha">{fechaLarga(s.fecha)}</td>
                  {esAdmin && (
                    <td className="fila-acciones">
                      <button className="borrar sm" onClick={() => onEditar(s)} data-tooltip="Editar récord" data-tooltip-pos="left">✎</button>
                      <button className="borrar sm" onClick={() => onEliminar(s)} data-tooltip="Eliminar récord" data-tooltip-pos="left">✕</button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
  )
}
