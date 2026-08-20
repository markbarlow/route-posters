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
  /**
   * Which sample activities to place, by id, in the order they should appear. Naming them rather
   * than counting them matters once the pool is mixed: "the first two" would drop a marathon into
   * a poster about alpine climbs.
   */
  activities: string[];
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
      activities: ['boston', 'london', 'berlin', 'barcelona', 'manchester', 'edinburgh', 'york', 'newport', 'dorney'],
      heading: { title: 'Going the distance', subtitle: 'Nine marathons, one wall' },
    },
  },
  {
    id: 'splash-left',
    image: 'splash-2.png',
    title: 'Classic climbs',
    description: "Two Alpine climbs, Alpe d'Huez and Ventoux, traced in red on white.",
    preset: {
      templateId: 'stacked-pair',
      themeId: 'noir',
      paperId: 'a3',
      activities: ['ventoux', 'alpe'],
      heading: { title: 'Classic climbs', subtitle: 'The great ascents' },
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
      activities: ['london', 'berlin', 'barcelona', 'manchester', 'edinburgh', 'york'],
      heading: { title: 'Cities in motion', subtitle: 'Six marathon mornings' },
    },
  },
];

/**
 * The samples gallery: one card per preset, chosen so each layout is shown doing what it is good
 * at rather than being handed an arbitrary number of routes.
 *
 * Headings are subject-led and carry no dates — these sit on the site indefinitely, and a caption
 * naming a year starts looking stale the moment it turns.
 */
export const SAMPLE_GALLERY: ShowcaseItem[] = [
  {
    id: 'single-paper',
    image: 'sample-single-paper.png',
    title: 'Single · Paper',
    description:
      "Alpe d'Huez given the whole page, its twenty-one hairpins in dark ink on warm off-white.",
    preset: {
      templateId: 'single',
      themeId: 'paper',
      paperId: 'a3',
      activities: ['alpe'],
      heading: { title: "Alpe d'Huez", subtitle: 'Twenty-one hairpins' },
    },
  },
  {
    id: 'pair-noir',
    image: 'sample-pair-noir.png',
    title: 'Stacked pair · Noir',
    description: 'Mont Ventoux above Alpe d\'Huez, both climbs traced in red on white.',
    preset: {
      templateId: 'stacked-pair',
      themeId: 'noir',
      paperId: 'a3',
      activities: ['ventoux', 'alpe'],
      heading: { title: 'Classic climbs', subtitle: 'The great ascents' },
    },
  },
  {
    id: 'triptych-sage',
    image: 'sample-triptych-sage.png',
    title: 'Triptych · Sage',
    description:
      'London, Berlin and Barcelona marathons stacked down the page in deep green on a pale wash.',
    preset: {
      templateId: 'triptych',
      themeId: 'sage',
      paperId: 'a3',
      activities: ['london', 'berlin', 'barcelona'],
      heading: { title: 'Three cities', subtitle: 'London · Berlin · Barcelona' },
    },
  },
  {
    id: 'feature-blueprint',
    image: 'sample-feature-blueprint.png',
    title: 'Feature + three · Blueprint',
    description:
      'The London marathon large above Boston, York and Edinburgh, pale blue on deep blue.',
    preset: {
      templateId: 'feature-three',
      themeId: 'blueprint',
      paperId: 'a3',
      activities: ['london', 'boston', 'york', 'edinburgh'],
      heading: { title: 'Home roads', subtitle: 'Four British marathons' },
    },
  },
  {
    id: 'six-heat',
    image: 'sample-six-heat.png',
    title: 'Six · Heat',
    description: 'Six marathon routes in orange on charcoal.',
    preset: {
      templateId: 'six',
      themeId: 'heat',
      paperId: 'a3',
      activities: ['london', 'berlin', 'barcelona', 'manchester', 'newport', 'dorney'],
      heading: { title: 'Six starts', subtitle: 'One finish line after another' },
    },
  },
  {
    id: 'nine-midnight',
    image: 'sample-nine-midnight.png',
    title: 'Nine · Midnight',
    description:
      'Nine marathon routes in a three-by-three grid, white on near-black — the year-in-runs wall piece.',
    preset: {
      templateId: 'nine',
      themeId: 'midnight',
      paperId: 'a3',
      activities: ['boston', 'london', 'berlin', 'barcelona', 'manchester', 'edinburgh', 'york', 'newport', 'dorney'],
      heading: { title: 'Going the distance', subtitle: 'Nine marathons, one wall' },
    },
  },
];
