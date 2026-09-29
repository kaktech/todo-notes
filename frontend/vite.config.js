import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In production on Vercel, the frontend calls /api with relative paths.
// Vercel's rewrite rules route /api/* to the backend service.
// In local dev, the proxy forwards /api to the backend on port 8000.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
