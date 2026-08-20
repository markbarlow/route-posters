/**
 * Manifest for the images shown on the splash and samples pages.
 *
 * Images live in `public/showcase/`, so replacing one is replacing a file — nothing here needs
 * editing unless the set itself changes. Regenerate the gallery with `npm run showcase`.
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
 * These are real posters. Replacing one is replacing a file in public/showcase/ — keep it portrait
 * (the fan frames them at A3 aspect and crops anything else) and web-sized at roughly 900x1273,
 * not a 300 DPI print export, or the homepage will crawl.
 *
 * `description` is the image's alt text, so it must be updated alongside the artwork. The presets
 * are only consulted by `npm run showcase -- --splash`, which redraws placeholders from scratch.
 */
export const SPLASH_POSTERS: ShowcaseItem[] = [
  {
    id: 'splash-primary',
    image: 'splash-1.png',
    title: 'Going the distance',
    description:
      'Nine marathon routes — London, Barcelona, Berlin and more — in a three-by-three grid, '
      + 'white on near-black.',
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
    title: 'Classic climbs',
    description: "Two Alpine climbs, Alpe d'Huez and Ventoux, traced in red on white.",
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
    title: 'Cities in motion',
    description: 'Marathon routes in pale blue on a deep blue background.',
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
