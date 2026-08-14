import type { Theme } from '../types';

/**
 * Poster palettes. Each is a background, a route colour, and two levels of text emphasis.
 *
 * The route is the only saturated element on the page — the whole composition depends on the
 * eye going to the line first and the numbers second, so labels sit at low contrast on purpose.
 */
export const THEMES: Theme[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    background: '#0e1116',
    route: '#f6f7f9',
    text: '#f6f7f9',
    muted: '#7d8794',
    accent: '#fc5200',
  },
  {
    id: 'paper',
    name: 'Paper',
    background: '#f4f1ea',
    route: '#16181d',
    text: '#16181d',
    muted: '#83807a',
    accent: '#b4531f',
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    background: '#0f2b46',
    route: '#7fd4f5',
    text: '#eaf6fd',
    muted: '#7595b1',
    accent: '#7fd4f5',
  },
  {
    id: 'heat',
    name: 'Heat',
    background: '#17151a',
    route: '#fc5200',
    text: '#f7f2ee',
    muted: '#8a7f78',
    accent: '#ffb547',
  },
  {
    id: 'sage',
    name: 'Sage',
    background: '#e6e9e1',
    route: '#2f4234',
    text: '#22301f',
    muted: '#7b8878',
    accent: '#5c7a52',
  },
  {
    id: 'noir',
    name: 'Noir',
    background: '#fbfbfb',
    route: '#c8102e',
    text: '#121212',
    muted: '#8a8a8a',
    accent: '#c8102e',
  },
];

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/**
 * Typography. Bebas Neue carries titles — condensed, all-caps, and unmistakably poster-like —
 * while Inter handles stats, where legibility at 6pt and tabular figures matter more than
 * character.
 */
export const FONTS = {
  display: 'PosterDisplay',
  body: 'PosterBody',
} as const;

/** Font assets, resolved against Vite's base path so they work under the Pages sub-path. */
export const FONT_FILES = [
  { family: FONTS.body, weight: 400, woff2: 'fonts/inter-400.woff2', ttf: 'fonts/inter-400.ttf' },
  { family: FONTS.body, weight: 700, woff2: 'fonts/inter-700.woff2', ttf: 'fonts/inter-700.ttf' },
  {
    family: FONTS.display,
    weight: 400,
    woff2: 'fonts/bebas-400.woff2',
    ttf: 'fonts/bebas-400.ttf',
  },
] as const;

export const fontUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;
