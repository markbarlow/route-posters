import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { buildSampleProject } from './samples';
import { SAMPLE_GALLERY, SPLASH_POSTERS } from './showcase';
import { saveProject } from './store/persistence';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element is missing from index.html');

if (import.meta.env.DEV) {
  // Hook used by scripts/render-showcase.mjs to put the editor into a known state without
  // clicking through the UI. Dev only — the branch is compiled out of production builds.
  (window as unknown as Record<string, unknown>).__routePosters = {
    buildSampleProject,
    saveProject,
    // Exposed so the generator reads the real manifest rather than parsing the source file.
    // Kept in two groups so it can regenerate the gallery without touching supplied artwork.
    showcase: { splash: SPLASH_POSTERS, gallery: SAMPLE_GALLERY },
  };
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
