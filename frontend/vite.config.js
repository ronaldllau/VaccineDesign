import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Get backend API URL from environment or default to localhost
const apiHost = process.env.API_HOST || 'localhost';
const apiPort = process.env.FLASK_PORT || '8080';
const apiUrl = `http://${apiHost}:${apiPort}`;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    proxy: {
      '/predict': apiUrl,
      '/api': apiUrl
    }
  }
})
