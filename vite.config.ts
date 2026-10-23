import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // This repository is published at /pen-2/ on GitHub Pages.
  // Vite rewrites built JS, CSS and public asset paths to this base.
  base: '/pen-2/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
