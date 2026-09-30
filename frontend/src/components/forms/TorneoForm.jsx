import { useState } from 'react'
import { DropZone } from '../common/DropZone'
import { LogoThumb } from '../common/LogoThumb'
import { SelectorJuego } from '../common/SelectorJuego'
import { SelectorJuegoMultiAdd } from '../common/SelectorJuegoMultiAdd'
import { AÑOS_TORNEO, MESES } from '../../utils/constants'
import { fileToDataUrl } from '../../utils/file'

// ---------- Formulario de torneo ----------
// Mensual: título automático (mes+año), 0 o 1 juego (se puede añadir después).
// Super: título libre, 0+ juegos (se pueden ir añadiendo con el tiempo).
export function TorneoForm({ torneo, juegos, onGuardar, onCancelar, onError, onConfirmar }) {
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
