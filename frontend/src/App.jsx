import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import retroalBanner from './assets/retroal-banner.png'
import ryuGif from './assets/ryu.gif'
import kenGif from './assets/ken.gif'
import headerLeft from './assets/header-left.png'
import headerRight from './assets/header-right.png'

// Permite arrastrar con el ratón para hacer scroll horizontal en un contenedor con overflow.
function useDragScroll() {
  const ref = useRef(null)
  const estado = useRef({ arrastrando: false, x: 0, scrollLeft: 0, movido: false })

  function onMouseDown(e) {
    const el = ref.current
    if (!el) return
    estado.current = { arrastrando: true, x: e.pageX, scrollLeft: el.scrollLeft, movido: false }
    el.classList.add('arrastrando')
  }
  function onMouseMove(e) {
    if (!estado.current.arrastrando) return
    const el = ref.current
    if (!el) return
    const delta = e.pageX - estado.current.x
    if (Math.abs(delta) > 3) estado.current.movido = true
    el.scrollLeft = estado.current.scrollLeft - delta
  }
  function pararArrastre() {
    estado.current.arrastrando = false
    ref.current?.classList.remove('arrastrando')
  }
  function onClickCapture(e) {
    if (estado.current.movido) { e.preventDefault(); e.stopPropagation() }
  }

  return {
    ref,
    onMouseDown,
    onMouseMove,
    onMouseUp: pararArrastre,
    onMouseLeave: pararArrastre,
    onClickCapture,
  }
}

const API_JUEGOS = 'api/juegos.php'
const API_SCORES = 'api/puntuaciones.php'
const API_USUARIOS = 'api/usuarios.php'
const API_PARAMETROS = 'api/parametros.php'
const API_TORNEOS = 'api/torneos.php'
const API_CLASIFICACION = 'api/clasificacion.php'
const API_TORNEOS_JUGADOR = 'api/torneos_jugador.php'
const API_AUTH = 'api/auth.php'
const API_NORMAS = 'api/normas.php'

const TIPO_LABEL = { numero: 'Número', tiempo: 'Tiempo', texto: 'Texto' }

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const AÑOS_TORNEO = Array.from({ length: 11 }, (_, i) => 2025 + i)

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

// Normaliza texto para comparar/ordenar sin distinguir mayúsculas ni tildes.
function normalizarTexto(s) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

// Convierte un <input type="file"> a Data URL (base64) para enviarlo al API.
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No hay archivo seleccionado'))
      return
    }
    const MAX_BYTES = 1 * 1024 * 1024 // 1 MB máximo
    if (file.size > MAX_BYTES) {
      reject(new Error(`El archivo "${file.name}" supera el tamaño máximo permitido (1 MB).`))
      return
    }
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

// Formatea "2026-09-23" -> "23/09/2026"
function fechaLarga(iso) {
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

// Formatea el valor de un parámetro de puntuación (numero/tiempo/texto) para mostrarlo.
function formatearValorParam(parametro, valores) {
  const v = (valores || []).find((x) => x.parametro_id === parametro.parametro_id)
  if (!v || v.valor_texto == null) return ''
  return parametro.tipo === 'numero' ? Number(v.valor_num).toLocaleString() : v.valor_texto
}

// Salto de línea en tabla clasificación para nombres de más de 20 caracteres (máximo 2 líneas, 1 solo salto en el primer espacio tras el carácter 20)
function formatearNombreJuegoClasificacion(nombre) {
  if (!nombre || nombre.length <= 20) return nombre
  const idx = nombre.indexOf(' ', 20)
  if (idx === -1) return nombre
  return (
    <>
      <span style={{ whiteSpace: 'nowrap' }}>{nombre.slice(0, idx)}</span>
      <br />
      <span style={{ whiteSpace: 'nowrap' }}>{nombre.slice(idx + 1)}</span>
    </>
  )
}

// Homenaje a clásicos de los recreativos (solo nombres, sin imágenes con copyright).
const JUEGOS_DEMO = [
  'STREET FIGHTER II', 'METAL SLUG', 'PANG', 'PAC-MAN', 'GALAGA',
  'BUBBLE BOBBLE', 'DONKEY KONG', 'R-TYPE', 'GHOSTS N GOBLINS',
  'FINAL FIGHT', '1943', 'DOUBLE DRAGON', 'CONTRA', 'SPACE INVADERS',
]

// ---- Sprites pixel-art ORIGINALES (dibujados aquí, sin copyright) ----
const PALETTE = {
  c: '#00f0ff', b: '#0077ff', y: '#ffe600', r: '#ff2e88',
  g: '#39ff14', p: '#b026ff', w: '#ffffff', o: '#ff7b00',
  k: '#141414', s: '#ffcc99', h: '#7a3d00', W: '#f4f4ff',
}

const SPRITES = {
  nave: [
    '.....y.....', '....yyy....', '....ccc....', '..c.ccc.c..',
    '.ccccccccc.', 'ccccccccccc', 'c.c.ccc.c.c', '....r.r....',
  ],
  alien: [
    '..g.....g..', '...g...g...', '..ggggggg..', '.gg.ggg.gg.',
    'ggggggggggg', 'g.ggggggg.g', 'g.g.....g.g', '...gg.gg...',
  ],
  bola: [
    '..rrrr..', '.rwwrrr.', 'rwwrrrrr', 'rrrrrrrr',
    'rrrrrrrr', 'rrrrrrrr', '.rrrrrr.', '..rrrr..',
  ],
  tanque: [
    '...........', '....ooo....', '...ooooo...', 'gggggggg...',
    'gggggggggoo', 'ggggggggg..', 'gggggggg...', 'g.g.g.g.g..',
  ],
  luchador: [
    '....kkkk....', '...khhhhk...', '..khhhhhhk..', '..hssssssh..',
    '..sskssks...', '..ssssssss..', '...ssssss...', '.WWWWWWWWWW.',
    'sWWWWWWWWWWs', '.WWWWWWWWWW.', '..rrrrrrrr..', '..WWW..WWW..',
    '..WWW..WWW..', '..kkk..kkk..',
  ],
  fantasma: [
    '...pppppp...', '..pppppppp..', '.pppppppppp.', '.pwwppppwwp.',
    '.pkwppppkwp.', '.pppppppppp.', '.pppppppppp.', '.pppppppppp.',
    '.pppppppppp.', '.pppppppppp.', 'p.pp.pp.pp.p',
  ],
  moneda: [
    '..oooo..', '.oyyyyo.', 'oyywyyyo', 'oywyywyo',
    'oywyywyo', 'oyywyyyo', '.oyyyyo.', '..oooo..',
  ],
  calavera: [
    '..WWWWWW..', '.WWWWWWWW.', 'WWWWWWWWWW', 'WWkkWWkkWW',
    'WWkkWWkkWW', 'WWWWWWWWWW', 'WWWkWWkWWW', '.WWWWWWWW.', '..W.WW.W..',
  ],
}

const SPRITE_NAMES = ['nave', 'luchador', 'alien', 'fantasma', 'bola', 'tanque', 'moneda', 'calavera']

function PixelSprite({ name, size = 4 }) {
  const rows = SPRITES[name]
  const w = rows[0].length
  const h = rows.length
  const rects = []
  rows.forEach((row, y) => {
    ;[...row].forEach((ch, x) => {
      const fill = PALETTE[ch]
      if (fill) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={fill} />)
    })
  })
  return (
    <svg className="sprite" width={w * size} height={h * size}
      viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" aria-hidden="true">
      {rects}
    </svg>
  )
}

// Elige un sprite estable a partir del id del juego.
function spriteForGame(id) {
  return SPRITE_NAMES[id % SPRITE_NAMES.length]
}

