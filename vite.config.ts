/// <reference types="vitest/config" />
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * GitHub Pages has no server-side rewrites, so a direct hit on /strava-posters/create would 404
 * instead of loading the app. Pages serves 404.html for any unmatched path, so shipping a copy of
 * index.html under that name lets the app boot and lets the router read the URL. No redirect
 * dance needed — the page that loads is simply the app.
 */
function pagesSpaFallback(): Plugin {
  return {
    name: 'pages-spa-fallback',
    apply: 'build',
    closeBundle() {
      const dir = resolve(import.meta.dirname, 'dist');
      copyFileSync(resolve(dir, 'index.html'), resolve(dir, '404.html'));
    },
  };
}

// `base` must match the GitHub Pages project path (https://<user>.github.io/strava-posters/).
// Everything that references an asset at runtime goes through import.meta.env.BASE_URL so a
// change here propagates without hunting for hardcoded paths.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/strava-posters/',
  plugins: [react(), pagesSpaFallback()],
  build: {
    // Poster exports pull whole font files into memory; a slightly larger warning limit keeps
    // the build output readable.
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
