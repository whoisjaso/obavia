import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The app ships as static files inside the site, at /app/ (Cloudflare Pages, no build step there).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: '../obavia-co/app', emptyOutDir: true, assetsDir: 'assets' },
});
