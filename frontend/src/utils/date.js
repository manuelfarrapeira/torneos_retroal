export function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export function fechaLarga(iso) {
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}
