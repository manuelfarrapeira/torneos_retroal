import { useEffect, useState } from 'react'

export function esMediaMp4(url) {
  if (!url) return false
  const lower = url.toLowerCase()
  return lower.endsWith('.mp4') || lower.startsWith('data:video/mp4')
}

// Componente para cargar imágenes y vídeos MP4 de forma asíncrona sin bloquear el renderizado ni peticiones de la API,
// mostrando un pequeño spinner neon mientras se descarga la imagen o vídeo.
export function AsyncImage({ src, alt = '', className = '', style = {} }) {
  const isVideo = esMediaMp4(src)
  const [cargado, setCargado] = useState(isVideo)
  const [error, setError] = useState(false)

  useEffect(() => {
    setCargado(isVideo)
    setError(false)
  }, [src, isVideo])

  if (!src || error) return null

  return (
    <div className="async-img-wrapper" style={style}>
      {!cargado && (
        <div className="async-img-spinner-overlay">
          <div className="async-img-spinner" />
        </div>
      )}
      {isVideo ? (
        <video
          src={src}
          autoPlay
          muted
          playsInline
          preload="auto"
          onCanPlay={() => setCargado(true)}
          onLoadedData={() => setCargado(true)}
          onTimeUpdate={(e) => {
            const v = e.target
            if (v.duration && v.currentTime >= v.duration - 0.12) {
              v.currentTime = 0
            }
          }}
          onEnded={(e) => {
            const v = e.target
            v.currentTime = 0
            v.play().catch(() => {})
          }}
          onError={() => setError(true)}
          className={className}
          style={{
            opacity: cargado ? 1 : 0.4,
            transition: 'opacity 0.2s ease-in'
          }}
        />
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setCargado(true)}
          onError={() => setError(true)}
          className={className}
          style={{
            opacity: cargado ? 1 : 0.2,
            transition: 'opacity 0.25s ease-in'
          }}
        />
      )}
    </div>
  )
}
