// Tabla de récords (ranking) de un juego, reutilizada tanto por la
// clasificación general como por la clasificación de cada torneo.
// Clasificación general de un supertorneo sumando los puntos acumulados por cada jugador en cada juego.
export function calcularClasificacionGeneralSuper(torneo, todasLasScores, todosLosJuegos) {
  if (!torneo || !torneo.juegos || torneo.juegos.length === 0 || !todasLasScores || !todosLosJuegos) return []

  const PUNTOS_POS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
  const userMap = {}

  torneo.juegos.forEach((tj) => {
    const juego = todosLosJuegos.find((j) => j.id === tj.id) || tj
    const scoresJuego = todasLasScores.filter((s) => s.juego_id === juego.id)
    if (scoresJuego.length === 0) return

    const rankingParams = (juego.parametros || [])
      .filter((p) => p.es_ranking)
      .sort((a, b) => (a.orden_ranking || 0) - (b.orden_ranking || 0))

    const ordenadas = [...scoresJuego].sort((a, b) => {
      for (const param of rankingParams) {
        const pid = param.parametro_id
        const va = (a.valores || []).find((v) => v.parametro_id === pid)
        const vb = (b.valores || []).find((v) => v.parametro_id === pid)
        let cmp = 0
        if (param.tipo === 'texto') {
          cmp = (va?.valor_texto || '').localeCompare(vb?.valor_texto || '', undefined, { sensitivity: 'base' })
        } else {
          const na = Number(va?.valor_num ?? 0)
          const nb = Number(vb?.valor_num ?? 0)
          cmp = na - nb
        }
        if (param.direccion === 'asc') cmp = -cmp
        if (cmp !== 0) return -cmp
      }
      return (a.creado_en || '').localeCompare(b.creado_en || '')
    })

    ordenadas.forEach((score, idx) => {
      const pts = idx < PUNTOS_POS.length ? PUNTOS_POS[idx] : 0
      const uid = score.usuario_id
      if (!userMap[uid]) {
        userMap[uid] = { usuario_id: uid, usuario: score.usuario, puntos: 0, juegos: 0 }
      }
      userMap[uid].puntos += pts
      userMap[uid].juegos += 1
    })
  })

  return Object.values(userMap).sort((a, b) => b.puntos - a.puntos)
}

export function SuperGeneralTable({ generalStandings }) {
  return (
    <div className="super-general-container">
      <h3 className="panel-subtitle">🏆 CLASIFICACIÓN GENERAL</h3>
      <div className="ranking super-general-ranking">
        <div className="ranking-body">
          <div className="ranking-head super-general-head">
            <span className="pos">#</span>
            <span className="ini">JUGADOR</span>
            <span className="pts" style={{ textAlign: 'right', paddingRight: '8px' }}>PUNTOS</span>
          </div>

          {generalStandings.length === 0 && <div className="vacio">Sin récords todavía</div>}

          {generalStandings.map((u, i) => {
            const rank = i + 1
            return (
              <div key={u.usuario_id} className={`fila ${rank === 1 ? 'top1' : ''} super-general-fila`}>
                <span className="pos">{String(rank).padStart(2, '0')}</span>
                <span className="ini">
                  {u.usuario}
                  {rank <= 3 && (
                    <span className="medalla">{['🥇', '🥈', '🥉'][rank - 1]}</span>
                  )}
                </span>
                <span className="pts" style={{ textAlign: 'right', paddingRight: '8px', color: 'var(--sms-blue-dark)' }}>
                  {u.puntos} <small style={{ fontSize: '9px', opacity: 0.7 }}>PTS</small>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
