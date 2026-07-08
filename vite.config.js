import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// Only upload source maps when a Sentry auth token is present (e.g. in the
// Vercel production build). Local and CI builds without the token are
// unaffected and skip source-map generation entirely.
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN
const enableSentrySourceMaps = Boolean(sentryAuthToken)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ...(enableSentrySourceMaps
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: sentryAuthToken,
            // Uploaded maps are deleted from the build output afterwards so
            // they are never served to browsers.
            sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
          }),
        ]
      : []),
  ],
  build: {
    sourcemap: enableSentrySourceMaps ? 'hidden' : false,
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
