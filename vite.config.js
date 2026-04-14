import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/')

          if (!normalizedId.includes('/node_modules/')) {
            return
          }

          if (normalizedId.includes('react-signature-canvas') || normalizedId.includes('signature_pad')) {
            return 'signature'
          }

          if (normalizedId.includes('@supabase/')) {
            return 'supabase'
          }

          if (normalizedId.includes('framer-motion')) {
            return 'motion'
          }

          if (
            normalizedId.includes('/react-router') ||
            normalizedId.includes('/react-dom/') ||
            normalizedId.includes('/react/jsx-runtime') ||
            normalizedId.includes('/react/jsx-dev-runtime') ||
            normalizedId.includes('/react/')
          ) {
            return 'react-core'
          }

          if (normalizedId.includes('lucide-react')) {
            return 'icons'
          }
        }
      }
    }
  }
})
