import { defineConfig } from 'vite';

// Project Pages site: https://pidpod.github.io/gem-front/
export default defineConfig({
  base: '/gem-front/',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
