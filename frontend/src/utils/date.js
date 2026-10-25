export function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

// Skin de Halloween activa cada año del 26 de octubre al 1 de noviembre (el 2 de noviembre ya no)
export function esTemporadaHalloween(fecha = new Date()) {
  const mes = fecha.getMonth() + 1
  const dia = fecha.getDate()
  return (mes === 10 && dia >= 26) || (mes === 11 && dia < 2)
}

// Skin de Navidad activa cada año del 20 de diciembre al 6 de enero (el 7 de enero ya no).
// Previsualización fuera de fechas: abrir la web con ?skin=navidad.
export function esTemporadaNavidad(fecha = new Date()) {
  const mes = fecha.getMonth() + 1
  const dia = fecha.getDate()
  if ((mes === 12 && dia >= 20) || (mes === 1 && dia < 7)) return true
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('skin') === 'navidad'
}

export function fechaLarga(iso) {
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}
