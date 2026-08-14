/** A GPS position as [longitude, latitude] in degrees. */
export type LngLat = [number, number];

/**
 * One activity, normalised from whatever source it came from. Everything downstream — geometry,
 * templates, rendering, export — reads this shape and nothing else, so adding a new import
 * format only ever means writing a new parser that returns one of these.
 */
export interface Activity {
  id: string;
  source: 'strava' | 'file';
  /** Title as it arrived from the source. Per-poster overrides live on the Slot, not here. */
  name: string;
  /** Run | Ride | Swim | Hike | Walk | ... — used to pick pace vs speed formatting. */
  sportType: string;
  /** ISO-8601 local start time, or null when the file carried no timestamps. */
  startDateLocal: string | null;
  distanceM: number;
  movingTimeS: number;
  elapsedTimeS: number;
  elevationGainM: number | null;
  locationName?: string;
  coords: LngLat[];
  /** When this was pulled from the source. Drives the 7-day eviction of Strava-sourced data. */
  fetchedAt: number;
}

export type Field =
  | 'distance'
  | 'time'
  | 'pace'
  | 'elevation'
  | 'date'
  | 'type'
  | 'location';

export const ALL_FIELDS: Field[] = [
  'distance',
  'time',
  'pace',
  'elevation',
  'date',
  'type',
  'location',
];

export const FIELD_LABELS: Record<Field, string> = {
  distance: 'Distance',
  time: 'Time',
  pace: 'Pace',
  elevation: 'Elevation',
  date: 'Date',
  type: 'Activity type',
  location: 'Location',
};

/** One activity's placement on the poster, plus the per-activity display choices. */
export interface Slot {
  activityId: string;
  /** When set, replaces Activity.name on this poster only. */
  titleOverride?: string;
  fields: Field[];
  /** Per-slot multiplier on route stroke weight, for tuning dense vs sparse tracks. */
  strokeScale?: number;
}

export type Units = 'metric' | 'imperial';

export interface PaperSize {
  id: string;
  name: string;
  /** Portrait dimensions in millimetres; orientation is applied separately. */
  widthMm: number;
  heightMm: number;
}

export interface Theme {
  id: string;
  name: string;
  background: string;
  route: string;
  text: string;
  /** Lower-emphasis text: stat labels, footer. */
  muted: string;
  /** Optional accent for rules and start markers; falls back to the route colour. */
  accent?: string;
}

export interface Poster {
  paperId: string;
  orientation: 'portrait' | 'landscape';
  bleedMm: number;
  templateId: string;
  themeId: string;
  units: Units;
  /**
   * When true every cell shares one metres-per-millimetre scale, so a 5k reads as visibly
   * shorter than a marathon instead of each route being stretched to fill its own cell.
   */
  normalizeScale: boolean;
  showCellTitles: boolean;
  header: { show: boolean; title: string; subtitle: string };
  footer: { show: boolean; text: string; showPoweredByStrava: boolean };
  slots: Slot[];
}

/** A rectangle in millimetres on the poster page. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
