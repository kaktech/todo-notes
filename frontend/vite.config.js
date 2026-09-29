import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In production, the frontend calls the backend via VITE_API_URL env var.
// Set this in Vercel project settings to your backend URL (e.g. https://your-app.onrender.com).
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
