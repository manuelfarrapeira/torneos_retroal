import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Rutas relativas en el build -> portable a cualquier subcarpeta del NAS.
  base: './',
  server: {
    // En desarrollo, redirige /api al servidor PHP local (php -S localhost:8000).
    proxy: {
      '/api': 'http://localhost:8000',
      '/uploads': 'http://localhost:8000',
    },
  },
})
