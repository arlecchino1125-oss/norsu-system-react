import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(appRoot, '../../..');

export default defineConfig({
  root: appRoot,
  envDir: workspaceRoot,
  publicDir: path.resolve(workspaceRoot, 'public'),
  cacheDir: path.resolve(workspaceRoot, 'node_modules/.vite/student'),
  plugins: [react()],
  server: {
    fs: {
      allow: [workspaceRoot],
    },
  },
  preview: {
    port: 4174,
  },
  build: {
    outDir: path.resolve(workspaceRoot, 'dist-student'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');

          if (!normalizedId.includes('/node_modules/')) {
            return;
          }

          if (normalizedId.includes('react-signature-canvas') || normalizedId.includes('signature_pad')) {
            return 'signature';
          }

          if (normalizedId.includes('@supabase/')) {
            return 'supabase';
          }

          if (normalizedId.includes('framer-motion')) {
            return 'motion';
          }

          if (
            normalizedId.includes('/react-router') ||
            normalizedId.includes('/react-dom/') ||
            normalizedId.includes('/react/jsx-runtime') ||
            normalizedId.includes('/react/jsx-dev-runtime') ||
            normalizedId.includes('/react/')
          ) {
            return 'react-core';
          }

          if (normalizedId.includes('lucide-react')) {
            return 'icons';
          }
        },
      },
    },
  },
});
