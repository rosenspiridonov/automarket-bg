import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 6173,
    proxy: {
      '/api': {
        target: 'https://localhost:44363',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