// Combo desplegable con búsqueda integrada: escribe dentro para filtrar y elige.
function SelectorJuego({ juegos, sel, onSel }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const triggerRef = useRef(null)

  if (juegos.length === 0) return null

  const q = query.trim().toLowerCase()
  const filtrados = q
    ? juegos.filter((j) => j.nombre.toLowerCase().includes(q))
    : juegos

  const cerrar = () => { setOpen(false); setQuery('') }

  function actualizarPos() {
    const r = triggerRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 6, left: r.left, width: r.width })
  }

  function abrir() {
    actualizarPos()
    setOpen(true)
  }

  // El panel se posiciona en "fixed" (coordenadas de viewport) para no
  // quedar recortado por el overflow:auto del popup de torneos; hay que
  // recalcular su posición si el contenedor hace scroll o cambia el tamaño.
  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', actualizarPos, true)
    window.addEventListener('resize', actualizarPos)
    return () => {
      window.removeEventListener('scroll', actualizarPos, true)
      window.removeEventListener('resize', actualizarPos)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <div className="selector campo-selector-torneo">
      <label className="selector-lbl">JUEGO:</label>
      <div className="combo">
        <button
          ref={triggerRef}
          type="button"
          className="combo-trigger"
          onClick={() => (open ? cerrar() : abrir())}
        >
          <span className={sel ? 'combo-valor' : 'combo-valor combo-valor-vacio'}>
            {sel ? sel.nombre : '-- elige juego --'}
          </span>
          {sel && <LogoThumb juego={sel} size={3} />}
          <span className="combo-caret" aria-hidden="true">▾</span>
        </button>

        {open && pos && (
          <div className="combo-panel combo-panel-flotante" style={{ top: pos.top, left: pos.left, width: pos.width }}>
            <input
              className="combo-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍 Buscar juego..."
              autoComplete="off"
            />
            <ul className="combo-list">
              {filtrados.length === 0 && <li className="combo-vacio">Sin coincidencias</li>}
              {filtrados.map((j) => (
                <li
                  key={j.id}
                  className={sel && sel.id === j.id ? 'sel' : ''}
                  onClick={() => { onSel(j); cerrar() }}
                >
                  <span className="combo-nombre">{j.nombre}</span>
                  <LogoThumb juego={j} size={3} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {open && <div className="combo-overlay" onClick={cerrar} />}
    </div>
  )
}

// Combo desplegable para ir añadiendo juegos a un supertorneo: al hacer clic
// en un elemento se añade y el panel permanece abierto para seguir eligiendo.
function SelectorJuegoMultiAdd({ juegos, onAdd, placeholder }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const triggerRef = useRef(null)

  const q = query.trim().toLowerCase()
  const filtrados = q ? juegos.filter((j) => j.nombre.toLowerCase().includes(q)) : juegos

  const cerrar = () => { setOpen(false); setQuery('') }

  function actualizarPos() {
    const r = triggerRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 6, left: r.left, width: r.width })
  }

  function abrir() {
    actualizarPos()
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', actualizarPos, true)
    window.addEventListener('resize', actualizarPos)
    return () => {
      window.removeEventListener('scroll', actualizarPos, true)
      window.removeEventListener('resize', actualizarPos)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <div className="selector">
      <div className="combo">
        <button
          ref={triggerRef}
          type="button"
          className="combo-trigger"
          onClick={() => (open ? cerrar() : abrir())}
        >
          <span className="combo-valor combo-valor-vacio">{placeholder}</span>
          <span className="combo-caret" aria-hidden="true">▾</span>
        </button>

        {open && pos && (
          <div className="combo-panel combo-panel-flotante" style={{ top: pos.top, left: pos.left, width: pos.width }}>
            <input
              className="combo-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍 Buscar juego..."
              autoComplete="off"
            />
            <ul className="combo-list">
              {filtrados.length === 0 && (
                <li className="combo-vacio">{juegos.length === 0 ? 'Ya están todos añadidos' : 'Sin coincidencias'}</li>
              )}
              {filtrados.map((j) => (
                <li key={j.id} onClick={() => onAdd(j)}>
                  <span className="combo-nombre">{j.nombre}</span>
                  <LogoThumb juego={j} size={3} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {open && <div className="combo-overlay" onClick={cerrar} />}
    </div>
  )
}

// Combo desplegable con búsqueda para elegir jugador: filtra sin distinguir tildes.
function SelectorUsuario({ usuarios, sel, onSel }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const q = normalizarTexto(query)
  const filtrados = q
    ? usuarios.filter((u) => normalizarTexto(u.nombre).includes(q))
    : usuarios

  const cerrar = () => { setOpen(false); setQuery('') }
  const seleccionado = usuarios.find((u) => String(u.id) === String(sel))

  return (
    <div className="combo">
      <button
        type="button"
        className="combo-trigger"
        onClick={() => (open ? cerrar() : setOpen(true))}
      >
        <span className={seleccionado ? 'combo-valor' : 'combo-valor combo-valor-vacio'}>
          {seleccionado ? seleccionado.nombre : '-- elige jugador --'}
        </span>
        <span className="combo-caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="combo-panel">
          <input
            className="combo-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 Buscar jugador..."
            autoComplete="off"
          />
          <ul className="combo-list">
            {filtrados.length === 0 && <li className="combo-vacio">Sin coincidencias</li>}
            {filtrados.map((u) => (
              <li
                key={u.id}
                className={sel && String(sel) === String(u.id) ? 'sel' : ''}
                onClick={() => { onSel(u.id); cerrar() }}
              >
                <span className="combo-nombre">{u.nombre}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {open && <div className="combo-overlay" onClick={cerrar} />}
    </div>
  )
}

function esMediaMp4(url) {
  if (!url) return false
  const lower = url.toLowerCase()
  return lower.endsWith('.mp4') || lower.startsWith('data:video/mp4')
}

// Componente para cargar imágenes y vídeos MP4 de forma asíncrona sin bloquear el renderizado ni peticiones de la API,
// mostrando un pequeño spinner neon mientras se descarga la imagen o vídeo.
function AsyncImage({ src, alt = '', className = '', style = {} }) {
  const isVideo = esMediaMp4(src)
  const [cargado, setCargado] = useState(isVideo)
  const [error, setError] = useState(false)

  useEffect(() => {
    setCargado(isVideo)
    setError(false)
  }, [src, isVideo])

  if (!src || error) return null

  return (
    <div className="async-img-wrapper" style={style}>
      {!cargado && (
        <div className="async-img-spinner-overlay">
          <div className="async-img-spinner" />
        </div>
      )}
      {isVideo ? (
        <video
          src={src}
          autoPlay
          muted
          playsInline
          preload="auto"
          onCanPlay={() => setCargado(true)}
          onLoadedData={() => setCargado(true)}
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
          onError={() => setError(true)}
          className={className}
          style={{
            opacity: cargado ? 1 : 0.4,
            transition: 'opacity 0.2s ease-in'
          }}
        />
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setCargado(true)}
          onError={() => setError(true)}
          className={className}
          style={{
            opacity: cargado ? 1 : 0.2,
            transition: 'opacity 0.25s ease-in'
          }}
        />
      )}
    </div>
  )
}

// Componente de Zona de Arrastre (Drag and Drop) para subir imágenes y vídeos
function DropZone({ onFileSelect, accept = 'image/*', children, className = '' }) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)

  function handleDragOver(e) {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragging) setIsDragging(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget.contains(e.relatedTarget)) return
    setIsDragging(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  return (
    <div
      className={`dropzone-container ${isDragging ? 'dragging' : ''} ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFileSelect(file)
        }}
        hidden
      />
      {isDragging && (
        <div className="dropzone-overlay">
          <span>📥 ¡SUELTA AQUÍ EL ARCHIVO!</span>
        </div>
      )}
      {children}
    </div>
  )
}

// Miniatura de un juego: usa el logo subido o, si no hay, un sprite pixel-art.
// prioridad="baja" se usa en la marquesina: evita que sus imágenes compitan por
// conexiones de red con las llamadas a la API (JSON) que cargan al mismo tiempo.
function LogoThumb({ juego, size = 4, prioridad = 'auto' }) {
  if (juego.logo) {
    return (
      <img
        className="logo-thumb"
        src={juego.logo}
        alt=""
        style={{ height: size * 11 }}
        loading={prioridad === 'baja' ? 'lazy' : 'eager'}
        fetchPriority={prioridad === 'baja' ? 'low' : 'auto'}
        decoding="async"
      />
    )
  }
  return <PixelSprite name={spriteForGame(juego.id)} size={size} />
}

// ---------- Formulario de juego (crear/editar ficha + sistema de puntuación) ----------
function JuegoForm({ juego, catalogo, juegos, onGuardar, onCancelar, onError }) {
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

// ---------- Formulario de usuario ----------
function UsuarioForm({ usuario, onGuardar, onCancelar, onError }) {
  const editando = !!usuario && usuario !== 'nuevo'
  const [nombre, setNombre] = useState(usuario?.nombre || '')

  function submit(e) {
    e.preventDefault()
    if (!nombre.trim()) { onError('El nombre es obligatorio'); return }
    onGuardar({ nombre: nombre.trim() }, editando ? usuario.id : null)
  }

  return (
    <form className="form" onSubmit={submit}>
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del jugador..." maxLength={40} autoFocus />
      <button type="submit">{editando ? 'GUARDAR' : 'CREAR'}</button>
      {editando && <button type="button" className="borrar" onClick={onCancelar}>CANCELAR</button>}
    </form>
  )
}

// ---------- Formulario de parámetro (catálogo) ----------
function ParametroForm({ parametro, onGuardar, onCancelar, onError }) {
  const editando = !!parametro && parametro !== 'nuevo'
  const [nombre, setNombre] = useState(parametro?.nombre || '')
  const [tipo, setTipo] = useState(parametro?.tipo || 'numero')

  function submit(e) {
    e.preventDefault()
    if (!nombre.trim()) { onError('El nombre es obligatorio'); return }
    onGuardar({ nombre: nombre.trim(), tipo }, editando ? parametro.id : null)
  }

  return (
    <form className="form form-parametro" onSubmit={submit}>
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Puntos, Fase, Personaje, Tiempo..." maxLength={40} autoFocus />
      <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
        <option value="numero">Número</option>
        <option value="tiempo">Tiempo</option>
        <option value="texto">Texto</option>
      </select>
      <button type="submit">{editando ? 'GUARDAR' : 'CREAR'}</button>
      {editando && <button type="button" className="borrar" onClick={onCancelar}>CANCELAR</button>}
    </form>
  )
}

// Entrada de tiempo por partes (minutos/segundos/milésimas) para forzar
// siempre el mismo formato "M:SS.mmm" en vez de un texto libre propenso a errores.
function soloDigitos(v) { return v.replace(/[^0-9]/g, '') }
// El usuario escribe con coma decimal (formato español); internamente se guarda con
// punto porque así lo espera el backend (is_numeric de PHP requiere punto).
function soloNumeroComa(v) {
  let limpio = v.replace(/[^0-9,]/g, '')
  const partes = limpio.split(',')
  if (partes.length > 2) limpio = partes[0] + ',' + partes.slice(1).join('')
  return limpio
}

function TiempoInput({ value, onChange }) {
  function parse(v) {
    const m = /^(\d+):(\d{1,2})(?:\.(\d{1,3}))?$/.exec(v || '')
    if (!m) return { min: '', seg: '', ms: '' }
    return { min: m[1], seg: m[2], ms: m[3] || '' }
  }
  // Estado local en crudo (sin rellenar con ceros) para no bloquear la escritura
  // del segundo dígito justo después de teclear el primero.
  const [local, setLocal] = useState(() => parse(value))
  const ultimoEmitido = useRef(value)

  useEffect(() => {
    if (value !== ultimoEmitido.current) {
      setLocal(parse(value))
      ultimoEmitido.current = value
    }
  }, [value])

  function actualizar(campo, crudo) {
    let v = soloDigitos(crudo)
    if (campo === 'min') v = v.slice(0, 3)
    if (campo === 'seg') { v = v.slice(0, 2); if (v !== '' && Number(v) > 59) v = '59' }
    if (campo === 'ms') { v = v.slice(0, 3); if (v !== '' && Number(v) > 999) v = '999' }
    const next = { ...local, [campo]: v }
    setLocal(next)
    if (next.min === '' && next.seg === '' && next.ms === '') { ultimoEmitido.current = ''; onChange(''); return }
    const m = next.min === '' ? '0' : String(Number(next.min))
    const s = String(next.seg === '' ? 0 : Number(next.seg)).padStart(2, '0')
    const mm = String(next.ms === '' ? 0 : Number(next.ms)).padStart(3, '0')
    const salida = `${m}:${s}.${mm}`
    ultimoEmitido.current = salida
    onChange(salida)
  }

  const { min, seg, ms } = local

  return (
    <div className="tiempo-input">
      <div className="tiempo-campo">
        <input type="text" inputMode="numeric" maxLength={3} placeholder="MM" value={min} onChange={(e) => actualizar('min', e.target.value)} />
        <span className="tiempo-leyenda">minutos</span>
      </div>
      <span className="tiempo-sep">:</span>
      <div className="tiempo-campo">
        <input type="text" inputMode="numeric" maxLength={2} placeholder="SS" value={seg} onChange={(e) => actualizar('seg', e.target.value)} />
        <span className="tiempo-leyenda">segundos</span>
      </div>
      <span className="tiempo-sep">.</span>
      <div className="tiempo-campo">
        <input type="text" inputMode="numeric" maxLength={3} placeholder="mmm" value={ms} onChange={(e) => actualizar('ms', e.target.value)} />
        <span className="tiempo-leyenda">milisegundos</span>
      </div>
    </div>
  )
}

// ---------- Formulario de puntuación (nueva o edición) ----------
function ScoreForm({ juego, usuarios, score, onGuardar, onCancelar, onError }) {
  const editando = !!score
  const [usuarioId, setUsuarioId] = useState(score?.usuario_id || '')
  const [fecha, setFecha] = useState(score?.fecha || hoyISO())
  const [valores, setValores] = useState(() => {
    const init = {}
    if (score) score.valores.forEach((v) => { init[v.parametro_id] = v.valor_texto })
    return init
  })

  function setValor(pid, v) { setValores({ ...valores, [pid]: v }) }

  function submit(e) {
    e.preventDefault()
    if (!usuarioId) { onError('Elige un jugador'); return }
    onGuardar({ usuario_id: Number(usuarioId), fecha, valores }, editando ? score.id : null)
  }

  return (
    <form className="form-score-completo" onSubmit={submit}>
      <div className="fila-jugador-fecha">
        <div className="campo">
          <span>JUGADOR</span>
          {editando ? (
            <div className="valor-fijo">{score.usuario}</div>
          ) : (
            <SelectorUsuario usuarios={usuarios} sel={usuarioId} onSel={setUsuarioId} />
          )}
        </div>
        <div className="campo">
          <span>FECHA</span>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
      </div>
      <div className="campos-parametros">
        {juego.parametros.map((p) => (
          <div className="campo" key={p.parametro_id}>
            <span>{p.nombre.toUpperCase()}</span>
            {p.tipo === 'numero' && (
              <input
                type="text"
                inputMode="decimal"
                value={(valores[p.parametro_id] ?? '').replace('.', ',')}
                onChange={(e) => setValor(p.parametro_id, soloNumeroComa(e.target.value).replace(',', '.'))}
                placeholder="(opcional)"
              />
            )}
            {p.tipo === 'tiempo' && (
              <TiempoInput
                value={valores[p.parametro_id] ?? ''}
                onChange={(v) => setValor(p.parametro_id, v)}
              />
            )}
            {p.tipo === 'texto' && (
              <input
                type="text"
                value={valores[p.parametro_id] ?? ''}
                onChange={(e) => setValor(p.parametro_id, e.target.value)}
                placeholder="(opcional)"
                maxLength={60}
              />
            )}
          </div>
        ))}
      </div>
      <div className="acciones-form">
        <button type="submit">{editando ? 'GUARDAR CAMBIOS' : 'GUARDAR'}</button>
        {editando && <button type="button" className="btn-secundario" onClick={onCancelar}>CANCELAR EDICIÓN</button>}
      </div>
    </form>
  )
}

// Tabla de récords (ranking) de un juego, reutilizada tanto por la
// clasificación general como por la clasificación de cada torneo.
// Clasificación general de un supertorneo sumando los puntos acumulados por cada jugador en cada juego.
function calcularClasificacionGeneralSuper(torneo, todasLasScores, todosLosJuegos) {
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

function SuperGeneralTable({ generalStandings }) {
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

function RankingTable({ juego, scores, cargando = false, filtro = '', setFiltro, onEditar, onEliminar, esAdmin = false }) {
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

function BannerPlaceholder() {
  return (
    <div className="placeholder placeholder-banner">
      <img src={retroalBanner} alt="Retroal" className="placeholder-banner-img" />
    </div>
  )
}

// Desplegable para elegir un torneo existente (usado en PUNTUACIONES y NUEVO RÉCORD).
// Muestra el logo del torneo: en mensuales el del juego, en supertorneos su
// imagen (o el sprite aleatorio si no tiene).
function SelectorTorneo({ torneos, sel, onSel, label }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const triggerRef = useRef(null)

  const esSoloMensual = torneos.length > 0 && torneos.every((t) => t.tipo === 'mensual')
  const esSoloSuper = torneos.length > 0 && torneos.every((t) => t.tipo === 'super')

  const labelText = label || (esSoloMensual ? 'RETO:' : esSoloSuper ? 'SUPERTORNEO:' : 'RETO / TORNEO:')
  const placeholderText = esSoloMensual ? '-- elige reto --' : esSoloSuper ? '-- elige supertorneo --' : '-- elige reto / torneo --'
  const searchPlaceholder = esSoloMensual ? '🔍 Buscar reto...' : esSoloSuper ? '🔍 Buscar supertorneo...' : '🔍 Buscar reto / torneo...'

  const q = normalizarTexto(query)
  const filtrados = q
    ? torneos.filter((t) => normalizarTexto(t.nombre).includes(q))
    : torneos

  const cerrar = () => { setOpen(false); setQuery('') }
  const logoJuego = (t) =>
    t.tipo === 'super'
      ? { id: t.id, logo: t.logo }
      : (t.juegos[0] ? { id: t.juegos[0].id, logo: t.juegos[0].logo } : { id: t.id, logo: null })
  const meta = (t) =>
    t.tipo === 'mensual'
      ? (t.juegos[0]?.nombre || 'sin juego')
      : `${t.juegos.length} juego${t.juegos.length === 1 ? '' : 's'}`

  function actualizarPos() {
    const r = triggerRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 6, left: r.left, width: r.width })
  }

  function abrir() {
    actualizarPos()
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', actualizarPos, true)
    window.addEventListener('resize', actualizarPos)
    return () => {
      window.removeEventListener('scroll', actualizarPos, true)
      window.removeEventListener('resize', actualizarPos)
    }
  }, [open])

  return (
    <div className="selector campo-selector-torneo">
      <label className="selector-lbl">{labelText}</label>
      <div className="combo">
        <button
          ref={triggerRef}
          type="button"
          className="combo-trigger"
          onClick={() => (open ? cerrar() : abrir())}
        >
          <span className={sel ? 'combo-valor' : 'combo-valor combo-valor-vacio'}>
            {sel ? sel.nombre : placeholderText}
          </span>
          {sel && <LogoThumb juego={logoJuego(sel)} size={3} />}
          <span className="combo-caret" aria-hidden="true">▾</span>
        </button>

        {open && pos && (
          <div className="combo-panel combo-panel-flotante" style={{ top: pos.top, left: pos.left, width: pos.width }}>
            <input
              className="combo-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              autoComplete="off"
            />
            <ul className="combo-list">
              {filtrados.length === 0 && <li className="combo-vacio">Sin coincidencias</li>}
              {filtrados.map((t) => (
                <li
                  key={t.id}
                  className={sel && sel.id === t.id ? 'sel' : ''}
                  onClick={() => { onSel(t); cerrar() }}
                >
                  <span className="combo-nombre">{t.nombre} <span className="combo-meta">· {meta(t)}</span></span>
                  <LogoThumb juego={logoJuego(t)} size={3} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {open && <div className="combo-overlay" onClick={cerrar} />}
      </div>
    </div>
  )
}

// ---------- Formulario de torneo ----------
// Mensual: título automático (mes+año), 0 o 1 juego (se puede añadir después).
// Super: título libre, 0+ juegos (se pueden ir añadiendo con el tiempo).
function TorneoForm({ torneo, juegos, onGuardar, onCancelar, onError, onConfirmar }) {
  const editando = !!torneo && torneo !== 'nuevo'
  const hoy = new Date()
  const [tipo, setTipo] = useState(editando ? torneo.tipo : 'mensual')
  const [nombre, setNombre] = useState(editando && torneo.tipo === 'super' ? torneo.nombre : '')
  const [mes, setMes] = useState((editando && torneo.mes) || hoy.getMonth() + 1)
  const [anio, setAnio] = useState((editando && torneo.anio) || hoy.getFullYear())
  const [juegoUnico, setJuegoUnico] = useState(() =>
    editando && torneo.tipo === 'mensual' ? juegos.find((j) => j.id === torneo.juegos[0]?.id) || null : null
  )
  const [juegosSel, setJuegosSel] = useState(() =>
    editando && torneo.tipo === 'super' ? (torneo.juegos || []).map((j) => j.id) : []
  )
  const [logoData, setLogoData] = useState(null)
  const [logoPreview, setLogoPreview] = useState(editando && torneo.tipo === 'super' ? (torneo.logo || null) : null)
  const [logoBorrar, setLogoBorrar] = useState(false)

  async function procesarLogoTorneoFile(f) {
    if (!f) return
    try {
      const url = await fileToDataUrl(f)
      setLogoData(url); setLogoPreview(url); setLogoBorrar(false)
    } catch (err) { onError(err?.message || 'Error al leer la imagen') }
  }

  async function onLogoTorneoChange(e) { procesarLogoTorneoFile(e.target.files[0]) }
  function quitarLogoTorneo() { setLogoData(null); setLogoPreview(null); setLogoBorrar(true) }

  // Récords ya guardados por juego en este torneo: si tiene, no se puede quitar/cambiar.
  const scoresPorJuego = editando ? Object.fromEntries((torneo.juegos || []).map((j) => [j.id, j.total_scores || 0])) : {}
  function juegoTieneRecords(id) { return (scoresPorJuego[id] || 0) > 0 }

  function agregarJuego(j) { setJuegosSel([...juegosSel, j.id]) }

  function quitarJuego(j) {
    if (juegoTieneRecords(j.id)) {
      onError(`No se puede quitar "${j.nombre}": ya tiene récords en este ${tipo === 'super' ? 'supertorneo' : 'reto'}`)
      return
    }
    setJuegosSel(juegosSel.filter((x) => x !== j.id))
  }

  function quitarJuegoUnico() {
    if (juegoUnico && juegoTieneRecords(juegoUnico.id)) {
      onError(`No se puede quitar "${juegoUnico.nombre}": ya tiene récords en este reto`)
      return
    }
    setJuegoUnico(null)
  }

  function seleccionarJuegoUnico(nuevo) {
    if (juegoUnico && nuevo.id !== juegoUnico.id && juegoTieneRecords(juegoUnico.id)) {
      onError(`No se puede cambiar "${juegoUnico.nombre}": ya tiene récords en este reto`)
      return
    }
    setJuegoUnico(nuevo)
  }

  const disponibles = juegos.filter((j) => !juegosSel.includes(j.id))
  const elegidos = juegosSel.map((id) => juegos.find((j) => j.id === id)).filter(Boolean)

  function submit(e) {
    e.preventDefault()
    if (tipo === 'mensual') {
      onGuardar({ tipo, mes: Number(mes), anio: Number(anio), juegos: juegoUnico ? [juegoUnico.id] : [] }, editando ? torneo.id : null)
    } else {
      if (!nombre.trim()) { onError('El nombre del supertorneo es obligatorio'); return }
      const payload = { tipo, nombre: nombre.trim(), juegos: juegosSel }
      if (logoData) payload.logo = logoData
      if (logoBorrar) payload.logo_borrar = true
      onGuardar(payload, editando ? torneo.id : null)
    }
  }

  return (
    <form className="form form-torneo" onSubmit={submit}>
      {!editando ? (
        <div className="tipo-torneo-selector">
          <label>
            <input type="radio" name="tipo-torneo" checked={tipo === 'mensual'} onChange={() => setTipo('mensual')} />
            RETO MENSUAL
          </label>
          <label>
            <input type="radio" name="tipo-torneo" checked={tipo === 'super'} onChange={() => setTipo('super')} />
            SUPERTORNEO
          </label>
        </div>
      ) : (
        <p className="form-ayuda">
          Editando {tipo === 'mensual' ? 'reto mensual' : 'supertorneo'} (el tipo no se puede cambiar).
        </p>
      )}

      {tipo === 'mensual' ? (
        <>
          <select value={mes} onChange={(e) => setMes(e.target.value)}>
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="select-anio" value={anio} onChange={(e) => setAnio(e.target.value)}>
            {AÑOS_TORNEO.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          {juegoUnico && juegoTieneRecords(juegoUnico.id) ? (
            <div className="juego-bloqueado">
              <LogoThumb juego={juegoUnico} size={3} />
              <span className="param-row-nombre">{juegoUnico.nombre}</span>
              <span className="lock-nota">🔒 Ya tiene récords: no se puede cambiar</span>
            </div>
          ) : (
            <>
              <SelectorJuego juegos={juegos} sel={juegoUnico} onSel={seleccionarJuegoUnico} />
              {juegoUnico && (
                <button type="button" className="borrar sm" onClick={quitarJuegoUnico}>✕ QUITAR JUEGO</button>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <input className="input-nombre-torneo" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del supertorneo..." maxLength={60} autoFocus />
          <div className="img-upload img-upload-torneo">
            <span className="img-upload-lbl">IMAGEN (opcional)</span>
            <DropZone accept="image/*" onFileSelect={procesarLogoTorneoFile}>
              <div className="img-preview">
                {logoPreview ? <img src={logoPreview} alt="Imagen del supertorneo" /> : <span className="img-vacio">Sin imagen (se usará un sprite)<br/><small style={{ fontSize: '9px', opacity: 0.7 }}>(Arrastra imagen)</small></span>}
              </div>
            </DropZone>
            <div className="img-upload-acciones">
              <label className="btn-file">
                SUBIR
                <input type="file" accept="image/*" onChange={onLogoTorneoChange} hidden />
              </label>
              {logoPreview && <button type="button" className="btn-secundario" onClick={quitarLogoTorneo}>QUITAR</button>}
            </div>
          </div>
          <p className="form-ayuda">
            Elige los juegos que forman parte de este supertorneo. Cada uno tendrá su propia clasificación
            independiente; puedes añadir más juegos en cualquier momento editando el torneo.
          </p>
          {elegidos.length > 0 && (
            <ul className="param-lista">
              {elegidos.map((j) => (
                <li key={j.id} className="param-row">
                  <LogoThumb juego={j} size={3} />
                  <span className="param-row-nombre">{j.nombre}</span>
                  {juegoTieneRecords(j.id) ? (
                    <button type="button" className="borrar sm bloqueado" disabled data-tooltip="No se puede quitar: ya tiene récords en este torneo">🔒</button>
                  ) : (
                    <button type="button" className="borrar sm" onClick={() => quitarJuego(j)} data-tooltip="Quitar juego">✕</button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {disponibles.length > 0 && (
            <SelectorJuegoMultiAdd juegos={disponibles} onAdd={agregarJuego} placeholder="+ Añadir juego..." />
          )}
        </>
      )}

      <button type="submit">{editando ? 'GUARDAR' : 'CREAR'}</button>
      <button type="button" className="borrar" onClick={onCancelar}>CANCELAR</button>
    </form>
  )
}

export default function App() {
  const [juegos, setJuegos] = useState([])
  const [marqueeJuegos, setMarqueeJuegos] = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [parametros, setParametros] = useState([])
  const [sel, setSel] = useState(null) // juego seleccionado
  const [scores, setScores] = useState([])
  const [scoresCargando, setScoresCargando] = useState(false)
  const [errorPopup, setErrorPopup] = useState(null)
  const [ok, setOk] = useState(null)
  const [tab, setTab] = useState('ver') // 'ver' | 'meter' | 'juegos' | 'usuarios' | 'parametros'

  const [activeTooltip, setActiveTooltip] = useState(null)

  useEffect(() => {
    const handleShow = (e) => {
      const el = e.target.closest('[data-tooltip], [title]')
      if (!el) return

      const text = el.getAttribute('data-tooltip') || el.getAttribute('title')
      if (!text) return

      if (el.hasAttribute('title')) {
        el.setAttribute('data-tooltip', text)
        el.removeAttribute('title')
      }

      const rect = el.getBoundingClientRect()
      const preferredPos = el.getAttribute('data-tooltip-pos') || 'top'

      let top = rect.top - 8
      let left = rect.left + rect.width / 2
      let transform = 'translate(-50%, -100%)'

      if (preferredPos === 'left') {
        if (rect.left < 180) {
          top = rect.top - 8
          left = rect.left + rect.width / 2
          transform = 'translate(-50%, -100%)'
        } else {
          left = rect.left - 8
          top = rect.top + rect.height / 2
          transform = 'translate(-100%, -50%)'
        }
      } else if (preferredPos === 'right') {
        if (window.innerWidth - rect.right < 180) {
          top = rect.top - 8
          left = rect.left + rect.width / 2
          transform = 'translate(-50%, -100%)'
        } else {
          left = rect.right + 8
          top = rect.top + rect.height / 2
          transform = 'translate(0, -50%)'
        }
      } else if (preferredPos === 'bottom') {
        top = rect.bottom + 8
        left = rect.left + rect.width / 2
        transform = 'translate(-50%, 0)'
      }

      if (top < 40 && transform.includes('-100%')) {
        top = rect.bottom + 8
        transform = transform.replace('-100%', '0')
      }

      if (transform.includes('-50%')) {
        if (left < 120) {
          left = Math.max(10, rect.left)
          transform = transform.replace('-50%', '0')
        } else if (left > window.innerWidth - 120) {
          left = Math.min(window.innerWidth - 10, rect.right)
          transform = transform.replace('-50%', '-100%')
        }
      }

      setActiveTooltip({
        text,
        style: {
          position: 'fixed',
          top: `${top}px`,
          left: `${left}px`,
          transform,
        }
      })
    }

    const handleHide = (e) => {
      if (e && e.type === 'scroll') {
        setActiveTooltip(null)
        return
      }
      if (e && e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('[data-tooltip]')) {
        return
      }
      setActiveTooltip(null)
    }

    document.addEventListener('mouseover', handleShow, true)
    document.addEventListener('focusin', handleShow, true)
    document.addEventListener('mouseout', handleHide, true)
    document.addEventListener('focusout', handleHide, true)
    window.addEventListener('scroll', handleHide, true)

    return () => {
      document.removeEventListener('mouseover', handleShow, true)
      document.removeEventListener('focusin', handleShow, true)
      document.removeEventListener('mouseout', handleHide, true)
      document.removeEventListener('focusout', handleHide, true)
      window.removeEventListener('scroll', handleHide, true)
    }
  }, [])

  function avisarOk(msg) {
    setOk(msg)
    setTimeout(() => setOk((actual) => (actual === msg ? null : actual)), 2500)
  }

  function avisarError(msg) {
    setErrorPopup(msg)
    setTimeout(() => setErrorPopup((actual) => (actual === msg ? null : actual)), 4000)
  }

  const [filtro, setFiltro] = useState('')
  const [filtroJugador, setFiltroJugador] = useState('')
  const [filtroUser, setFiltroUser] = useState('')
  const [confirmar, setConfirmar] = useState(null) // { titulo, mensaje, accion }

  const [formJuego, setFormJuego] = useState(null) // null | 'nuevo' | juego
  const [formUsuario, setFormUsuario] = useState(null)
  const [formParametro, setFormParametro] = useState(null)
  const [scoreEditando, setScoreEditando] = useState(null)
  // Se incrementan tras cada guardado con éxito; al usarse como "key" del
  // formulario correspondiente, fuerzan a React a recrearlo desde cero y así
  // vaciar los campos en vez de conservar lo escrito anteriormente.
  const [usuarioFormKey, setUsuarioFormKey] = useState(0)
  const [parametroFormKey, setParametroFormKey] = useState(0)
  const [scoreFormKey, setScoreFormKey] = useState(0)

  // ---- Torneos ----
  const [torneos, setTorneos] = useState([])
  const [formTorneo, setFormTorneo] = useState(null) // null | 'nuevo' | torneo
  const [torneoFormKey, setTorneoFormKey] = useState(0)
  const [verSubTab, setVerSubTab] = useState('clasificacion') // subpestaña dentro de PUNTUACIONES: 'clasificacion' | 'general' | 'torneos'
  const [gestionSubTab, setGestionSubTab] = useState('torneos') // subpestaña dentro de TORNEOS (gestión): 'torneos' | 'supertorneos'
  const [meterSubTab, setMeterSubTab] = useState('general') // subpestaña dentro de NUEVO RÉCORD: 'general' | 'torneos'
  const [selTorneo, setSelTorneo] = useState(null)
  const [selTorneoJuegoId, setSelTorneoJuegoId] = useState(null) // qué juego del torneo se está viendo/puntuando (relevante en supertorneos con varios juegos)
  const [torneoScores, setTorneoScores] = useState([])
  const [torneoScoresCargando, setTorneoScoresCargando] = useState(false)
  const [torneoTodasScores, setTorneoTodasScores] = useState([])
  const [filtroTorneoUser, setFiltroTorneoUser] = useState('')
  const [torneoScoreEditando, setTorneoScoreEditando] = useState(null)
  const [torneoScoreFormKey, setTorneoScoreFormKey] = useState(0)

  // ---- Clasificación general (agrega el top10 de cada juego con puntuaciones "torneito") ----
  const [clasificacion, setClasificacion] = useState(null) // { jugadores: [{nombre, puntos}], filasJuegos: [{juego, posiciones}] }
  const [clasificacionCargando, setClasificacionCargando] = useState(false)
  const PUNTOS_POSICION = [1000, 900, 800, 700, 600, 500, 400, 300, 200, 100]
  const dragScroll = useDragScroll()
  const [filtroClasifJugador, setFiltroClasifJugador] = useState('')
  const [filtroClasifJuego, setFiltroClasifJuego] = useState('')
  const [jugadorDetalle, setJugadorDetalle] = useState(null)
  const [filtroJugadorDetalleJuego, setFiltroJugadorDetalleJuego] = useState('')
  const [jugadorDetalleTab, setJugadorDetalleTab] = useState('clasificacion') // 'clasificacion' | 'torneos' | 'supertorneos'
  const [torneosJugador, setTorneosJugador] = useState(null)
  const [supertorneosJugador, setSupertorneosJugador] = useState(null)
  const [torneosJugadorCargando, setTorneosJugadorCargando] = useState(false)
  const [filtroJugadorDetalleTorneo, setFiltroJugadorDetalleTorneo] = useState('')
  const [filtroJugadorDetalleSuper, setFiltroJugadorDetalleSuper] = useState('')
  const [anchoDetalleJugador, setAnchoDetalleJugador] = useState(0)
  const refDetalleJugador = useRef(null)

  // ---- Panteón de los Campeones ----
  const [panteonTorneoId, setPanteonTorneoId] = useState('')
  const [panteonPreview, setPanteonPreview] = useState(null)
  const [formPanteonModal, setFormPanteonModal] = useState(false)

  // ---- Normas de los Torneos y Torneito Retroal ----
  const [normasRetosHtml, setNormasRetosHtml] = useState('')
  const [normasGeneralHtml, setNormasGeneralHtml] = useState('')
  const [normasSupertorneoHtml, setNormasSupertorneoHtml] = useState('')
  const [normasTorneoSel, setNormasTorneoSel] = useState(null)
  const [normasTipo, setNormasTipo] = useState('retos') // 'retos' | 'general' | 'supertorneos'
  const [modalNormas, setModalNormas] = useState(false)
  const [normasEditando, setNormasEditando] = useState(false)
  const editorWysiwygRef = useRef(null)
  const colorInputRef = useRef(null)

  // ---- Popup para Añadir Récord en Torneito Retroal ----
  const [modalNuevoRecordGen, setModalNuevoRecordGen] = useState(false)
  const [modalNuevoRecordSuper, setModalNuevoRecordSuper] = useState(false)

  // ---- Autenticación / Administración ----
  const [auth, setAuth] = useState(() => {
    try {
      const saved = localStorage.getItem('retroal_auth')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.expira_en && Date.now() < parsed.expira_en) {
          return parsed
        }
      }
    } catch {}
    return null
  })
  const esAdmin = !!(auth && auth.expira_en && Date.now() < auth.expira_en)

  const [formLoginModal, setFormLoginModal] = useState(false)
  const [loginUser, setLoginUser] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [loginError, setLoginError] = useState(null)

  // Extender la sesión a 1 hora desde el momento de uso si hay actividad
  const renovarSesion = useCallback(() => {
    setAuth((actual) => {
      if (!actual || !actual.expira_en) return actual
      const ahora = Date.now()
      // Renovar si han pasado al menos 30 segundos desde la última renovación
      if (actual.expira_en - ahora > 3570000) return actual
      const actualNuevo = { ...actual, expira_en: ahora + 3600000 }
      try {
        localStorage.setItem('retroal_auth', JSON.stringify(actualNuevo))
      } catch {}
      return actualNuevo
    })
  }, [])

  // Renovar sesión automáticamente al detectar cualquier interacción del usuario
  useEffect(() => {
    if (!auth) return
    const manejarActividad = () => renovarSesion()
    const eventos = ['click', 'keydown', 'scroll', 'mousemove', 'touchstart']
    eventos.forEach((evt) => window.addEventListener(evt, manejarActividad, { passive: true }))
    return () => {
      eventos.forEach((evt) => window.removeEventListener(evt, manejarActividad))
    }
  }, [auth, renovarSesion])

  // Auto-expiración de sesión tras 1 hora de inactividad continuada
  useEffect(() => {
    if (!auth) return
    const interval = setInterval(() => {
      if (Date.now() >= auth.expira_en) {
        setAuth(null)
        localStorage.removeItem('retroal_auth')
        avisarError('La sesión ha expirado por inactividad (1 hora). Inicia sesión de nuevo.')
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [auth])

  // Redirigir fuera de "meter" si no se es admin
  useEffect(() => {
    if (tab === 'meter' && !esAdmin) {
      setTab('ver')
    }
  }, [tab, esAdmin])

  async function handleLogin(e) {
    e.preventDefault()
    if (!loginUser.trim() || !loginPass.trim()) {
      setLoginError('Introduce usuario y contraseña')
      return
    }
    setGuardando(true)
    setGuardandoTexto('INICIANDO SESIÓN...')
    setLoginError(null)
    try {
      const { ok, data } = await apiCall(API_AUTH, 'POST', {
        usuario: loginUser.trim(),
        password: loginPass.trim(),
      })
      if (ok && data && data.ok) {
        setAuth(data)
        localStorage.setItem('retroal_auth', JSON.stringify(data))
        setFormLoginModal(false)
        setLoginUser('')
        setLoginPass('')
        avisarOk('¡Sesión iniciada como Admin! 🔓')
      } else {
        setLoginError(data?.error || 'Usuario o contraseña incorrectos')
      }
    } finally {
      setGuardando(false)
    }
  }

  function handleLogout() {
    setAuth(null)
    localStorage.removeItem('retroal_auth')
    if (tab === 'meter') setTab('ver')
    avisarOk('Sesión cerrada 🔒')
  }

  // ---- Cargas y Guardados (Spinner / Overlay) ----
  const [guardando, setGuardando] = useState(false)
  const [guardandoTexto, setGuardandoTexto] = useState('GUARDANDO...')

  async function guardarPanteon(e) {
    e.preventDefault()
    if (!panteonTorneoId) { avisarError('Selecciona un reto mensual'); return }
    const torneoActual = torneos.find((t) => t.id === panteonTorneoId)
    if (torneoActual?.imagen_campeon) {
      avisarError('Este torneo ya tiene una imagen asignada. Elimínala primero si deseas cambiarla.')
      return
    }
    if (!panteonPreview) { avisarError('Selecciona una imagen'); return }

    setGuardando(true)
    setGuardandoTexto('GUARDANDO FOTO DEL CAMPEÓN...')
    try {
      const { ok, data } = await apiCall(`${API_TORNEOS}?id=${panteonTorneoId}`, 'PUT', {
        imagen_campeon: panteonPreview,
      })
      if (ok) {
        await cargarTorneos()
        setFormPanteonModal(false)
        avisarOk('¡Imagen guardada en el Panteón de los Campeones! 👑')
      } else {
        avisarError(data?.error || 'Error al guardar la imagen')
      }
    } finally {
      setGuardando(false)
    }
  }

  function quitarImagenPanteon(torneoId) {
    if (!esAdmin) return
    const t = torneos.find((x) => x.id === torneoId)
    setConfirmar({
      titulo: 'QUITAR DEL PANTEÓN',
      mensaje: `¿Quitar la imagen del campeón del torneo "${t?.nombre}"?`,
      accion: async () => {
        setGuardando(true)
        setGuardandoTexto('QUITANDO FOTO DEL PANTEÓN...')
        try {
          const { ok, data } = await apiCall(`${API_TORNEOS}?id=${torneoId}`, 'PUT', {
            imagen_campeon_borrar: true,
          })
          if (ok) {
            if (panteonTorneoId === torneoId) setPanteonPreview(null)
            await cargarTorneos()
            avisarOk('Imagen quitada del Panteón ✔')
          } else {
            avisarError(data?.error || 'Error al quitar la imagen')
          }
        } finally {
          setGuardando(false)
        }
      },
    })
  }

  async function cargarTorneosJugador(usuarioId) {
    setTorneosJugadorCargando(true)
    try {
      const res = await fetch(`${API_TORNEOS_JUGADOR}?usuario_id=${usuarioId}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setTorneosJugador(data)
          setSupertorneosJugador([])
        } else {
          setTorneosJugador(Array.isArray(data.mensuales) ? data.mensuales : [])
          setSupertorneosJugador(Array.isArray(data.supertorneos) ? data.supertorneos : [])
        }
      } else {
        setTorneosJugador([])
        setSupertorneosJugador([])
      }
    } catch {
      setTorneosJugador([])
      setSupertorneosJugador([])
    }
    setTorneosJugadorCargando(false)
  }

  function abrirDetalleJugador(nombre) {
    setJugadorDetalle(nombre)
    setFiltroJugadorDetalleJuego('')
    setFiltroJugadorDetalleTorneo('')
    setFiltroJugadorDetalleSuper('')
    setJugadorDetalleTab('clasificacion')
    setTorneosJugador(null)
    setSupertorneosJugador(null)
    setAnchoDetalleJugador(0)
    const usuario = usuarios.find((u) => u.nombre === nombre)
    if (usuario) cargarTorneosJugador(usuario.id)
  }

  // Mide el ancho del contenido tras cada render del popup y se queda con el mayor
  // visto hasta ahora (con un tope), para que el modal no se encoja al cambiar de
  // pestaña ni crezca sin límite con listas largas.
  const ANCHO_MAX_DETALLE_JUGADOR = 960
  useEffect(() => {
    if (!jugadorDetalle || !refDetalleJugador.current) return
    const ancho = Math.min(refDetalleJugador.current.scrollWidth, ANCHO_MAX_DETALLE_JUGADOR)
    if (ancho > anchoDetalleJugador) setAnchoDetalleJugador(ancho)
  })

  async function cargarClasificacion() {
    setClasificacionCargando(true)
    let resultados = []
    try {
      const res = await fetch(API_CLASIFICACION)
      const data = res.ok ? await res.json() : []
      if (Array.isArray(data)) {
        resultados = data
          .map((d) => ({ juego: juegos.find((j) => j.id === d.juego_id), top10: d.top10 }))
          .filter((r) => r.juego)
      }
    } catch {
      resultados = []
    }
    const puntosPorJugador = new Map()
    const filasJuegos = []
    const detallePorJugador = new Map()
    resultados.forEach(({ juego, top10 }) => {
      if (top10.length === 0) return
      const posiciones = top10.map((s, i) => {
        puntosPorJugador.set(s.usuario, (puntosPorJugador.get(s.usuario) || 0) + PUNTOS_POSICION[i])
        if (!detallePorJugador.has(s.usuario)) detallePorJugador.set(s.usuario, [])
        detallePorJugador.get(s.usuario).push({ juego, pos: i + 1, fecha: s.fecha, valores: s.valores })
        return s.usuario
      })
      filasJuegos.push({ juego, posiciones })
    })
    filasJuegos.sort((a, b) => normalizarTexto(a.juego.nombre).localeCompare(normalizarTexto(b.juego.nombre)))
    detallePorJugador.forEach((lista) => {
      lista.sort((a, b) => normalizarTexto(a.juego.nombre).localeCompare(normalizarTexto(b.juego.nombre)))
    })
    const jugadores = Array.from(puntosPorJugador.entries())
      .map(([nombre, puntos]) => ({ nombre, puntos }))
      .filter((j) => j.puntos > 0)
      .sort((a, b) => b.puntos - a.puntos || normalizarTexto(a.nombre).localeCompare(normalizarTexto(b.nombre)))
    setClasificacion({ jugadores, filasJuegos, detallePorJugador })
    setClasificacionCargando(false)
  }

  async function cargarJuegos() {
    try {
      const res = await fetch(`${API_JUEGOS}?_t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('CONNECTION FAILED')
      const data = await res.json()
      if (!Array.isArray(data)) throw new Error(data?.error || 'CONNECTION FAILED')
      setJuegos(data)
      return data
    } catch (e) {
      avisarError(e.message)
      return []
    }
  }

  async function cargarUsuarios() {
    const res = await fetch(API_USUARIOS)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) {
        data.sort((a, b) => normalizarTexto(a.nombre).localeCompare(normalizarTexto(b.nombre)))
        setUsuarios(data)
      }
    }
  }

  async function cargarParametros() {
    const res = await fetch(API_PARAMETROS)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) setParametros(data)
    }
  }

  async function cargarScores(juegoId) {
    if (!juegoId) {
      setScores([])
      setScoresCargando(false)
      return
    }
    setScores([])
    setScoresCargando(true)
    try {
      const res = await fetch(`${API_SCORES}?juego_id=${juegoId}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setScores(data)
      }
    } finally {
      setScoresCargando(false)
    }
  }

  async function cargarTorneos() {
    const res = await fetch(API_TORNEOS)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) { setTorneos(data); return data }
    }
    return []
  }

  async function cargarTorneoScores(torneoId, juegoId) {
    if (!torneoId || !juegoId) {
      setTorneoScores([])
      setTorneoScoresCargando(false)
      return
    }
    setTorneoScores([])
    setTorneoScoresCargando(true)
    try {
      const res = await fetch(`${API_SCORES}?torneo_id=${torneoId}&juego_id=${juegoId}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setTorneoScores(data)
      }
    } finally {
      setTorneoScoresCargando(false)
    }
  }

  async function cargarTorneoTodasScores(torneoId) {
    if (!torneoId) { setTorneoTodasScores([]); return }
    const res = await fetch(`${API_SCORES}?torneo_id=${torneoId}`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) setTorneoTodasScores(data)
    }
  }

  async function cargarNormas() {
    try {
      const res = await fetch(API_NORMAS)
      if (res.ok) {
        const data = await res.json()
        setNormasRetosHtml(data?.retos || data?.normas || '')
        setNormasGeneralHtml(data?.general || '')
      }
    } catch {}
  }

  async function guardarNormas() {
    const htmlToSave = editorWysiwygRef.current
      ? editorWysiwygRef.current.innerHTML
      : (
        normasTipo === 'general'
          ? normasGeneralHtml
          : normasTipo === 'supertorneos'
          ? normasSupertorneoHtml
          : normasRetosHtml
      )

    setGuardando(true)
    setGuardandoTexto('GUARDANDO NORMAS...')
    try {
      const bodyPayload = normasTipo === 'supertorneos'
        ? { tipo: 'supertorneos', torneo_id: normasTorneoSel?.id, normas: htmlToSave }
        : { tipo: normasTipo, normas: htmlToSave }

      const { ok, data } = await apiCall(API_NORMAS, 'PUT', bodyPayload)
      if (ok) {
        if (normasTipo === 'general') {
          setNormasGeneralHtml(htmlToSave)
        } else if (normasTipo === 'supertorneos') {
          setNormasSupertorneoHtml(htmlToSave)
          if (normasTorneoSel) {
            normasTorneoSel.normas = htmlToSave
          }
          await cargarTorneos()
        } else {
          setNormasRetosHtml(htmlToSave)
        }
        setNormasEditando(false)
        avisarOk('Normas actualizadas con éxito ✔')
      } else {
        avisarError(data?.error || 'Error al guardar las normas')
      }
    } finally {
      setGuardando(false)
    }
  }

  function abrirNormas(tipo = 'retos', torneo = null) {
    setNormasTipo(tipo)
    setNormasTorneoSel(torneo)
    if (tipo === 'supertorneos' && torneo) {
      const normasTexto = torneo.normas || ''
      setNormasSupertorneoHtml(normasTexto)
      // Si el supertorneo no tiene normas y el usuario es admin, entra directo en modo edición
      setNormasEditando(!normasTexto && esAdmin)
    } else {
      setNormasEditando(false)
    }
    setModalNormas(true)
  }

  function eliminarNormasSupertorneo() {
    if (!normasTorneoSel) return
    setConfirmar({
      titulo: 'ELIMINAR NORMAS',
      mensaje: `¿Seguro que deseas eliminar las normas de "${normasTorneoSel.nombre}"? Los usuarios normales ya no verán el botón de normas.`,
      accion: async () => {
        setGuardando(true)
        setGuardandoTexto('ELIMINANDO NORMAS...')
        try {
          const { ok, data } = await apiCall(API_NORMAS, 'PUT', {
            tipo: 'supertorneos',
            torneo_id: normasTorneoSel.id,
            normas: ''
          })
          if (ok) {
            setNormasSupertorneoHtml('')
            normasTorneoSel.normas = ''
            await cargarTorneos()
            setNormasEditando(false)
            setModalNormas(false)
            avisarOk('Normas del supertorneo eliminadas ✔')
          } else {
            avisarError(data?.error || 'Error al eliminar las normas')
          }
        } finally {
          setGuardando(false)
        }
      },
    })
  }

  function execCmd(command, value = null) {
    if (editorWysiwygRef.current) {
      editorWysiwygRef.current.focus()
    }
    document.execCommand(command, false, value)
  }

  function insertarTablaNormas() {
    const tableHtml = `
      <table border="1" style="width:100%; border-collapse:collapse; margin:10px 0; border:1px solid #cbd5e1;">
        <thead>
          <tr style="background:#002266; color:#ffffff;">
            <th style="padding:6px; border:1px solid #cbd5e1;">Encabezado 1</th>
            <th style="padding:6px; border:1px solid #cbd5e1;">Encabezado 2</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:6px; border:1px solid #cbd5e1;">Dato 1</td>
            <td style="padding:6px; border:1px solid #cbd5e1;">Dato 2</td>
          </tr>
        </tbody>
      </table>
      <p><br/></p>
    `
    execCmd('insertHTML', tableHtml)
  }

  function insertarEnlaceNormas() {
    const url = prompt('Introduce la URL del enlace:', 'https://')
    if (url && url.trim()) {
      execCmd('createLink', url.trim())
    }
  }

  useEffect(() => {
    if (normasEditando) {
      const initialHtml =
        normasTipo === 'general'
          ? normasGeneralHtml
          : normasTipo === 'supertorneos'
          ? normasSupertorneoHtml
          : normasRetosHtml
      setTimeout(() => {
        if (editorWysiwygRef.current) {
          editorWysiwygRef.current.innerHTML = initialHtml
        }
      }, 0)
    }
  }, [normasEditando, normasTipo, normasGeneralHtml, normasRetosHtml, normasSupertorneoHtml])

  useEffect(() => { cargarJuegos(); cargarUsuarios(); cargarParametros(); cargarTorneos(); cargarNormas() }, [])

  // Precarga asíncrona en paralelo/segundo plano (requestIdleCallback) de las imágenes
  // de campeón del Panteón y logos de torneos tras renderizar la vista inicial.
  useEffect(() => {
    if (!torneos || torneos.length === 0) return
    const precargarImagenes = () => {
      torneos.forEach((t) => {
        if (t.imagen_campeon) {
          const img = new Image()
          img.decoding = 'async'
          img.src = t.imagen_campeon
        }
        if (t.logo) {
          const img = new Image()
          img.decoding = 'async'
          img.src = t.logo
        }
      })
    }

    if ('requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(precargarImagenes, { timeout: 2000 })
      return () => window.cancelIdleCallback(handle)
    } else {
      const timer = setTimeout(precargarImagenes, 600)
      return () => clearTimeout(timer)
    }
  }, [torneos])
  // Elige 10 juegos al azar para la marquesina una sola vez, al cargar la página.
  useEffect(() => {
    if (marqueeJuegos === null && juegos.length > 0) {
      const barajados = [...juegos].sort(() => Math.random() - 0.5)
      setMarqueeJuegos(barajados.slice(0, 10))
    }
  }, [juegos, marqueeJuegos])
  useEffect(() => { if (sel) { cargarScores(sel.id); setFiltroUser(''); setScoreFormKey((k) => k + 1) } }, [sel?.id])
  // Al cambiar de torneo, se selecciona su primer juego salvo que ya se haya indicado un juego de ese torneo.
  useEffect(() => {
    setSelTorneoJuegoId((prevId) => {
      const pertenece = selTorneo?.juegos?.some((g) => g.id === prevId)
      return pertenece ? prevId : (selTorneo?.juegos?.[0]?.id ?? null)
    })
    setFiltroTorneoUser('')
    setTorneoScoreEditando(null)
    setTorneoScoreFormKey((k) => k + 1)
  }, [selTorneo?.id])
  useEffect(() => {
    if (selTorneo) cargarTorneoTodasScores(selTorneo.id)
    else setTorneoTodasScores([])
  }, [selTorneo?.id])
  useEffect(() => {
    if (selTorneo && selTorneoJuegoId) cargarTorneoScores(selTorneo.id, selTorneoJuegoId)
    else setTorneoScores([])
    setTorneoScoreFormKey((k) => k + 1)
  }, [selTorneo?.id, selTorneoJuegoId])
  // Al cambiar de subpestaña en NUEVO RÉCORD o VER PUNTUACIONES, si el torneo seleccionado no es
  // del tipo que corresponde a la subpestaña activa, se deselecciona para evitar inconsistencias.
  useEffect(() => {
    if (!selTorneo) return
    const subTab = tab === 'meter' ? meterSubTab : tab === 'ver' ? verSubTab : null
    if (subTab === 'torneos' && selTorneo.tipo !== 'mensual') setSelTorneo(null)
    if (subTab === 'supertorneos' && selTorneo.tipo !== 'super') setSelTorneo(null)
  }, [tab, meterSubTab, verSubTab])
  useEffect(() => {
    if (tab === 'ver' && verSubTab === 'clasificacion' && !clasificacion && !clasificacionCargando && juegos.length > 0 && usuarios.length > 0) {
      cargarClasificacion()
    }
  }, [tab, verSubTab, juegos, usuarios, clasificacion, clasificacionCargando])
  useEffect(() => {
    if (tab === 'ver' && verSubTab === 'general' && juegos.length > 0) {
      if (!sel || (sel.total_scores || 0) === 0) {
        const primeroConRecords = juegos.find((j) => (j.total_scores || 0) > 0)
        setSel(primeroConRecords || null)
      }
    }
  }, [tab, verSubTab, juegos, sel])

  async function apiCall(url, method, body) {
    renovarSesion()
    const opts = { method }
    if (body !== undefined) {
      opts.headers = { 'Content-Type': 'application/json' }
      opts.body = JSON.stringify(body)
    }
    const res = await fetch(url, opts)
    let data = null
    try { data = await res.json() } catch { /* respuesta vacía */ }
    // fail() del backend responde con HTTP 200 (el proxy del NAS sustituye
    // cualquier status >=400 por su propia página de error), así que el
    // fallo se detecta por la presencia de "error" en el cuerpo, no por res.ok.
    const ok = res.ok && !(data && typeof data === 'object' && 'error' in data)
    return { ok, data }
  }

  // ---------- Juegos ----------
  async function guardarJuego(payload, idEditar) {
    setGuardando(true)
    setGuardandoTexto(idEditar ? 'GUARDANDO CAMBIOS EN JUEGO...' : 'CREANDO JUEGO...')
    try {
      const url = idEditar ? `${API_JUEGOS}?id=${idEditar}` : API_JUEGOS
      const { ok, data } = await apiCall(url, idEditar ? 'PUT' : 'POST', payload)
      if (ok) {
        const lista = await cargarJuegos()
        if (sel) setSel(lista.find((j) => j.id === sel.id) || null)
        setFormJuego(null)
        avisarOk(idEditar ? 'Juego actualizado ✔' : 'Juego creado ✔')
      } else {
        avisarError(data?.error || 'Error al guardar el juego')
      }
    } finally {
      setGuardando(false)
    }
  }

  function eliminarJuego(j) {
    setConfirmar({
      titulo: 'ELIMINAR JUEGO',
      mensaje: `Se borrará "${j.nombre}" y TODAS sus puntuaciones. Esta acción no se puede deshacer.`,
      accion: async () => {
        setGuardando(true)
        setGuardandoTexto('ELIMINANDO JUEGO...')
        try {
          const { ok } = await apiCall(`${API_JUEGOS}?id=${j.id}`, 'DELETE')
          if (ok) {
            const lista = await cargarJuegos()
            if (sel && sel.id === j.id) { setSel(null); setScores([]) }
            // Borrar un juego borra en cascada sus torneos (y las puntuaciones de estos).
            const listaTorneos = await cargarTorneos()
            if (selTorneo && !listaTorneos.find((t) => t.id === selTorneo.id)) {
              setSelTorneo(null); setTorneoScores([])
            }
            avisarOk('Juego eliminado ✔')
          }
        } finally {
          setGuardando(false)
        }
      },
    })
  }

  // ---------- Usuarios ----------
  async function guardarUsuario(payload, idEditar) {
    setGuardando(true)
    setGuardandoTexto(idEditar ? 'ACTUALIZANDO JUGADOR...' : 'CREANDO JUGADOR...')
    try {
      const url = idEditar ? `${API_USUARIOS}?id=${idEditar}` : API_USUARIOS
      const { ok, data } = await apiCall(url, idEditar ? 'PUT' : 'POST', payload)
      if (ok) {
        await cargarUsuarios()
        setFormUsuario(null)
        setUsuarioFormKey((k) => k + 1)
        avisarOk(idEditar ? 'Jugador actualizado ✔' : 'Jugador creado ✔')
      } else {
        avisarError(data?.error || 'Error al guardar el jugador')
      }
    } finally {
      setGuardando(false)
    }
  }

  function eliminarUsuario(u) {
    setConfirmar({
      titulo: 'ELIMINAR JUGADOR',
      mensaje: `Se borrará a "${u.nombre}" y TODAS sus puntuaciones. Esta acción no se puede deshacer.`,
      accion: async () => {
        setGuardando(true)
        setGuardandoTexto('ELIMINANDO JUGADOR...')
        try {
          const { ok } = await apiCall(`${API_USUARIOS}?id=${u.id}`, 'DELETE')
          if (ok) {
            await cargarUsuarios()
            if (sel) cargarScores(sel.id)
            if (selTorneo) cargarTorneoScores(selTorneo.id)
            avisarOk('Jugador eliminado ✔')
          }
        } finally {
          setGuardando(false)
        }
      },
    })
  }

  // ---------- Parámetros (catálogo) ----------
  async function guardarParametro(payload, idEditar) {
    setGuardando(true)
    setGuardandoTexto(idEditar ? 'ACTUALIZANDO PARÁMETRO...' : 'CREANDO PARÁMETRO...')
    try {
      const url = idEditar ? `${API_PARAMETROS}?id=${idEditar}` : API_PARAMETROS
      const { ok, data } = await apiCall(url, idEditar ? 'PUT' : 'POST', payload)
      if (ok) {
        await cargarParametros()
        setFormParametro(null)
        setParametroFormKey((k) => k + 1)
        avisarOk(idEditar ? 'Parámetro actualizado ✔' : 'Parámetro creado ✔')
      } else {
        avisarError(data?.error || 'Error al guardar el parámetro')
      }
    } finally {
      setGuardando(false)
    }
  }

  function eliminarParametro(p) {
    if (p.total_valores > 0) {
      avisarError('No se puede eliminar: ya tiene datos guardados')
      return
    }
    const usoMsg = p.en_uso > 0 ? ` Se usa en ${p.en_uso} juego(s): se desvinculará de esos juegos.` : ''
    setConfirmar({
      titulo: 'ELIMINAR PARÁMETRO',
      mensaje: `Se borrará "${p.nombre}".${usoMsg} Esta acción no se puede deshacer.`,
      accion: async () => {
        setGuardando(true)
        setGuardandoTexto('ELIMINANDO PARÁMETRO...')
        try {
          const { ok, data } = await apiCall(`${API_PARAMETROS}?id=${p.id}`, 'DELETE')
          if (ok) {
            await cargarParametros()
            await cargarJuegos()
            if (sel) cargarScores(sel.id)
            if (selTorneo) cargarTorneoScores(selTorneo.id)
            avisarOk('Parámetro eliminado ✔')
          } else {
            avisarError(data?.error || 'Error al eliminar el parámetro')
          }
        } finally {
          setGuardando(false)
        }
      },
    })
  }

  // ---------- Torneos y Retos ----------
  async function guardarTorneo(payload, idEditar) {
    const esSuper = payload.tipo === 'super'
    setGuardando(true)
    setGuardandoTexto(idEditar ? (esSuper ? 'ACTUALIZANDO SUPERTORNEO...' : 'ACTUALIZANDO RETO...') : (esSuper ? 'CREANDO SUPERTORNEO...' : 'CREANDO RETO...'))
    try {
      const url = idEditar ? `${API_TORNEOS}?id=${idEditar}` : API_TORNEOS
      const { ok, data } = await apiCall(url, idEditar ? 'PUT' : 'POST', payload)
      if (ok) {
        const lista = await cargarTorneos()
        if (selTorneo) setSelTorneo(lista.find((t) => t.id === selTorneo.id) || null)
        setFormTorneo(null)
        setTorneoFormKey((k) => k + 1)
        avisarOk(idEditar ? (esSuper ? 'Supertorneo actualizado ✔' : 'Reto actualizado ✔') : (esSuper ? 'Supertorneo creado ✔' : 'Reto creado ✔'))
      } else {
        avisarError(data?.error || 'Error al guardar')
      }
    } finally {
      setGuardando(false)
    }
  }

  function eliminarTorneo(t) {
    const esSuper = t.tipo === 'super'
    setConfirmar({
      titulo: esSuper ? 'ELIMINAR SUPERTORNEO' : 'ELIMINAR RETO',
      mensaje: `Se borrará "${t.nombre}" y TODAS sus puntuaciones. Esta acción no se puede deshacer.`,
      accion: async () => {
        setGuardando(true)
        setGuardandoTexto(esSuper ? 'ELIMINANDO SUPERTORNEO...' : 'ELIMINANDO RETO...')
        try {
          const { ok } = await apiCall(`${API_TORNEOS}?id=${t.id}`, 'DELETE')
          if (ok) {
            await cargarTorneos()
            if (selTorneo && selTorneo.id === t.id) { setSelTorneo(null); setTorneoScores([]) }
            avisarOk(esSuper ? 'Supertorneo eliminado ✔' : 'Reto eliminado ✔')
          }
        } finally {
          setGuardando(false)
        }
      },
    })
  }

  async function guardarTorneoScore(payload, idEditar) {
    setGuardando(true)
    setGuardandoTexto(idEditar ? 'ACTUALIZANDO RÉCORD...' : 'GUARDANDO RÉCORD...')
    try {
      const url = idEditar ? `${API_SCORES}?id=${idEditar}` : API_SCORES
      const body = idEditar ? payload : { ...payload, torneo_id: selTorneo.id, juego_id: selTorneoJuegoId }
      const { ok, data } = await apiCall(url, idEditar ? 'PUT' : 'POST', body)
      if (ok) {
        setTorneoScoreEditando(null)
        setTorneoScoreFormKey((k) => k + 1)
        await cargarTorneoScores(selTorneo.id, selTorneoJuegoId)
        await cargarTorneoTodasScores(selTorneo.id)
        cargarTorneos()
        avisarOk(idEditar ? 'Puntuación actualizada ✔' : 'Puntuación guardada ✔')
      } else {
        avisarError(data?.error || 'Error al guardar la puntuación')
      }
    } finally {
      setGuardando(false)
    }
  }

  function eliminarTorneoScore(s) {
    setConfirmar({
      titulo: 'ELIMINAR RÉCORD',
      mensaje: `Se borrará el récord de ${s.usuario} del ${fechaLarga(s.fecha)}. Esta acción no se puede deshacer.`,
      accion: async () => {
        setGuardando(true)
        setGuardandoTexto('ELIMINANDO RÉCORD...')
        try {
          const { ok } = await apiCall(`${API_SCORES}?id=${s.id}`, 'DELETE')
          if (ok) {
            await cargarTorneoScores(selTorneo.id, selTorneoJuegoId)
            await cargarTorneoTodasScores(selTorneo.id)
            cargarTorneos()
            avisarOk('Puntuación eliminada ✔')
          }
        } finally {
          setGuardando(false)
        }
      },
    })
  }

  function editarTorneoScore(s) {
    setTorneoScoreEditando(s)
  }

  // ---------- Puntuaciones ----------
  async function guardarScore(payload, idEditar) {
    setGuardando(true)
    setGuardandoTexto(idEditar ? 'ACTUALIZANDO RÉCORD...' : 'GUARDANDO RÉCORD...')
    try {
      const url = idEditar ? `${API_SCORES}?id=${idEditar}` : API_SCORES
      const body = idEditar ? payload : { ...payload, juego_id: sel.id }
      const { ok, data } = await apiCall(url, idEditar ? 'PUT' : 'POST', body)
      if (ok) {
        setScoreEditando(null)
        setScoreFormKey((k) => k + 1)
        await cargarScores(sel.id)
        cargarJuegos()
        setClasificacion(null)
        avisarOk(idEditar ? 'Puntuación actualizada ✔' : 'Puntuación guardada ✔')
      } else {
        avisarError(data?.error || 'Error al guardar la puntuación')
      }
    } finally {
      setGuardando(false)
    }
  }

  function eliminarScore(s) {
    setConfirmar({
      titulo: 'ELIMINAR RÉCORD',
      mensaje: `Se borrará el récord de ${s.usuario} del ${fechaLarga(s.fecha)}. Esta acción no se puede deshacer.`,
      accion: async () => {
        setGuardando(true)
        setGuardandoTexto('ELIMINANDO RÉCORD...')
        try {
          const { ok } = await apiCall(`${API_SCORES}?id=${s.id}`, 'DELETE')
          if (ok) {
            await cargarScores(sel.id)
            cargarJuegos()
            setClasificacion(null)
            avisarOk('Puntuación eliminada ✔')
          }
        } finally {
          setGuardando(false)
        }
      },
    })
  }

  function editarScore(s) {
    setScoreEditando(s)
  }

  const torneosMensuales = torneos.filter((t) => t.tipo === 'mensual')
  const torneosSuper = torneos.filter((t) => t.tipo === 'super')

  const juegosFiltrados = juegos.filter((j) =>
    j.nombre.toLowerCase().includes(filtro.trim().toLowerCase())
  )

  // Juego completo (con parámetros) asociado al torneo seleccionado.
  const torneoJuego = selTorneoJuegoId ? juegos.find((j) => j.id === selTorneoJuegoId) : null

  function abrirDetalleJuego(j) {
    const superTorneo = (torneos || []).find((t) => t.tipo === 'super' && t.juegos?.some((g) => g.id === j.id))
    const mensualTorneo = (torneos || []).find((t) => t.tipo === 'mensual' && t.juegos?.some((g) => g.id === j.id))

    if (superTorneo) {
      setSelTorneo(superTorneo)
      setSelTorneoJuegoId(j.id)
      setTab('ver')
      setVerSubTab('supertorneos')
    } else if (mensualTorneo) {
      setSelTorneo(mensualTorneo)
      setSelTorneoJuegoId(j.id)
      setTab('ver')
      setVerSubTab('torneos')
    } else {
      setSel(j)
      setTab('ver')
      setVerSubTab('general')
    }
  }

  return (
    <div className="arcade">
      <div className="scanlines" aria-hidden="true"></div>

      <div className="cabinet">
        {/* Marquesina: muestra los juegos creados (o clásicos de ejemplo si aún no hay ninguno) */}
        <div className="marquee-top">
          <div className="marquee-track">
            {(() => {
              const base = marqueeJuegos && marqueeJuegos.length > 0
                ? marqueeJuegos.map((j) => ({ nombre: j.nombre, juego: j }))
                : JUEGOS_DEMO.map((n) => ({ nombre: n, juego: null }))
              const items = [...base, ...base]
              return items.map((it, i) => (
                <span key={i} className="marquee-item">
                  {it.juego ? <LogoThumb juego={it.juego} size={3} prioridad="baja" /> : <PixelSprite name={SPRITE_NAMES[i % 8]} size={3} />}
                </span>
              ))
            })()}
          </div>

          <div className="header-user-action">
            {esAdmin ? (
              <button
                type="button"
                className="btn-user-auth btn-logout"
                onClick={handleLogout}
                data-tooltip="Cerrar sesión admin"
                data-tooltip-pos="left"
              >
                <span className="user-icon">🚪</span>
                <span className="user-label">LOGOUT</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-user-auth btn-login"
                onClick={() => { setLoginError(null); setFormLoginModal(true) }}
                data-tooltip="Iniciar sesión admin"
                data-tooltip-pos="left"
              >
                <span className="user-icon">👤</span>
              </button>
            )}
          </div>
        </div>

        <header className="crt-header">
          <div className="header-title-row">
            <img src={headerLeft} alt="Izquierda" className="header-title-img header-title-left" />
            <div className="logo-container">
              <h1 className="logo">
                <span className="logo-line">RETORNEOS</span>
                <span className="logo-space"> </span>
                <span className="logo-line">RETROAL</span>
              </h1>
              <div className="coin blink">INSERT COIN - PRESS START</div>
            </div>
            <img src={headerRight} alt="Derecha" className="header-title-img header-title-right" />
          </div>
        </header>

        {/* ---------- PESTAÑAS ---------- */}
        <nav className="tabs">
          <button className={tab === 'ver' ? 'tab activa' : 'tab'} onClick={() => setTab('ver')}>
            <span className="tab-icon">🏆</span><span className="tab-label">PUNTUACIONES</span>
          </button>
          {esAdmin && (
            <button className={tab === 'meter' ? 'tab activa' : 'tab'} onClick={() => setTab('meter')}>
              <span className="tab-icon">✏️</span><span className="tab-label">NUEVO RÉCORD</span>
            </button>
          )}
          <button className={tab === 'torneos' ? 'tab activa' : 'tab'} onClick={() => setTab('torneos')}>
            <span className="tab-icon">🏅</span><span className="tab-label">RETOS Y TORNEOS</span> <span className="tab-badge">{torneosMensuales.length}</span>
          </button>
          <button className={tab === 'juegos' ? 'tab activa' : 'tab'} onClick={() => setTab('juegos')}>
            <span className="tab-icon">🎮</span><span className="tab-label">JUEGOS</span> <span className="tab-badge">{juegos.length}</span>
          </button>
          <button className={tab === 'usuarios' ? 'tab activa' : 'tab'} onClick={() => setTab('usuarios')}>
            <span className="tab-icon">👤</span><span className="tab-label">JUGADORES</span> <span className="tab-badge">{usuarios.length}</span>
          </button>
          {esAdmin && (
            <button className={tab === 'parametros' ? 'tab activa' : 'tab'} onClick={() => setTab('parametros')}>
              <span className="tab-icon">🧩</span><span className="tab-label">PARÁMETROS</span> <span className="tab-badge">{parametros.length}</span>
            </button>
          )}
          <div className="mobile-tabs-container">
            <select className="tabs-select" value={tab} onChange={(e) => setTab(e.target.value)}>
              <option value="ver">🏆 PUNTUACIONES</option>
              {esAdmin && <option value="meter">✏️ NUEVO RÉCORD</option>}
              <option value="torneos">🏅 RETOS Y TORNEOS ({torneosMensuales.length})</option>
              <option value="juegos">🎮 JUEGOS ({juegos.length})</option>
              <option value="usuarios">👤 JUGADORES ({usuarios.length})</option>
              {esAdmin && <option value="parametros">🧩 PARÁMETROS ({parametros.length})</option>}
            </select>
            {tab === 'ver' && (
              <select className="subtabs-select" value={verSubTab} onChange={(e) => setVerSubTab(e.target.value)}>
                <option value="clasificacion">🥇 CLASIFICACIÓN</option>
                <option value="general">🏆 TORNEITO RETROAL</option>
                <option value="torneos">🏅 RETOS</option>
                <option value="supertorneos">🎖️ SUPERTORNEOS</option>
                <option value="panteon">👑 PANTEÓN</option>
              </select>
            )}
            {tab === 'meter' && (
              <select className="subtabs-select" value={meterSubTab} onChange={(e) => setMeterSubTab(e.target.value)}>
                <option value="general">🏆 TORNEITO RETROAL</option>
                <option value="torneos">🏅 RETOS</option>
                <option value="supertorneos">🎖️ SUPERTORNEOS</option>
              </select>
            )}
          </div>
        </nav>

        {/* ---------- PESTAÑA: VER PUNTUACIONES ---------- */}
        {tab === 'ver' && (
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
        )}

        {/* ---------- PESTAÑA: NUEVO RÉCORD ---------- */}
        {tab === 'meter' && (
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
        )}

        {/* ---------- PESTAÑA: JUEGOS ---------- */}
        {tab === 'juegos' && (
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
        )}

        {/* ---------- PESTAÑA: JUGADORES ---------- */}
        {tab === 'usuarios' && (
          <section className="screen">
            <h2 className="panel-title">▸ JUGADORES</h2>

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
          </section>
        )}

        {/* ---------- PESTAÑA: PARÁMETROS ---------- */}
        {tab === 'parametros' && esAdmin && (
          <section className="screen">
            <h2 className="panel-title">▸ PARÁMETROS DE PUNTUACIÓN</h2>
            <p className="form-ayuda">
              Crea aquí los campos que luego podrás asignar a cada juego (Puntos, Tiempo, Fase, Personaje...).
            </p>

            {esAdmin && (
              <ParametroForm
                key={formParametro && typeof formParametro === 'object' ? `edit-${formParametro.id}` : `nuevo-${parametroFormKey}`}
                parametro={formParametro}
                onGuardar={guardarParametro}
                onCancelar={() => setFormParametro(null)}
                onError={avisarError}
              />
            )}

            <ul className="lista-juegos lista-parametros">
              {parametros.length === 0 && <li className="vacio">No hay parámetros todavía</li>}
              {[...parametros]
                .sort((a, b) => (b.en_uso || 0) - (a.en_uso || 0) || (b.total_valores || 0) - (a.total_valores || 0) || a.nombre.localeCompare(b.nombre))
                .map((p) => (
                <li key={p.id} className={formParametro && formParametro !== 'nuevo' && formParametro.id === p.id ? 'activo' : ''}>
                  <div className="jinfo">
                    <span className="jnombre">{p.nombre} <span className="chip-tipo">{TIPO_LABEL[p.tipo]}</span></span>
                    <span className="jmeta">Usado en {p.en_uso} juego(s)</span>
                  </div>
                  {esAdmin && (
                    <>
                      <button className="borrar editar" onClick={() => setFormParametro(p)} data-tooltip="Editar parámetro" data-tooltip-pos="left">✎</button>
                      {p.total_valores > 0 ? (
                        <button className="borrar bloqueado" disabled data-tooltip="No se puede eliminar: ya tiene datos guardados" data-tooltip-pos="left">🔒</button>
                      ) : (
                        <button className="borrar" onClick={() => eliminarParametro(p)} data-tooltip="Eliminar parámetro" data-tooltip-pos="left">✕</button>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ---------- PESTAÑA: TORNEOS Y RETOS (solo gestión: crear/editar/borrar) ---------- */}
        {tab === 'torneos' && (
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
        )}

        {/* Controles decorativos */}
        <div className="controls">
          <img src={ryuGif} alt="Ryu" className="control-gif ryu-gif" />
          <img src={kenGif} alt="Ken" className="control-gif ken-gif" />
        </div>

        <footer className="credits">CREDIT 00 — (C) 198X ARCADE HIGH SCORES</footer>
      </div>

      {formTorneo && esAdmin && (
        <div className="modal-overlay" onClick={() => setFormTorneo(null)}>
          <div className="modal modal-form-torneo" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-titulo">{formTorneo === 'nuevo' ? '+ NUEVO RETO / SUPERTORNEO' : (formTorneo?.tipo === 'super' ? '✎ EDITAR SUPERTORNEO' : '✎ EDITAR RETO')}</h3>
            <TorneoForm
              key={formTorneo === 'nuevo' ? `nuevo-${torneoFormKey}` : `edit-${formTorneo.id}`}
              torneo={formTorneo}
              juegos={juegos}
              onGuardar={guardarTorneo}
              onCancelar={() => setFormTorneo(null)}
              onError={avisarError}
              onConfirmar={setConfirmar}
            />
          </div>
        </div>
      )}

      {(scoreEditando || torneoScoreEditando) && esAdmin && (
        <div
          className="modal-overlay"
          onClick={() => { setScoreEditando(null); setTorneoScoreEditando(null) }}
        >
          <div className="modal modal-form-score" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-titulo">✎ EDITAR RÉCORD</h3>
            <p className="modal-juego-fijo">
              🎮 {(scoreEditando ? sel : torneoJuego)?.nombre}
            </p>
            <ScoreForm
              key={(scoreEditando || torneoScoreEditando).id}
              juego={scoreEditando ? sel : torneoJuego}
              usuarios={usuarios}
              score={scoreEditando || torneoScoreEditando}
              onGuardar={scoreEditando ? guardarScore : guardarTorneoScore}
              onCancelar={() => { setScoreEditando(null); setTorneoScoreEditando(null) }}
              onError={avisarError}
            />
          </div>
        </div>
      )}

      {modalNuevoRecordGen && esAdmin && sel && (
        <div className="modal-overlay" onClick={() => setModalNuevoRecordGen(false)}>
          <div className="modal modal-form-score" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-titulo">+ AÑADIR RÉCORD A TORNEITO RETROAL</h3>
            <p className="modal-juego-fijo">
              🎮 {sel.nombre}
            </p>
            {sel.parametros.length === 0 ? (
              <p className="vacio-inline">
                Este juego no tiene parámetros de puntuación. Edítalo en la pestaña JUEGOS para añadirlos.
              </p>
            ) : usuarios.length === 0 ? (
              <p className="vacio-inline">
                No hay jugadores todavía. Crea uno en la pestaña JUGADORES antes de meter un récord.
              </p>
            ) : (
              <ScoreForm
                key={`modal-gen-${sel.id}-${scoreFormKey}`}
                juego={sel}
                usuarios={usuarios}
                score={null}
                onGuardar={async (payload, idEditar) => {
                  await guardarScore(payload, idEditar)
                  setModalNuevoRecordGen(false)
                }}
                onCancelar={() => setModalNuevoRecordGen(false)}
                onError={avisarError}
              />
            )}
          </div>
        </div>
      )}

      {modalNuevoRecordSuper && esAdmin && selTorneo && torneoJuego && (
        <div className="modal-overlay" onClick={() => setModalNuevoRecordSuper(false)}>
          <div className="modal modal-form-score" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-titulo">+ AÑADIR RÉCORD</h3>
            <p className="modal-juego-fijo">
              🏆 {selTorneo.nombre} — 🎮 {torneoJuego.nombre}
            </p>
            {torneoJuego.parametros.length === 0 ? (
              <p className="vacio-inline">
                Este juego no tiene parámetros de puntuación. Edítalo en la pestaña JUEGOS para añadirlos.
              </p>
            ) : usuarios.length === 0 ? (
              <p className="vacio-inline">
                No hay jugadores todavía. Crea uno en la pestaña JUGADORES antes de meter un récord.
              </p>
            ) : (
              <ScoreForm
                key={`modal-super-${selTorneo.id}-${selTorneoJuegoId}-${torneoScoreFormKey}`}
                juego={torneoJuego}
                usuarios={usuarios}
                score={null}
                onGuardar={async (payload, idEditar) => {
                  await guardarTorneoScore(payload, idEditar)
                  setModalNuevoRecordSuper(false)
                }}
                onCancelar={() => setModalNuevoRecordSuper(false)}
                onError={avisarError}
              />
            )}
          </div>
        </div>
      )}

      {confirmar && (
        <div className="modal-overlay modal-confirmar-overlay" onClick={() => setConfirmar(null)}>
          <div className="modal modal-confirmar" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-titulo">⚠ {confirmar.titulo}</h3>
            <p className="modal-msg">{confirmar.mensaje}</p>
            <div className="modal-acciones">
              <button className="modal-no" onClick={() => setConfirmar(null)}>CANCELAR</button>
              <button
                className="modal-si"
                onClick={() => { confirmar.accion(); setConfirmar(null) }}
              >
                ELIMINAR
              </button>
            </div>
          </div>
        </div>
      )}

      {ok && (
        <div className="modal-overlay ok-overlay" onClick={() => setOk(null)}>
          <div className="modal ok-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-titulo ok-titulo">✔ {ok}</h3>
          </div>
        </div>
      )}

      {errorPopup && (
        <div className="modal-overlay error-overlay" onClick={() => setErrorPopup(null)}>
          <div className="modal error-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-titulo error-titulo">! {errorPopup} !</h3>
          </div>
        </div>
      )}

      {jugadorDetalle && (
        <div className="modal-overlay" onClick={() => setJugadorDetalle(null)}>
          <div
            className="modal modal-detalle-jugador"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal-titulo">🕹 {jugadorDetalle}</h3>
            <nav className="tabs subtabs subtabs-siempre-visible">
              <button
                className={jugadorDetalleTab === 'clasificacion' ? 'tab activa' : 'tab'}
                onClick={() => setJugadorDetalleTab('clasificacion')}
              >
                🏆 CLASIFICACIÓN
              </button>
              <button
                className={jugadorDetalleTab === 'torneos' ? 'tab activa' : 'tab'}
                onClick={() => setJugadorDetalleTab('torneos')}
              >
                🏅 RETOS
              </button>
              <button
                className={jugadorDetalleTab === 'supertorneos' ? 'tab activa' : 'tab'}
                onClick={() => setJugadorDetalleTab('supertorneos')}
              >
                🎖️ SUPERTORNEOS
              </button>
              <select className="subtabs-select" value={jugadorDetalleTab} onChange={(e) => setJugadorDetalleTab(e.target.value)}>
                <option value="clasificacion">🏆 CLASIFICACIÓN</option>
                <option value="torneos">🏅 RETOS</option>
                <option value="supertorneos">🎖️ SUPERTORNEOS</option>
              </select>
            </nav>

            <div className="subtab-panel modal-subtab-panel">
              {jugadorDetalleTab === 'clasificacion' && (
                <>
                  {(clasificacion?.detallePorJugador?.get(jugadorDetalle) || []).length > 0 && (
                    <input
                      className="buscador"
                      value={filtroJugadorDetalleJuego}
                      onChange={(e) => setFiltroJugadorDetalleJuego(e.target.value)}
                      placeholder="🔍 Filtrar juego..."
                    />
                  )}
                  <div className="detalle-jugador-scroll">
                    {(clasificacion?.detallePorJugador?.get(jugadorDetalle) || []).length === 0 ? (
                      <p className="modal-msg">Sin puntuaciones en el TOP 10 de ningún juego.</p>
                    ) : (
                      <table className="tabla-detalle-jugador">
                        <thead>
                          <tr><th></th><th>JUEGO</th><th>POS</th><th>PUNTUACIÓN</th></tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const filas = clasificacion.detallePorJugador.get(jugadorDetalle)
                              .filter(({ juego }) => normalizarTexto(juego.nombre).includes(normalizarTexto(filtroJugadorDetalleJuego)))
                            if (filas.length === 0) {
                              return <tr><td colSpan={4} className="vacio-detalle">Sin juegos que coincidan</td></tr>
                            }
                            return filas.map(({ juego, pos, valores }) => (
                              <tr key={juego.id}>
                                <td className="recreativa-logo"><LogoThumb juego={juego} size={5} /></td>
                                <td className="recreativa-nombre">{juego.nombre}</td>
                                <td className="pos">{pos}º</td>
                                <td className="pts">
                                  {juego.parametros
                                    .map((p) => ({ p, v: formatearValorParam(p, valores) }))
                                    .filter(({ v }) => v)
                                    .map(({ p, v }, i) => (
                                      <span key={p.id}>
                                        {i > 0 && ' · '}
                                        <span className="pts-nombre">{p.nombre}:</span>{' '}
                                        <span className="pts-valor">{v}</span>
                                      </span>
                                    ))}
                                </td>
                              </tr>
                            ))
                          })()}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              )}

              {jugadorDetalleTab === 'torneos' && (
                <>
                  {(torneosJugador || []).length > 0 && (
                    <input
                      className="buscador"
                      value={filtroJugadorDetalleTorneo}
                      onChange={(e) => setFiltroJugadorDetalleTorneo(e.target.value)}
                      placeholder="🔍 Filtrar reto..."
                    />
                  )}
                  <div className="detalle-jugador-scroll">
                    {torneosJugadorCargando ? (
                      <p className="modal-msg">Cargando…</p>
                    ) : (torneosJugador || []).length === 0 ? (
                      <p className="modal-msg">Sin participaciones en retos mensuales.</p>
                    ) : (
                      <table className="tabla-detalle-jugador">
                        <thead>
                          <tr><th></th><th>RETO</th><th>JUEGO</th><th>POS</th></tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const filas = torneosJugador
                              .filter((t) => normalizarTexto(t.nombre).includes(normalizarTexto(filtroJugadorDetalleTorneo)))
                            if (filas.length === 0) {
                              return <tr><td colSpan={4} className="vacio-detalle">Sin retos que coincidan</td></tr>
                            }
                            return filas.map((t) => (
                              <tr key={t.torneo_id}>
                                <td className="recreativa-logo"><LogoThumb juego={t.juego} size={5} /></td>
                                <td className="recreativa-nombre">{t.nombre}</td>
                                <td className="recreativa-nombre">{t.juego.nombre}</td>
                                <td className="pos">{t.pos}º / {t.total}</td>
                              </tr>
                            ))
                          })()}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              )}

              {jugadorDetalleTab === 'supertorneos' && (
                <>
                  {(supertorneosJugador || []).length > 0 && (
                    <input
                      className="buscador"
                      value={filtroJugadorDetalleSuper}
                      onChange={(e) => setFiltroJugadorDetalleSuper(e.target.value)}
                      placeholder="🔍 Filtrar supertorneo o juego..."
                    />
                  )}
                  <div className="detalle-jugador-scroll">
                    {torneosJugadorCargando ? (
                      <p className="modal-msg">Cargando…</p>
                    ) : (supertorneosJugador || []).length === 0 ? (
                      <p className="modal-msg">Sin participaciones en supertorneos.</p>
                    ) : (
                      (() => {
                        const superFiltrados = supertorneosJugador.filter((st) => {
                          const txt = normalizarTexto(filtroJugadorDetalleSuper)
                          if (!txt) return true
                          if (normalizarTexto(st.nombre).includes(txt)) return true
                          return (st.juegos || []).some((j) => normalizarTexto(j.juego.nombre).includes(txt))
                        })

                        if (superFiltrados.length === 0) {
                          return <p className="modal-msg">Sin supertorneos que coincidan</p>
                        }

                        return (
                          <div className="lista-supertorneos-detalle">
                            {superFiltrados.map((st) => (
                              <div key={st.torneo_id} className="supertorneo-detalle-card">
                                <div className="supertorneo-detalle-header">
                                  <span className="st-nombre">🎖️ {st.nombre}</span>
                                  <span className="st-pos-general">
                                    POSICIÓN GENERAL: <strong className="pos">{st.pos_general}º / {st.total_general}</strong> ({st.puntos_general} pts)
                                  </span>
                                </div>
                                <table className="tabla-detalle-jugador tabla-supertorneo-juegos">
                                  <thead>
                                    <tr><th></th><th>JUEGO</th><th>POS EN JUEGO</th><th>PTS</th></tr>
                                  </thead>
                                  <tbody>
                                    {(st.juegos || []).map(({ juego, pos, total, puntos }) => (
                                      <tr key={juego.id}>
                                        <td className="recreativa-logo"><LogoThumb juego={juego} size={5} /></td>
                                        <td className="recreativa-nombre">{juego.nombre}</td>
                                        <td className="pos">{pos}º / {total}</td>
                                        <td className="st-pts-juego">{puntos} pts</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ))}
                          </div>
                        )
                      })()
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="modal-acciones">
              <button className="modal-no" onClick={() => setJugadorDetalle(null)}>CERRAR</button>
            </div>
          </div>
        </div>
      )}

      {formPanteonModal && esAdmin && (
        <div className="modal-overlay" onClick={() => setFormPanteonModal(false)}>
          <div className="modal modal-form-panteon" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-titulo">🏛️ ASIGNAR CAMPEÓN EN EL PANTEÓN</h3>
            <p className="form-ayuda" style={{ marginBottom: '14px' }}>
              Selecciona un reto mensual y sube el cartel o foto conmemorativa en honor a su campeón.
            </p>

            <form className="panteon-form" onSubmit={guardarPanteon}>
              <SelectorTorneo
                torneos={torneosMensuales.filter((t) => !t.imagen_campeon)}
                sel={torneosMensuales.find((x) => x.id === panteonTorneoId) || null}
                onSel={(t) => {
                  if (t) {
                    setPanteonTorneoId(t.id)
                    setPanteonPreview(t.imagen_campeon || null)
                  } else {
                    setPanteonTorneoId('')
                    setPanteonPreview(null)
                  }
                }}
              />

              {panteonTorneoId && (
                <div className="panteon-input-zone">
                  <div className="campo">
                    <span>CARTEL O FOTO DEL CAMPEÓN (FORMATO VERTICAL)</span>
                    <DropZone
                      accept="image/*"
                      onFileSelect={async (file) => {
                        if (file) {
                          try {
                            const url = await fileToDataUrl(file)
                            setPanteonPreview(url)
                          } catch (err) {
                            avisarError(err?.message || 'Error al leer la imagen')
                          }
                        }
                      }}
                    >
                      <div className="panteon-dropzone-inner" style={{ padding: '16px', textAlign: 'center', color: 'var(--sms-blue-dark)', fontSize: '12px', fontWeight: 'bold' }}>
                        📥 Arrastra aquí la imagen o haz clic para subir
                      </div>
                    </DropZone>
                  </div>

                  {panteonPreview && (
                    <div className="panteon-preview-box">
                      <span className="panteon-preview-lbl">VISTA PREVIA:</span>
                      <div className="panteon-preview-frame">
                        <img src={panteonPreview} alt="Vista previa campeón" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-acciones" style={{ marginTop: '20px' }}>
                <button type="button" className="modal-no" onClick={() => setFormPanteonModal(false)}>
                  CANCELAR
                </button>
                <button type="submit" className="modal-si" disabled={!panteonTorneoId || !panteonPreview}>
                  GUARDAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalNormas && (
        <div className="modal-overlay" onClick={() => setModalNormas(false)}>
          <div className="modal modal-normas" onClick={(e) => e.stopPropagation()}>
            <div className="modal-normas-header">
              <h3 className="modal-titulo" style={{ margin: 0 }}>
                {normasTipo === 'general'
                  ? '📜 Normas de Torneito Retroal'
                  : normasTipo === 'supertorneos'
                  ? `📜 Normas: ${normasTorneoSel?.nombre || 'Supertorneo'}`
                  : '📜 Normas de los retos'}
              </h3>
              {esAdmin && (
                <button
                  type="button"
                  className={normasEditando ? 'btn-secundario btn-sm activa' : 'btn-secundario btn-sm'}
                  onClick={() => setNormasEditando(!normasEditando)}
                >
                  {normasEditando ? '👁️ MODO LECTURA' : '✏️ EDITAR NORMAS'}
                </button>
              )}
            </div>

            <div className="modal-normas-body">
              {esAdmin && normasEditando ? (
                <div className="wordtohtml-editor-wrap">
                  <div className="wordtohtml-toolbar">
                    <div className="toolbar-group">
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCmd('bold') }}
                        title="Negrita"
                        data-tooltip="Negrita"
                      >
                        <b>B</b>
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          colorInputRef.current?.click()
                        }}
                        title="Color de texto"
                        data-tooltip="Color de texto"
                      >
                        🎨
                      </button>
                      <input
                        ref={colorInputRef}
                        type="color"
                        defaultValue="#e60000"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          execCmd('foreColor', e.target.value)
                        }}
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCmd('insertOrderedList') }}
                        title="Lista ordenada"
                        data-tooltip="Lista ordenada"
                      >
                        1.≡
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCmd('insertUnorderedList') }}
                        title="Lista desordenada"
                        data-tooltip="Lista desordenada"
                      >
                        •≡
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); insertarTablaNormas() }}
                        title="Insertar tabla"
                        data-tooltip="Insertar tabla"
                      >
                        📊
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); insertarEnlaceNormas() }}
                        title="Insertar enlace"
                        data-tooltip="Insertar enlace"
                      >
                        🔗
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCmd('removeFormat') }}
                        title="Limpiar formato"
                        data-tooltip="Limpiar formato"
                      >
                        🧹
                      </button>
                    </div>
                  </div>

                  <div
                    ref={editorWysiwygRef}
                    className="wordtohtml-visual normas-contenido-html"
                    contentEditable
                    suppressContentEditableWarning
                  />
                </div>
              ) : (
                <div
                  className="normas-contenido-html"
                  dangerouslySetInnerHTML={{
                    __html: (
                      normasTipo === 'general'
                        ? normasGeneralHtml
                        : normasTipo === 'supertorneos'
                        ? normasSupertorneoHtml
                        : normasRetosHtml
                    ) || '<p>No hay normas establecidas por el momento para este supertorneo.</p>'
                  }}
                />
              )}
            </div>

            <div className="modal-acciones" style={{ marginTop: '16px' }}>
              {esAdmin && normasTipo === 'supertorneos' && (normasTorneoSel?.normas || normasSupertorneoHtml) && (
                <button
                  type="button"
                  className="borrar sm"
                  style={{ marginRight: 'auto' }}
                  onClick={eliminarNormasSupertorneo}
                >
                  🗑️ ELIMINAR NORMAS
                </button>
              )}

              {esAdmin && normasEditando ? (
                <>
                  <button type="button" className="modal-si" onClick={guardarNormas}>
                    GUARDAR NORMAS
                  </button>
                  <button
                    type="button"
                    className="modal-no"
                    onClick={() => {
                      setNormasEditando(false)
                    }}
                  >
                    CANCELAR
                  </button>
                </>
              ) : (
                <button type="button" className="modal-no" onClick={() => setModalNormas(false)}>
                  CERRAR
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {formLoginModal && (
        <div className="modal-overlay" onClick={() => setFormLoginModal(false)}>
          <div className="modal modal-login" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-titulo">🔐 ACCESO ADMINISTRADOR</h3>
            <form className="form-login" onSubmit={handleLogin}>
              <div className="campo">
                <span>USUARIO</span>
                <input
                  type="text"
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  placeholder="Usuario admin..."
                  autoFocus
                />
              </div>
              <div className="campo">
                <span>CONTRASEÑA</span>
                <input
                  type="password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="Contraseña..."
                />
              </div>
              {loginError && <p className="login-error-msg">⚠ {loginError}</p>}
              <div className="modal-acciones" style={{ marginTop: '16px' }}>
                <button type="button" className="modal-no" onClick={() => setFormLoginModal(false)}>
                  CANCELAR
                </button>
                <button type="submit" className="modal-si">
                  ENTRAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {guardando && (
        <div className="loading-overlay">
          <div className="loading-box">
            <div className="loading-spinner" />
            <span className="loading-texto">{guardandoTexto || 'GUARDANDO...'}</span>
          </div>
        </div>
      )}

      {activeTooltip && (
        <div className="retro-floating-tooltip" style={activeTooltip.style}>
          {activeTooltip.text}
        </div>
      )}
    </div>
  )
}
