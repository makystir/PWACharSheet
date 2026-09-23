/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { swPrecachePlugin } from './src/build/vite-plugin-sw-precache'

// https://vite.dev/config/
export default defineConfig({
  base: '/PWACharSheet/',
  plugins: [
    react(),
    swPrecachePlugin({
      swSrc: 'src/sw.ts',
      swDest: 'sw.js',
      include: [/\.html$/, /\.css$/, /\.js$/, /\.woff2?$/, /\.json$/, /\.svg$/, /\.png$/],
      exclude: [/\.map$/, /sw\.js$/],
    }),
  ],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          if (id.includes('src/data/')) {
            const file = id.split('src/data/')[1]?.split('.')[0];
            if (['careers', 'talents', 'weapons', 'spells', 'critical-wound-tables', 'diseases'].includes(file)) {
              return `data-${file}`;
            }
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    // Several suites are fast-check property tests that render the full sheet
    // ~100 times per case; under jsdom's DOM env and parallel load these can
    // legitimately exceed the 5s default. 15s leaves ample headroom while still
    // catching a genuinely hung test.
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
})
