import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The app is its own deploy (app.obavia.co), separate from the marketing site in ../obavia-co.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist', emptyOutDir: true, assetsDir: 'assets' },
});
