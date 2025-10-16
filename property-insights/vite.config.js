// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Browser calls /api/... -> Vite forwards to https://www.microburbs.com.au/report_generator/api/...
      '/api': {
        target: 'https://www.microburbs.com.au',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, '/report_generator/api'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // add auth header only on the server side
            proxyReq.setHeader('Authorization', 'Bearer test')
            proxyReq.setHeader('Content-Type', 'application/json')
          })
        },
      },
    },
  },
})
