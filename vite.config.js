import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }

          if (id.includes('react-signature-canvas') || id.includes('signature_pad')) {
            return 'signature'
          }

          if (id.includes('@supabase/')) {
            return 'supabase'
          }

          if (id.includes('framer-motion')) {
            return 'motion'
          }

          if (id.includes('react-router') || id.includes('react-dom') || id.includes(`${path.sep}react${path.sep}`)) {
            return 'react-core'
          }

          if (id.includes('lucide-react')) {
            return 'icons'
          }
        }
      }
    }
  }
})
