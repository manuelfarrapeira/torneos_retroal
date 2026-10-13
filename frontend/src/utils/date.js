export function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

// Skin de Halloween activa cada año del 28 de octubre al 1 de noviembre (el 2 de noviembre ya no)
export function esTemporadaHalloween(fecha = new Date()) {
  const mes = fecha.getMonth() + 1
  const dia = fecha.getDate()
  return (mes === 10 && dia >= 28) || (mes === 11 && dia < 2)
}

export function fechaLarga(iso) {
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}
