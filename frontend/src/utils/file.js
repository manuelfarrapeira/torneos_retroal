export function fileToDataUrl(file) {
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
