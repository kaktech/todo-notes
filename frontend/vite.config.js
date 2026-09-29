import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// On Vercel the backend runs as a function on the same site, so the frontend calls relative /api.
// VITE_API_URL is only needed if the backend is hosted somewhere else.
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
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || ''),
  },
})
