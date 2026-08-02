import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  // @freshcart/ui and @freshcart/types are linked workspace packages that ship
  // compiled CommonJS output. Vite serves linked packages as raw source via
  // /@fs/ by default (skipping the esbuild CJS->ESM interop it applies to
  // regular node_modules deps), so the browser's native ESM loader can't see
  // their `exports.X = ...` assignments as named exports. Forcing them through
  // optimizeDeps applies the same interop regular dependencies get.
  optimizeDeps: {
    include: ['@freshcart/ui', '@freshcart/types'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

