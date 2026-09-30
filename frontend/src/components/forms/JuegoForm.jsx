import { useMemo, useState } from 'react'
import { esMediaMp4 } from '../common/AsyncImage'
import { DropZone } from '../common/DropZone'
import { fileToDataUrl } from '../../utils/file'
import { TIPO_LABEL } from '../../utils/constants'

// ---------- Formulario de juego (crear/editar ficha + sistema de puntuación) ----------
export function JuegoForm({ juego, catalogo, juegos, onGuardar, onCancelar, onError }) {
  const editando = !!juego && juego !== 'nuevo'
  const [nombre, setNombre] = useState(juego?.nombre || '')
  const [anio, setAnio] = useState(juego?.anio ?? '')
  const [tipo, setTipo] = useState(juego?.tipo || '')
  const [desarrollador, setDesarrollador] = useState(juego?.desarrollador || '')
  const [logoData, setLogoData] = useState(null)
  const [logoPreview, setLogoPreview] = useState(juego?.logo || null)
  const [logoBorrar, setLogoBorrar] = useState(false)
  const [caratulaData, setCaratulaData] = useState(null)
  const [caratulaPreview, setCaratulaPreview] = useState(juego?.caratula || null)
  const [caratulaBorrar, setCaratulaBorrar] = useState(false)
  const [shotData, setShotData] = useState(null)
  const [shotPreview, setShotPreview] = useState(juego?.screenshot || null)
  const [shotBorrar, setShotBorrar] = useState(false)
  const [seleccion, setSeleccion] = useState(() =>
    (juego?.parametros || [])
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((p) => ({ parametro_id: p.parametro_id, nombre: p.nombre, tipo: p.tipo, es_ranking: !!p.es_ranking, direccion: p.direccion || 'desc' }))
  )

  const juegoTieneRecords = editando && ((juego?.total_scores_all ?? juego?.total_scores ?? 0) > 0)
  const parametrosInicialesSet = useMemo(
    () => new Set((juego?.parametros || []).map((p) => p.parametro_id)),
    [juego]
  )

  const disponibles = catalogo
    .filter((p) => !seleccion.some((s) => s.parametro_id === p.id))
    .slice()
    .sort((a, b) => usoParametro(b.id) - usoParametro(a.id))

  function usoParametro(parametroId) {
    return (juegos || []).filter((j) => (j.parametros || []).some((p) => p.parametro_id === parametroId)).length
  }

  function agregarParametro(p) {
    setSeleccion([...seleccion, { parametro_id: p.id, nombre: p.nombre, tipo: p.tipo, es_ranking: false, direccion: p.tipo === 'tiempo' ? 'asc' : 'desc' }])
  }
  function quitarParametro(id) {
    if (juegoTieneRecords && parametrosInicialesSet.has(id)) {
      onError('No se puede quitar un parámetro de un juego que ya tiene récords guardados')
      return
    }
    setSeleccion(seleccion.filter((s) => s.parametro_id !== id))
  }
  function mover(idx, dir) {
    const dest = idx + dir
    if (dest < 0 || dest >= seleccion.length) return
    const copia = [...seleccion]
    ;[copia[idx], copia[dest]] = [copia[dest], copia[idx]]
    setSeleccion(copia)
  }
  function toggleRanking(id) {
    setSeleccion(seleccion.map((s) => (s.parametro_id === id ? { ...s, es_ranking: !s.es_ranking } : s)))
  }
  function cambiarDireccion(id, dir) {
    setSeleccion(seleccion.map((s) => (s.parametro_id === id ? { ...s, direccion: dir } : s)))
  }

  async function procesarLogoFile(f) {
    if (!f) return
    try {
      const url = await fileToDataUrl(f)
      setLogoData(url); setLogoPreview(url); setLogoBorrar(false)
    } catch (err) { onError(err?.message || 'Error al leer el logo') }
  }
  async function procesarCaratulaFile(f) {
    if (!f) return
    try {
      const url = await fileToDataUrl(f)
      setCaratulaData(url); setCaratulaPreview(url); setCaratulaBorrar(false)
    } catch (err) { onError(err?.message || 'Error al leer la carátula') }
  }
  async function procesarShotFile(f) {
    if (!f) return
    try {
      const url = await fileToDataUrl(f)
      setShotData(url); setShotPreview(url); setShotBorrar(false)
    } catch (err) { onError(err?.message || 'Error al leer la captura/vídeo') }
  }

  async function onLogoChange(e) { procesarLogoFile(e.target.files[0]) }
  async function onCaratulaChange(e) { procesarCaratulaFile(e.target.files[0]) }
  async function onShotChange(e) { procesarShotFile(e.target.files[0]) }
  function quitarLogo() { setLogoData(null); setLogoPreview(null); setLogoBorrar(true) }
  function quitarCaratula() { setCaratulaData(null); setCaratulaPreview(null); setCaratulaBorrar(true) }
  function quitarShot() { setShotData(null); setShotPreview(null); setShotBorrar(true) }

  function submit(e) {
    e.preventDefault()
    if (!nombre.trim()) { onError('El nombre es obligatorio'); return }
    let contadorRanking = 0
    const payload = {
      nombre: nombre.trim(),
      anio: anio === '' ? null : anio,
      tipo: tipo.trim(),
      desarrollador: desarrollador.trim(),
      parametros: seleccion.map((s) => {
        if (s.es_ranking) contadorRanking++
        return {
          parametro_id: s.parametro_id,
          es_ranking: s.es_ranking,
          direccion: s.direccion,
          orden_ranking: s.es_ranking ? contadorRanking : null,
        }
      }),
    }
    if (logoData) payload.logo = logoData
    if (logoBorrar) payload.logo_borrar = true
    if (caratulaData) payload.caratula = caratulaData
    if (caratulaBorrar) payload.caratula_borrar = true
    if (shotData) payload.screenshot = shotData
    if (shotBorrar) payload.screenshot_borrar = true
    onGuardar(payload, editando ? juego.id : null)
  }

  const rankingElegidos = seleccion.filter((s) => s.es_ranking)

  return (
    <form className="panel-form" onSubmit={submit}>
      <h3 className="form-subtitulo">▸ FICHA DEL JUEGO</h3>
      <div className="form-grid">
        <label className="campo">
          <span>NOMBRE *</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} placeholder="Nombre del juego" />
        </label>
        <label className="campo campo-corto">
          <span>AÑO</span>
          <input type="number" value={anio} onChange={(e) => setAnio(e.target.value)} min="1950" max="2100" placeholder="1991" />
        </label>
        <label className="campo">
          <span>TIPO / GÉNERO</span>
          <input value={tipo} onChange={(e) => setTipo(e.target.value)} maxLength={40} placeholder="Lucha, plataformas, matamarcianos..." />
        </label>
        <label className="campo">
          <span>DESARROLLADOR</span>
          <input value={desarrollador} onChange={(e) => setDesarrollador(e.target.value)} maxLength={60} placeholder="Capcom, Konami..." />
        </label>
      </div>

      <div className="uploads-row">
        <div className="img-upload">
          <span className="img-upload-lbl">LOGO</span>
          <DropZone accept="image/*" onFileSelect={procesarLogoFile}>
            <div className="img-preview">
              {logoPreview ? <img src={logoPreview} alt="Logo" /> : <span className="img-vacio">Sin logo<br/><small style={{ fontSize: '9px', opacity: 0.7 }}>(Arrastra imagen)</small></span>}
            </div>
          </DropZone>
          <div className="img-upload-acciones">
            <label className="btn-file">
              SUBIR
              <input type="file" accept="image/*" onChange={onLogoChange} hidden />
            </label>
            {logoPreview && <button type="button" className="btn-secundario" onClick={quitarLogo}>QUITAR</button>}
          </div>
        </div>
        <div className="img-upload">
          <span className="img-upload-lbl">CARÁTULA</span>
          <DropZone accept="image/*" onFileSelect={procesarCaratulaFile}>
            <div className="img-preview">
              {caratulaPreview ? <img src={caratulaPreview} alt="Carátula" /> : <span className="img-vacio">Sin carátula<br/><small style={{ fontSize: '9px', opacity: 0.7 }}>(Arrastra imagen)</small></span>}
            </div>
          </DropZone>
          <div className="img-upload-acciones">
            <label className="btn-file">
              SUBIR
              <input type="file" accept="image/*" onChange={onCaratulaChange} hidden />
            </label>
            {caratulaPreview && <button type="button" className="btn-secundario" onClick={quitarCaratula}>QUITAR</button>}
          </div>
        </div>
        <div className="img-upload">
          <span className="img-upload-lbl">SCREENSHOT / MP4</span>
          <DropZone accept="image/*,video/mp4,.mp4" onFileSelect={procesarShotFile}>
            <div className="img-preview img-preview-wide">
              {shotPreview ? (
                esMediaMp4(shotPreview) ? (
                  <video
                    src={shotPreview}
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
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <img src={shotPreview} alt="Captura" />
                )
              ) : (
                <span className="img-vacio">Sin captura/vídeo<br/><small style={{ fontSize: '9px', opacity: 0.7 }}>(Arrastra imagen o MP4)</small></span>
              )}
            </div>
          </DropZone>
          <div className="img-upload-acciones">
            <label className="btn-file">
              SUBIR
              <input type="file" accept="image/*,video/mp4,.mp4" onChange={onShotChange} hidden />
            </label>
            {shotPreview && <button type="button" className="btn-secundario" onClick={quitarShot}>QUITAR</button>}
          </div>
        </div>
      </div>

      <h3 className="form-subtitulo">▸ SISTEMA DE PUNTUACIÓN</h3>
      <p className="form-ayuda">
        Elige qué campos se piden al meter una puntuación de este juego. Marca cuáles deciden el ranking
        (el primero marcado, en el orden de la lista, es el campo principal; los siguientes desempatan).
      </p>

      {disponibles.length > 0 && (
        <div className="param-catalogo">
          {disponibles.map((p) => (
            <button type="button" key={p.id} className="chip" onClick={() => agregarParametro(p)}>
              + {p.nombre} <span className="chip-tipo">{TIPO_LABEL[p.tipo]}</span>
            </button>
          ))}
        </div>
      )}
      {catalogo.length === 0 && (
        <p className="hint">No hay parámetros creados todavía. Ve a la pestaña PARÁMETROS para crear "Puntos", "Tiempo", "Fase"...</p>
      )}

      {seleccion.length === 0 ? (
        <p className="vacio-inline">Este juego aún no tiene parámetros de puntuación asignados.</p>
      ) : (
        <ul className="param-lista">
          {seleccion.map((s, idx) => (
            <li key={s.parametro_id} className="param-row">
              <div className="param-row-orden">
                <button type="button" disabled={idx === 0} onClick={() => mover(idx, -1)}>▲</button>
                <button type="button" disabled={idx === seleccion.length - 1} onClick={() => mover(idx, 1)}>▼</button>
              </div>
              <span className="param-row-nombre">{s.nombre}</span>
              <span className="chip-tipo">{TIPO_LABEL[s.tipo]}</span>
              <label className="param-row-ranking">
                <input type="checkbox" checked={s.es_ranking} onChange={() => toggleRanking(s.parametro_id)} />
                RANKING{s.es_ranking && ` (#${rankingElegidos.findIndex((r) => r.parametro_id === s.parametro_id) + 1})`}
              </label>
              {s.es_ranking && s.tipo !== 'texto' && (
                <select value={s.direccion} onChange={(e) => cambiarDireccion(s.parametro_id, e.target.value)}>
                  <option value="desc">Mayor es mejor</option>
                  <option value="asc">Menor es mejor</option>
                </select>
              )}
              {juegoTieneRecords && parametrosInicialesSet.has(s.parametro_id) ? (
                <button
                  type="button"
                  className="borrar sm bloqueado"
                  disabled
                  title="No se puede quitar: este juego ya tiene récords guardados"
                >
                  🔒
                </button>
              ) : (
                <button type="button" className="borrar sm" onClick={() => quitarParametro(s.parametro_id)}>✕</button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="acciones-form">
        <button type="submit">{editando ? 'GUARDAR CAMBIOS' : 'CREAR JUEGO'}</button>
        <button type="button" className="btn-secundario" onClick={onCancelar}>CANCELAR</button>
      </div>
    </form>
  )
}
