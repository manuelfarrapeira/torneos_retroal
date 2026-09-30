import { useRef, useState } from 'react'

// Componente de Zona de Arrastre (Drag and Drop) para subir imágenes y vídeos
export function DropZone({ onFileSelect, accept = 'image/*', children, className = '' }) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)

  function handleDragOver(e) {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragging) setIsDragging(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget.contains(e.relatedTarget)) return
    setIsDragging(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  return (
    <div
      className={`dropzone-container ${isDragging ? 'dragging' : ''} ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFileSelect(file)
        }}
        hidden
      />
      {isDragging && (
        <div className="dropzone-overlay">
          <span>📥 ¡SUELTA AQUÍ EL ARCHIVO!</span>
        </div>
      )}
      {children}
    </div>
  )
}
