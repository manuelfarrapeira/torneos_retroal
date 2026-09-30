import { PixelSprite, spriteForGame } from '../sprites/PixelSprite'

// Miniatura de un juego: usa el logo subido o, si no hay, un sprite pixel-art.
// prioridad="baja" se usa en la marquesina: evita que sus imágenes compitan por
// conexiones de red con las llamadas a la API (JSON) que cargan al mismo tiempo.
export function LogoThumb({ juego, size = 4, prioridad = 'auto' }) {
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
