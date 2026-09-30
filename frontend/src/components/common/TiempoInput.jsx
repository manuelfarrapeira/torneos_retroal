import { useEffect, useRef, useState } from 'react'

// Entrada de tiempo por partes (minutos/segundos/milésimas) para forzar
// siempre el mismo formato "M:SS.mmm" en vez de un texto libre propenso a errores.
export function soloDigitos(v) { return v.replace(/[^0-9]/g, '') }
// El usuario escribe con coma decimal (formato español); internamente se guarda con
// punto porque así lo espera el backend (is_numeric de PHP requiere punto).
export function soloNumeroComa(v) {
  let limpio = v.replace(/[^0-9,]/g, '')
  const partes = limpio.split(',')
  if (partes.length > 2) limpio = partes[0] + ',' + partes.slice(1).join('')
  return limpio
}

export function TiempoInput({ value, onChange }) {
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
