/**
 * Manifest for the images shown on the splash and samples pages.
 *
 * Images live in `public/showcase/`, so replacing one is replacing a file — nothing here needs
 * editing unless the set itself changes. Regenerate them all with `npm run showcase`.
 */

export interface Preset {
  templateId: string;
  themeId: string;
  paperId: string;
  /** How many of the bundled sample activities the layout needs. */
  activityCount: number;
  /** Overrides the default sample heading, so a row of examples doesn't repeat one title. */
  heading?: { title: string; subtitle: string };
}

export interface ShowcaseItem {
  id: string;
  /** Filename within public/showcase/. */
  image: string;
  title: string;
  /** Describes the poster for screen readers and as the card's caption. */
  description: string;
  preset: Preset;
}

const image = (name: string) => `${import.meta.env.BASE_URL}showcase/${name}`;

export const showcaseImageUrl = image;

/**
 * The three posters fanned on the splash page, most prominent first.
 *
 * PLACEHOLDERS: these are generated from the bundled sample activities. Swap in real posters by
 * replacing the three files in public/showcase/ — keep them portrait and web-sized (~900px tall,
 * under ~250KB), not 300 DPI print exports, or the homepage will crawl.
 */
export const SPLASH_POSTERS: ShowcaseItem[] = [
  {
    id: 'splash-primary',
    image: 'splash-1.png',
    title: 'A year of running, nine routes to a page',
    description: 'Nine running routes in a three-by-three grid on a near-black background.',
    preset: {
      templateId: 'nine',
      themeId: 'midnight',
      paperId: 'a3',
      activityCount: 9,
      heading: { title: '2026 in motion', subtitle: 'Nine days worth remembering' },
    },
  },
  {
    id: 'splash-left',
    image: 'splash-2.png',
    title: 'A single route, given the whole page',
    description: 'One loop printed large in dark ink on warm off-white paper.',
    preset: {
      templateId: 'single',
      themeId: 'paper',
      paperId: 'a3',
      activityCount: 1,
      heading: { title: 'Richmond Park', subtitle: 'The usual Sunday loop' },
    },
  },
  {
    id: 'splash-right',
    image: 'splash-3.png',
    title: 'Six rides in a grid',
    description: 'Six cycling routes in pale blue on a deep blue background.',
    preset: {
      templateId: 'six',
      themeId: 'blueprint',
      paperId: 'a3',
      activityCount: 6,
      heading: { title: 'Spring in the saddle', subtitle: 'Six mornings out' },
    },
  },
];

/** The samples gallery: one card per preset, covering the range of layouts and palettes. */
export const SAMPLE_GALLERY: ShowcaseItem[] = [
  {
    id: 'single-paper',
    image: 'sample-single-paper.png',
    title: 'Single · Paper',
    description: 'One route given the whole page, in ink on warm off-white.',
    preset: { templateId: 'single', themeId: 'paper', paperId: 'a3', activityCount: 1 },
  },
  {
    id: 'triptych-sage',
    image: 'sample-triptych-sage.png',
    title: 'Triptych · Sage',
    description: 'Three routes side by side in deep green on a pale wash.',
    preset: { templateId: 'triptych', themeId: 'sage', paperId: 'a3', activityCount: 3 },
  },
  {
    id: 'quad-blueprint',
    image: 'sample-quad-blueprint.png',
    title: 'Quad · Blueprint',
    description: 'Four routes in a two-by-two block, pale blue on deep blue.',
    preset: { templateId: 'quad', themeId: 'blueprint', paperId: 'a3', activityCount: 4 },
  },
  {
    id: 'feature-noir',
    image: 'sample-feature-noir.png',
    title: 'Feature + three · Noir',
    description: 'One hero route above three smaller ones, in red on white.',
    preset: { templateId: 'feature-three', themeId: 'noir', paperId: 'a3', activityCount: 4 },
  },
  {
    id: 'six-heat',
    image: 'sample-six-heat.png',
    title: 'Six · Heat',
    description: 'Six routes in orange on charcoal.',
    preset: { templateId: 'six', themeId: 'heat', paperId: 'a3', activityCount: 6 },
  },
  {
    id: 'nine-midnight',
    image: 'sample-nine-midnight.png',
    title: 'Nine · Midnight',
    description: 'Nine routes in a three-by-three grid, white on near-black.',
    preset: { templateId: 'nine', themeId: 'midnight', paperId: 'a3', activityCount: 9 },
  },
];
