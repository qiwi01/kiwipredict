import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://kiwipredict.onrender.com',
        changeOrigin: true,
        secure: true,
      },
      '/health': {
        target: 'https://kiwipredict.onrender.com',
        changeOrigin: true,
        secure: true,
      },
      '/wakeup': {
        target: 'https://kiwipredict.onrender.com',
        changeOrigin: true,
        secure: true,
      }
    }
  }
})
