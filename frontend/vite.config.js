import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use environment variable or default to localhost for development
const API_TARGET = process.env.VITE_API_PROXY_TARGET || 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true
    },
    // The UI calls the API on its own origin by default, so these routes are
    // proxied to the backend (FastAPI's interactive docs included).
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/docs': { target: API_TARGET, changeOrigin: true },
      '/openapi.json': { target: API_TARGET, changeOrigin: true },
    }
  }
})
