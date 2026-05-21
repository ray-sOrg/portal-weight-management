import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/react') || id.includes('/node_modules/react-dom')) return 'react'
          if (id.includes('/node_modules/@tanstack/')) return 'tanstack'
          if (id.includes('/node_modules/recharts')) return 'charts'
          return undefined
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'https://api.tt829.cn',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
