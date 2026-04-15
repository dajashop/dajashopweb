import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');

          if (!normalizedId.includes('/node_modules/')) return;

          if (
            normalizedId.includes('/node_modules/react/') ||
            normalizedId.includes('/node_modules/react-dom/') ||
            normalizedId.includes('/node_modules/react-router-dom/')
          ) {
            return 'vendor-react';
          }

          if (
            normalizedId.includes('/node_modules/firebase/') ||
            normalizedId.includes('/node_modules/@firebase/')
          ) {
            if (
              normalizedId.includes('/auth/') ||
              normalizedId.includes('/firebase/auth')
            ) {
              return 'vendor-firebase-auth';
            }

            if (
              normalizedId.includes('/firestore/') ||
              normalizedId.includes('/firebase/firestore')
            ) {
              return 'vendor-firebase-firestore';
            }

            if (
              normalizedId.includes('/functions/') ||
              normalizedId.includes('/firebase/functions')
            ) {
              return 'vendor-firebase-functions';
            }

            if (
              normalizedId.includes('/storage/') ||
              normalizedId.includes('/firebase/storage')
            ) {
              return 'vendor-firebase-storage';
            }

            if (
              normalizedId.includes('/analytics/') ||
              normalizedId.includes('/firebase/analytics')
            ) {
              return 'vendor-firebase-analytics';
            }

            if (
              normalizedId.includes('/app-check/') ||
              normalizedId.includes('/firebase/app-check')
            ) {
              return 'vendor-firebase-app-check';
            }

            return 'vendor-firebase-core';
          }

          if (normalizedId.includes('/node_modules/lucide-react/')) {
            return 'vendor-icons';
          }

          if (normalizedId.includes('/node_modules/framer-motion/')) {
            return 'vendor-motion';
          }

          if (
            normalizedId.includes('/node_modules/three/') ||
            normalizedId.includes('/node_modules/@react-three/fiber/') ||
            normalizedId.includes('/node_modules/@react-three/drei/')
          ) {
            return 'vendor-three';
          }

          if (normalizedId.includes('/node_modules/exceljs/')) {
            return 'vendor-exceljs';
          }
        },
      },
    },
  },
});
