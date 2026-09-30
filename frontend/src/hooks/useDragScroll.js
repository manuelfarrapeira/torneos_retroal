import { useRef } from 'react'

// Permite arrastrar con el ratón para hacer scroll horizontal en un contenedor con overflow.
export function useDragScroll() {
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
