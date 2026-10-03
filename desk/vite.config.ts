/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// Obavia Desk: the dealership sale desk (Handle A Sale). Its own deploy.
export default defineConfig({
  // Tailwind compiles only src/paper/paper.css (the production paper), which loads inside the paper frame
  plugins: [react(), tailwindcss()],
  base: './',
  // '@/…' is the src root, so the form engine ported from the production desk keeps its imports
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { outDir: 'dist', emptyOutDir: true, assetsDir: 'assets' },
  test: { setupFiles: ['./src/test-setup.ts'] },
});
