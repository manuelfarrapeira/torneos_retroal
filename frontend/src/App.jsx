import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ryuGif from './assets/ryu.gif'
import kenGif from './assets/ken.gif'
import headerLeft from './assets/header-left.png'
import headerRight from './assets/header-right.png'
import { API_AUTH, API_CLASIFICACION, API_COPIAR_TORNEITO, API_JUEGOS, API_NORMAS, API_PARAMETROS, API_SCORES, API_TORNEOS, API_TORNEOS_JUGADOR, API_USUARIOS, API_SUBIR_CARATULA_RETO, API_ELIMINAR_CARATULA_RETO, API_ARCADES, API_PUNTUACIONES_RECIENTES } from './api/endpoints'
import { BannerPlaceholder } from './components/common/BannerPlaceholder'
import { AsyncImage, esMediaMp4 } from './components/common/AsyncImage'
import { DropZone } from './components/common/DropZone'
import { LogoThumb } from './components/common/LogoThumb'
import { SelectorJuego } from './components/common/SelectorJuego'
import { SelectorTorneo } from './components/common/SelectorTorneo'
import { JuegoForm } from './components/forms/JuegoForm'
import { MeterTab } from './components/tabs/MeterTab'
import { ParametroForm } from './components/forms/ParametroForm'
import { ScoreForm } from './components/forms/ScoreForm'
import { TorneoForm } from './components/forms/TorneoForm'
import { UsuarioForm } from './components/forms/UsuarioForm'
import { SelectorUsuario } from './components/common/SelectorUsuario'
import { JuegosTab } from './components/tabs/JuegosTab'
import { ParametrosTab } from './components/tabs/ParametrosTab'
import { TorneosTab } from './components/tabs/TorneosTab'
import { UsuariosTab } from './components/tabs/UsuariosTab'
import { FamiliaTab } from './components/tabs/FamiliaTab'
import { VerTab } from './components/tabs/VerTab'
import { PixelSprite, SPRITE_NAMES } from './components/sprites/PixelSprite'
import { RankingTable } from './components/tables/RankingTable'
import { SuperGeneralTable, calcularClasificacionGeneralSuper } from './components/tables/SuperGeneralTable'
import { useDragScroll } from './hooks/useDragScroll'
import { JUEGOS_DEMO, TIPO_LABEL } from './utils/constants'
import { fechaLarga } from './utils/date'
import { fileToDataUrl } from './utils/file'
import { formatearNombreJuegoClasificacion, formatearValorParam } from './utils/format'
import { normalizarTexto } from './utils/text'

