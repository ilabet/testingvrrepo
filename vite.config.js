import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// `npm run dev` forwards the bridge routes to a local bridge (cd railway && npm run demo).
const BRIDGE = process.env.BRIDGE_URL || 'http://localhost:8080'
const bridgeRoutes = ['/login', '/health', '/config', '/asset', '/alert', '/vendor', '/standalone']

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: {
    proxy: {
      ...Object.fromEntries(bridgeRoutes.map((r) => [r, BRIDGE])),
      '/stream': { target: BRIDGE, ws: true },
    },
  },
})
