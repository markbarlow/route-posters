/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// `base` must match the GitHub Pages project path (https://<user>.github.io/strava-posters/).
// Everything that references an asset at runtime goes through import.meta.env.BASE_URL so a
// change here propagates without hunting for hardcoded paths.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/strava-posters/',
  plugins: [react()],
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
