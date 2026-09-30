export function formatearValorParam(parametro, valores) {
  const v = (valores || []).find((x) => x.parametro_id === parametro.parametro_id)
  if (!v || v.valor_texto == null) return ''
  return parametro.tipo === 'numero' ? Number(v.valor_num).toLocaleString() : v.valor_texto
}

// Salto de línea en tabla clasificación para nombres de más de 20 caracteres (máximo 2 líneas, 1 solo salto en el primer espacio tras el carácter 20)
export function formatearNombreJuegoClasificacion(nombre) {
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
