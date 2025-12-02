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
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      }
    }
  }
})
