import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The proxy forwards /api calls to the backend on port 8000
// so the frontend can use relative URLs (no CORS issues)
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