export default function App() {
  const [juegos, setJuegos] = useState([])
  const [marqueeJuegos, setMarqueeJuegos] = useState(null)
  const [recientes, setRecientes] = useState([])

  const [usuarios, setUsuarios] = useState([])
  const [arcades, setArcades] = useState([])
  const [parametros, setParametros] = useState([])
  const [sel, setSel] = useState(null) // juego seleccionado
  const [scores, setScores] = useState([])
  const [scoresCargando, setScoresCargando] = useState(false)
  const [errorPopup, setErrorPopup] = useState(null)
  const [ok, setOk] = useState(null)
  const [tab, setTab] = useState('ver') // 'ver' | 'meter' | 'juegos' | 'usuarios' | 'parametros'
  const [usuariosSubTab, setUsuariosSubTab] = useState('jugadores') // subtab dentro de 'usuarios': 'jugadores' | 'arcades'

  const [activeTooltip, setActiveTooltip] = useState(null)

  // Últimas puntuaciones para la marquesina vertical; se refrescan al cambiar de pestaña y cada minuto.
  useEffect(() => {
    const cargar = () => fetch(API_PUNTUACIONES_RECIENTES)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setRecientes(d) })
      .catch(() => {})
    cargar()
    const t = setInterval(cargar, 60000)
    return () => clearInterval(t)
  }, [tab])

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
  const [formArcade, setFormArcade] = useState(null)
  const formArcadeRef = useRef(null)
  const [arcadeImagePreview, setArcadeImagePreview] = useState(null)
  const [arcadeUsuarioIds, setArcadeUsuarioIds] = useState([null, null])
  const [arcadeJugadorImg, setArcadeJugadorImg] = useState(null)
  useEffect(() => {
    setArcadeUsuarioIds(formArcade && formArcade !== 'nuevo' ? [formArcade.usuario_id || null, formArcade.usuario_id2 || null] : [null, null])
  }, [formArcade])
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
  const [jugadorDetalleClasificacionCargando, setJugadorDetalleClasificacionCargando] = useState(false)
  const [filtroJugadorDetalleJuego, setFiltroJugadorDetalleJuego] = useState('')
  const [jugadorDetalleTab, setJugadorDetalleTab] = useState('clasificacion') // 'clasificacion' | 'torneos' | 'supertorneos'
  const [torneosJugador, setTorneosJugador] = useState(null)
  const [supertorneosJugador, setSupertorneosJugador] = useState(null)
  const [torneosJugadorCargando, setTorneosJugadorCargando] = useState(false)
  const [filtroJugadorDetalleTorneo, setFiltroJugadorDetalleTorneo] = useState('')
  const [filtroJugadorDetalleSuper, setFiltroJugadorDetalleSuper] = useState('')
  const [anchoDetalleJugador, setAnchoDetalleJugador] = useState(0)
  const refDetalleJugador = useRef(null)
  const refJugadorDetalleYaCargado = useRef(null)

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

  function quitarCaratulaReto(torneoId) {
    if (!esAdmin) return
    const t = torneos.find((x) => x.id === torneoId)
    setConfirmar({
      titulo: 'ELIMINAR CARÁTULA',
      mensaje: `¿Seguro que deseas eliminar la carátula del reto "${t?.nombre}"?`,
      accion: async () => {
        setGuardando(true)
        setGuardandoTexto('ELIMINANDO CARÁTULA...')
        try {
          const formData = new FormData()
          formData.append('torneo_id', torneoId)
          const res = await fetch(API_ELIMINAR_CARATULA_RETO, { method: 'POST', body: formData })
          const resText = await res.text()
          let data
          try { data = JSON.parse(resText) } catch (e) {}
          if (data && data.error) {
            avisarError(data.error)
          } else {
            await cargarTorneos()
            avisarOk('Carátula eliminada ✔')
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
    refJugadorDetalleYaCargado.current = null  // Reset para cargar nuevas puntuaciones
    setJugadorDetalleClasificacionCargando(true)
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

  // Cargar puntuaciones adicionales del jugador que no estén en TOP 10
  useEffect(() => {
    if (!jugadorDetalle) return
    if (!clasificacion || !juegos.length) {
      setJugadorDetalleClasificacionCargando(false)
      return
    }

    // Si ya cargamos para este jugador, no volver a cargar
    if (refJugadorDetalleYaCargado.current === jugadorDetalle) {
      setJugadorDetalleClasificacionCargando(false)
      return
    }

    const cargarPuntuacionesAdicionales = async () => {
      setJugadorDetalleClasificacionCargando(true)
      try {
        const detalleActualizado = new Map(clasificacion.detallePorJugador)
        const juegoYaCargados = new Set(
          (detalleActualizado.get(jugadorDetalle) || []).map((d) => d.juego.id)
        )

        let hayNuevos = false

        for (const juego of juegos) {
          if (juegoYaCargados.has(juego.id)) continue

          try {
            const res = await fetch(`${API_SCORES}?juego_id=${juego.id}`)
            if (!res.ok) continue
            const puntuaciones = await res.json()
            if (!Array.isArray(puntuaciones)) continue

            const puntuacionesJugador = puntuaciones.filter((p) => p.usuario === jugadorDetalle)
            if (puntuacionesJugador.length === 0) continue

            hayNuevos = true
            if (!detalleActualizado.has(jugadorDetalle)) {
              detalleActualizado.set(jugadorDetalle, [])
            }

            puntuacionesJugador.forEach((p) => {
              const pos = puntuaciones.findIndex((pp) => pp.id === p.id) + 1
              const detalleExistente = detalleActualizado.get(jugadorDetalle)
              const yaEsta = detalleExistente.some((d) => d.juego.id === juego.id)

              if (!yaEsta) {
                detalleExistente.push({
                  juego,
                  pos,
                  fecha: p.fecha,
                  valores: p.valores || [],
                })
                detalleExistente.sort((a, b) => normalizarTexto(a.juego.nombre).localeCompare(normalizarTexto(b.juego.nombre)))
              }
            })
          } catch {
            // Ignorar errores
          }
        }

        if (hayNuevos) {
          setClasificacion((prev) => (prev ? { ...prev, detallePorJugador: detalleActualizado } : null))
        }
        refJugadorDetalleYaCargado.current = jugadorDetalle
      } finally {
        setJugadorDetalleClasificacionCargando(false)
      }
    }

    cargarPuntuacionesAdicionales()
  }, [jugadorDetalle, juegos.length, clasificacion])

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

  async function cargarArcades() {
    const res = await fetch(API_ARCADES)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) setArcades(data)
    }
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

  useEffect(() => { cargarJuegos(); cargarUsuarios(); cargarParametros(); cargarTorneos(); cargarNormas(); cargarArcades() }, [])

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

  async function guardarArcade(payload) {
    setGuardando(true)
    setGuardandoTexto(payload.id ? 'ACTUALIZANDO ARCADE...' : 'CREANDO ARCADE...')
    try {
      const url = payload.id ? `${API_ARCADES}?id=${payload.id}` : API_ARCADES
      const { ok, data } = await apiCall(url, payload.id ? 'PUT' : 'POST', payload)
      if (ok) {
        await cargarArcades()
        setFormArcade(null)
        avisarOk(payload.id ? 'Arcade actualizado ✔' : 'Arcade creado ✔')
      } else {
        avisarError(data?.error || 'Error al guardar el arcade')
      }
    } finally {
      setGuardando(false)
    }
  }

  function eliminarArcade(arcadeId) {
    setConfirmar({
      titulo: 'ELIMINAR ARCADE',
      mensaje: 'Se borrará este arcade de la galería.',
      accion: async () => {
        setGuardando(true)
        setGuardandoTexto('ELIMINANDO ARCADE...')
        try {
          const { ok } = await apiCall(`${API_ARCADES}?id=${arcadeId}`, 'DELETE')
          if (ok) {
            await cargarArcades()
            avisarOk('Arcade eliminado ✔')
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
    const isMensual = payload.tipo === 'mensual'
    const caratula_file = payload._caratula_file
    const caratula_borrar = payload._caratula_borrar
    
    // Eliminar los flags privados antes de enviar al API
    delete payload._caratula_file
    delete payload._caratula_borrar
    
    setGuardando(true)
    setGuardandoTexto(idEditar ? (esSuper ? 'ACTUALIZANDO SUPERTORNEO...' : 'ACTUALIZANDO RETO...') : (esSuper ? 'CREANDO SUPERTORNEO...' : 'CREANDO RETO...'))
    try {
      const url = idEditar ? `${API_TORNEOS}?id=${idEditar}` : API_TORNEOS
      const { ok, data } = await apiCall(url, idEditar ? 'PUT' : 'POST', payload)
      if (ok) {
        const torneoId = idEditar || data.id
        
        // Manejar carátula si es reto mensual
        let caratula_ok = true
        if (isMensual && (caratula_file || caratula_borrar)) {
          if (caratula_borrar) {
            // Eliminar carátula
            const formData = new FormData()
            formData.append('torneo_id', torneoId)
            setGuardandoTexto('Eliminando carátula...')
            const res = await fetch(API_ELIMINAR_CARATULA_RETO, { method: 'POST', body: formData })
            const resText = await res.text()
            if (!res.ok) {
              try {
                const errData = JSON.parse(resText)
                avisarError(errData?.error || 'Error al eliminar la carátula')
              } catch (e) {
                avisarError(`Error al eliminar la carátula: ${res.status} ${resText.substring(0, 100)}`)
              }
              caratula_ok = false
            }
          } else if (caratula_file) {
            // Subir carátula
            const formData = new FormData()
            formData.append('torneo_id', torneoId)
            formData.append('caratula', caratula_file)
            setGuardandoTexto('Subiendo carátula...')
            const res = await fetch(API_SUBIR_CARATULA_RETO, { method: 'POST', body: formData })
            const resText = await res.text()
            if (!res.ok) {
              try {
                const errData = JSON.parse(resText)
                avisarError(errData?.error || 'Error al subir la carátula')
              } catch (e) {
                avisarError(`Error al subir la carátula: ${res.status} ${resText.substring(0, 100)}`)
              }
              caratula_ok = false
            }
          }
        }
        
        if (caratula_ok) {
          const lista = await cargarTorneos()
          if (selTorneo) setSelTorneo(lista.find((t) => t.id === selTorneo.id) || null)
          setFormTorneo(null)
          setTorneoFormKey((k) => k + 1)
          avisarOk(idEditar ? (esSuper ? 'Supertorneo actualizado ✔' : 'Reto actualizado ✔') : (esSuper ? 'Supertorneo creado ✔' : 'Reto creado ✔'))
        }
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

  function copiarRetoATorneito(torneo, juego) {
    setConfirmar({
      titulo: 'COPIAR A TORNEÍTO RETROAL',
      mensaje: `Se copiarán todas las puntuaciones de "${juego.nombre}" en ${torneo.nombre} a la clasificación general (Torneíto Retroal). Esta acción no se puede deshacer.`,
      confirmLabel: 'COPIAR',
      accion: async () => {
        setGuardando(true)
        setGuardandoTexto('COPIANDO PUNTUACIONES...')
        try {
          const { ok, data } = await apiCall(API_COPIAR_TORNEITO, 'POST', { torneo_id: torneo.id, juego_id: juego.id })
          if (ok) {
            await cargarJuegos()
            avisarOk(`${data?.copiadas ?? ''} puntuación(es) copiada(s) a Torneíto Retroal ✔`)
          } else {
            avisarError(data?.error || 'Error al copiar las puntuaciones')
          }
        } finally {
          setGuardando(false)
        }
      },
    })
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

  function abrirDesdeMarquesina(r) {
    if (!r.torneo_id) {
      const j = juegos.find((x) => x.id === r.juego_id)
      if (!j) return
      setSel(j)
      setTab('ver')
      setVerSubTab('general')
      return
    }
    const t = torneos.find((x) => x.id === r.torneo_id)
    if (!t) return
    setSelTorneo(t)
    setSelTorneoJuegoId(r.juego_id)
    setTab('ver')
    setVerSubTab(t.tipo === 'super' ? 'supertorneos' : 'torneos')
  }

  function abrirDetalleJuego(j) {
    // Prioridad: torneito (general) > reto mensual > supertorneo.
    // Si el juego no tiene récords en ninguno, no se navega a ningún sitio.
    const conRecords = (t) => t.juegos?.some((g) => g.id === j.id && (g.total_scores || 0) > 0)

    if ((j.total_scores ?? 0) > 0) {
      setSel(j)
      setTab('ver')
      setVerSubTab('general')
      return
    }
    const reto = torneos.find((t) => t.tipo === 'mensual' && conRecords(t))
    if (reto) {
      setSelTorneo(reto)
      setSelTorneoJuegoId(j.id)
      setTab('ver')
      setVerSubTab('torneos')
      return
    }
    const superTorneo = torneos.find((t) => t.tipo === 'super' && conRecords(t))
    if (superTorneo) {
      setSelTorneo(superTorneo)
      setSelTorneoJuegoId(j.id)
      setTab('ver')
      setVerSubTab('supertorneos')
    }
  }

  const arcadeJugador = (() => {
    if (!jugadorDetalle) return null
    const uid = usuarios.find((u) => u.nombre === jugadorDetalle)?.id
    return uid ? arcades.find((a) => a.usuario_id === uid || a.usuario_id2 === uid) || null : null
  })()

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
              {recientes.length > 0 && (
                <div className="vmarquee" aria-label="Últimas puntuaciones">
                  <div className="vmarquee-item vmarquee-head">
                    <span>JUEGO</span>
                    <span>JUGADOR</span>
                    <span>RÉCORD</span>
                    <span>POSICIÓN</span>
                  </div>
                  <div className="vmarquee-body">
                    <div
                      className="vmarquee-track"
                      style={{ animationDuration: `${recientes.length * 3}s` }}
                    >
                      {[...recientes, ...recientes].map((r, i) => (
                        <div key={i} className="vmarquee-item">
                          <button type="button" className="vmarquee-juego" onClick={() => abrirDesdeMarquesina(r)}>{r.juego}</button>
                          <span className="vmarquee-user">{r.usuario}</span>
                          <span className="vmarquee-valor">{r.valor}</span>
                          <span className="vmarquee-pos">{r.posicion ?? '-'}/{r.total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className={`coin blink coin-fallback${recientes.length > 0 ? ' hay-marquesina' : ''}`}>INSERT COIN - PRESS START</div>
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
            <span className="tab-icon">🏅</span><span className="tab-label">RETOS Y TORNEOS</span> <span className="tab-badge">{torneosMensuales.length + torneosSuper.length}</span>
          </button>
          <button className={tab === 'juegos' ? 'tab activa' : 'tab'} onClick={() => setTab('juegos')}>
            <span className="tab-icon">🎮</span><span className="tab-label">JUEGOS</span> <span className="tab-badge">{juegos.length}</span>
          </button>
          <button className={tab === 'usuarios' ? 'tab activa' : 'tab'} onClick={() => setTab('usuarios')}>
            <span className="tab-icon">👪</span><span className="tab-label">LA FAMILIA RETROAL</span>
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
              <option value="torneos">🏅 RETOS Y TORNEOS ({torneosMensuales.length + torneosSuper.length})</option>
              <option value="juegos">🎮 JUEGOS ({juegos.length})</option>
              <option value="usuarios">👪 LA FAMILIA RETROAL</option>
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
            {tab === 'torneos' && (
              <select className="subtabs-select" value={gestionSubTab} onChange={(e) => setGestionSubTab(e.target.value)}>
                <option value="torneos">🏅 RETOS</option>
                <option value="archivo">📸 ARCHIVO RETOS</option>
                <option value="supertorneos">🎖️ SUPERTORNEOS</option>
              </select>
            )}
            {tab === 'usuarios' && (
              <select className="subtabs-select" value={usuariosSubTab} onChange={(e) => setUsuariosSubTab(e.target.value)}>
                <option value="jugadores">👤 JUGADORES ({usuarios.length})</option>
                <option value="arcades">🏪 ARCADES RETROAL ({arcades.length})</option>
              </select>
            )}
          </div>
        </nav>

        {/* ---------- PESTAÑA: VER PUNTUACIONES ---------- */}
        {tab === 'ver' && (
          <VerTab
            verSubTab={verSubTab}
            setVerSubTab={setVerSubTab}
            clasificacion={clasificacion}
            filtroClasifJugador={filtroClasifJugador}
            setFiltroClasifJugador={setFiltroClasifJugador}
            abrirDetalleJugador={abrirDetalleJugador}
            filtroClasifJuego={filtroClasifJuego}
            setFiltroClasifJuego={setFiltroClasifJuego}
            dragScroll={dragScroll}
            setSel={setSel}
            handleClickJuego={abrirDetalleJuego}
            juegos={juegos}
            sel={sel}
            abrirNormas={abrirNormas}
            esAdmin={esAdmin}
            setModalNuevoRecordGen={setModalNuevoRecordGen}
            scores={scores}
            scoresCargando={scoresCargando}
            filtroUser={filtroUser}
            setFiltroUser={setFiltroUser}
            editarScore={editarScore}
            eliminarScore={eliminarScore}
            torneosMensuales={torneosMensuales}
            selTorneo={selTorneo}
            setSelTorneo={setSelTorneo}
            torneoJuego={torneoJuego}
            selTorneoJuegoId={selTorneoJuegoId}
            setSelTorneoJuegoId={setSelTorneoJuegoId}
            setModalNuevoRecordSuper={setModalNuevoRecordSuper}
            torneoScores={torneoScores}
            torneoScoresCargando={torneoScoresCargando}
            filtroTorneoUser={filtroTorneoUser}
            setFiltroTorneoUser={setFiltroTorneoUser}
            editarTorneoScore={editarTorneoScore}
            eliminarTorneoScore={eliminarTorneoScore}
            copiarRetoATorneito={copiarRetoATorneito}
            torneosSuper={torneosSuper}
            torneoTodasScores={torneoTodasScores}
            avisarError={avisarError}
            setPanteonTorneoId={setPanteonTorneoId}
            setPanteonPreview={setPanteonPreview}
            setFormPanteonModal={setFormPanteonModal}
            quitarImagenPanteon={quitarImagenPanteon}
          />
        )}

        {/* ---------- PESTAÑA: NUEVO RÉCORD ---------- */}
        {tab === 'meter' && (
          <MeterTab
            meterSubTab={meterSubTab}
            setMeterSubTab={setMeterSubTab}
            juegos={juegos}
            sel={sel}
            setSel={setSel}
            usuarios={usuarios}
            scoreFormKey={scoreFormKey}
            guardarScore={guardarScore}
            avisarError={avisarError}
            torneosMensuales={torneosMensuales}
            selTorneo={selTorneo}
            setSelTorneo={setSelTorneo}
            torneoJuego={torneoJuego}
            setSelTorneoJuegoId={setSelTorneoJuegoId}
            selTorneoJuegoId={selTorneoJuegoId}
            torneoScoreFormKey={torneoScoreFormKey}
            guardarTorneoScore={guardarTorneoScore}
            torneosSuper={torneosSuper}
            abrirNormas={abrirNormas}
            esAdmin={esAdmin}
          />
        )}

        {/* ---------- PESTAÑA: JUEGOS ---------- */}
        {tab === 'juegos' && (
          <JuegosTab
            esAdmin={esAdmin}
            formJuego={formJuego}
            parametros={parametros}
            juegos={juegos}
            guardarJuego={guardarJuego}
            setFormJuego={setFormJuego}
            avisarError={avisarError}
            filtro={filtro}
            setFiltro={setFiltro}
            juegosFiltrados={juegosFiltrados}
            sel={sel}
            abrirDetalleJuego={abrirDetalleJuego}
            eliminarJuego={eliminarJuego}
          />
        )}

        {/* ---------- PESTAÑA: LA FAMILIA RETROAL (JUGADORES + ARCADES) ---------- */}
        {tab === 'usuarios' && (
          <FamiliaTab
            esAdmin={esAdmin}
            usuariosSubTab={usuariosSubTab}
            setUsuariosSubTab={setUsuariosSubTab}
            formUsuario={formUsuario}
            usuarioFormKey={usuarioFormKey}
            guardarUsuario={guardarUsuario}
            setFormUsuario={setFormUsuario}
            avisarError={avisarError}
            usuarios={usuarios}
            filtroJugador={filtroJugador}
            setFiltroJugador={setFiltroJugador}
            abrirDetalleJugador={abrirDetalleJugador}
            eliminarUsuario={eliminarUsuario}
            arcades={arcades}
            guardarArcade={guardarArcade}
            eliminarArcade={eliminarArcade}
            formArcade={formArcade}
            setFormArcade={setFormArcade}
          />
        )}

        {/* ---------- PESTAÑA: PARÁMETROS ---------- */}
        {tab === 'parametros' && esAdmin && (
          <ParametrosTab
            esAdmin={esAdmin}
            formParametro={formParametro}
            parametroFormKey={parametroFormKey}
            guardarParametro={guardarParametro}
            setFormParametro={setFormParametro}
            avisarError={avisarError}
            parametros={parametros}
            eliminarParametro={eliminarParametro}
          />
        )}

        {/* ---------- PESTAÑA: TORNEOS Y RETOS (solo gestión: crear/editar/borrar) ---------- */}
        {tab === 'torneos' && (
          <TorneosTab
            esAdmin={esAdmin}
            setFormTorneo={setFormTorneo}
            gestionSubTab={gestionSubTab}
            setGestionSubTab={setGestionSubTab}
            torneosMensuales={torneosMensuales}
            formTorneo={formTorneo}
            setSelTorneo={setSelTorneo}
            setVerSubTab={setVerSubTab}
            setTab={setTab}
            eliminarTorneo={eliminarTorneo}
            quitarCaratulaReto={quitarCaratulaReto}
            torneosSuper={torneosSuper}
          />
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
              esAdmin={esAdmin}
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
                {confirmar.confirmLabel || 'ELIMINAR'}
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
              {arcadeJugador && (
                <button
                  className={jugadorDetalleTab === 'arcade' ? 'tab activa' : 'tab'}
                  onClick={() => setJugadorDetalleTab('arcade')}
                >
                  🏪 ARCADE
                </button>
              )}
              <select className="subtabs-select" value={jugadorDetalleTab} onChange={(e) => setJugadorDetalleTab(e.target.value)}>
                <option value="clasificacion">🏆 CLASIFICACIÓN</option>
                <option value="torneos">🏅 RETOS</option>
                <option value="supertorneos">🎖️ SUPERTORNEOS</option>
                {arcadeJugador && <option value="arcade">🏪 ARCADE</option>}
              </select>
            </nav>

            <div className="subtab-panel modal-subtab-panel">
              {jugadorDetalleTab === 'arcade' && arcadeJugador && (
                <div className="arcade-card jugador-arcade-card">
                  <div className="arcade-img-wrap" style={{ cursor: arcadeJugador.imagen ? 'pointer' : 'default' }} onClick={() => arcadeJugador.imagen && setArcadeJugadorImg(arcadeJugador.imagen)}>
                    {arcadeJugador.imagen ? (
                      <img src={arcadeJugador.imagen} alt="Arcade" className="arcade-img" />
                    ) : (
                      <div className="arcade-img-placeholder">Sin imagen</div>
                    )}
                  </div>
                  <div className="arcade-info">
                    {arcadeJugador.enlace && (
                      <a href={arcadeJugador.enlace} target="_blank" rel="noopener noreferrer" className="arcade-btn-ver-video" title="Ver video / Ir a la web">
                        📹 VER VIDEO
                      </a>
                    )}
                  </div>
                </div>
              )}
              {jugadorDetalleTab === 'clasificacion' && (
                <>
                  {(clasificacion?.detallePorJugador?.get(jugadorDetalle) || []).length > 0 && !jugadorDetalleClasificacionCargando && (
                    <input
                      className="buscador"
                      value={filtroJugadorDetalleJuego}
                      onChange={(e) => setFiltroJugadorDetalleJuego(e.target.value)}
                      placeholder="🔍 Filtrar juego..."
                    />
                  )}
                  <div className="detalle-jugador-scroll">
                    {jugadorDetalleClasificacionCargando ? (
                      <div className="loading-spinner-wrap">
                        <span className="loading-spinner" />
                      </div>
                    ) : (clasificacion?.detallePorJugador?.get(jugadorDetalle) || []).length === 0 ? (
                      <p className="modal-msg">Sin puntuaciones en clasificación.</p>
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

      {arcadeJugadorImg && (
        <div className="modal-overlay" onClick={() => setArcadeJugadorImg(null)}>
          <div className="arcade-modal-imagen" onClick={(e) => e.stopPropagation()}>
            <button className="arcade-modal-cerrar" onClick={() => setArcadeJugadorImg(null)} title="Cerrar">✕</button>
            <img src={arcadeJugadorImg} alt="Vista completa" className="arcade-imagen-completa" />
          </div>
        </div>
      )}

      {formArcade && esAdmin && (
        <div className="modal-overlay" onClick={() => { setFormArcade(null); setArcadeImagePreview(null) }}>
          <div className="modal modal-form-arcade" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-titulo">{formArcade === 'nuevo' ? '+ NUEVO ARCADE' : '✎ EDITAR ARCADE'}</h3>
            <form ref={formArcadeRef} className="arcade-form-modal" onSubmit={async (e) => {
              e.preventDefault()
              const formData = new FormData(e.target)
              const imagen = formData.get('imagen')
              const enlace = formData.get('enlace')?.trim()

              if (!imagen && formArcade !== 'nuevo' && !formArcade?.imagen) {
                avisarError('Se requiere una imagen')
                return
              }

              if (formArcade === 'nuevo' && !imagen) {
                avisarError('Se requiere una imagen')
                return
              }

              await guardarArcade({
                ...(formArcade !== 'nuevo' && { id: formArcade.id }),
                imagen: imagen || (formArcade !== 'nuevo' ? formArcade.imagen : null),
                enlace: enlace,
                usuario_ids: arcadeUsuarioIds.filter(Boolean),
              })
              setFormArcade(null)
              setArcadeImagePreview(null)
            }}>
              <div className="campo">
                <label>Enlace Web (opcional)</label>
                <input
                  type="url"
                  name="enlace"
                  defaultValue={formArcade !== 'nuevo' ? formArcade.enlace : ''}
                  placeholder="https://example.com"
                />
              </div>

              <div className="campo">
                <span>JUGADORES (OPCIONAL, MÁX. 2)</span>
                {arcadeUsuarioIds.filter(Boolean).length < 2 && (
                  <SelectorUsuario
                    usuarios={usuarios.filter((u) => {
                      if (arcadeUsuarioIds.includes(u.id)) return false
                      const ocupado = arcades.find((a) => a.usuario_id === u.id || a.usuario_id2 === u.id)
                      return !ocupado || (formArcade !== 'nuevo' && ocupado.id === formArcade.id)
                    })}
                    sel={null}
                    onSel={(id) => setArcadeUsuarioIds((prev) => [...prev.filter(Boolean), id])}
                  />
                )}
                {arcadeUsuarioIds.filter(Boolean).map((id) => (
                  <div className="arcade-jugador-chip" key={id}>
                    <span>🕹 {usuarios.find((u) => u.id === id)?.nombre}</span>
                    <button type="button" className="borrar" onClick={() => setArcadeUsuarioIds((prev) => prev.filter((x) => x && x !== id))}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="campo">
                <span>IMAGEN (FORMATO VERTICAL)</span>
                <DropZone
                  accept="image/*"
                  onFileSelect={async (file) => {
                    if (file) {
                      try {
                        const url = await fileToDataUrl(file)
                        if (formArcadeRef.current) {
                          const input = formArcadeRef.current.querySelector('input[name="imagen"]')
                          if (input) input.value = url
                        }
                        setArcadeImagePreview(url)
                      } catch (err) {
                        avisarError(err?.message || 'Error al leer la imagen')
                      }
                    }
                  }}
                >
                  {arcadeImagePreview ? (
                    <img src={arcadeImagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }} />
                  ) : (
                    <div className="arcade-dropzone-inner">
                      📥 Arrastra aquí la imagen o haz clic para subir
                    </div>
                  )}
                </DropZone>
                <input type="hidden" name="imagen" />
              </div>

              <div className="modal-acciones" style={{ marginTop: '20px' }}>
                <button type="button" className="modal-no" onClick={() => { setFormArcade(null); setArcadeImagePreview(null) }}>
                  CANCELAR
                </button>
                <button type="submit" className="modal-si">
                  {formArcade === 'nuevo' ? '+ CREAR' : '✎ GUARDAR'}
                </button>
              </div>
            </form>
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
