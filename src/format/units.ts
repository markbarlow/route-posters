import type { Units } from '../types';

const M_PER_MILE = 1609.344;
const M_PER_FOOT = 0.3048;

/** Sports measured by speed rather than pace — a cyclist thinks in km/h, a runner in min/km. */
const SPEED_SPORTS = new Set([
  'ride',
  'virtualride',
  'ebikeride',
  'mountainbikeride',
  'gravelride',
  'handcycle',
  'velomobile',
  'kayaking',
  'canoeing',
  'rowing',
  'virtualrow',
  'sail',
  'windsurf',
  'kitesurf',
  'snowboard',
  'alpineski',
  'inlineskate',
  'iceskate',
  'skateboard',
]);

/** Swimming is universally quoted per 100m / per 100y. */
const SWIM_SPORTS = new Set(['swim', 'openwaterswim', 'virtualswim']);

export type PaceStyle = 'pace' | 'speed' | 'swim';

export function paceStyleFor(sportType: string): PaceStyle {
  const key = sportType.toLowerCase().replace(/[\s_-]/g, '');
  if (SWIM_SPORTS.has(key)) return 'swim';
  if (SPEED_SPORTS.has(key)) return 'speed';
  return 'pace';
}

export function formatDistance(meters: number, units: Units): string {
  if (units === 'imperial') {
    const miles = meters / M_PER_MILE;
    return `${miles.toFixed(miles < 100 ? 2 : 1)} mi`;
  }
  const km = meters / 1000;
  return `${km.toFixed(km < 100 ? 2 : 1)} km`;
}

export function formatElevation(meters: number | null, units: Units): string {
  if (meters === null) return '—';
  return units === 'imperial'
    ? `${Math.round(meters / M_PER_FOOT).toLocaleString('en-US')} ft`
    : `${Math.round(meters).toLocaleString('en-US')} m`;
}

/** h:mm:ss, dropping the hours component when there isn't one. */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * Pace or speed, chosen by sport. Returns an em dash rather than Infinity when an activity has
 * no distance or no moving time — a manually-entered gym session, say.
 */
export function formatPace(
  meters: number,
  seconds: number,
  units: Units,
  sportType: string,
): string {
  if (meters <= 0 || seconds <= 0) return '—';
  const style = paceStyleFor(sportType);

  if (style === 'speed') {
    const speed =
      units === 'imperial' ? meters / M_PER_MILE / (seconds / 3600) : meters / 1000 / (seconds / 3600);
    return `${speed.toFixed(1)} ${units === 'imperial' ? 'mph' : 'km/h'}`;
  }

  if (style === 'swim') {
    const per100 = units === 'imperial' ? (seconds / (meters / 0.9144)) * 100 : (seconds / meters) * 100;
    return `${formatDuration(per100)} /100${units === 'imperial' ? 'y' : 'm'}`;
  }

  const perUnit = units === 'imperial' ? seconds / (meters / M_PER_MILE) : seconds / (meters / 1000);
  return `${formatDuration(perUnit)} /${units === 'imperial' ? 'mi' : 'km'}`;
}

export function paceLabel(sportType: string): string {
  const style = paceStyleFor(sportType);
  return style === 'speed' ? 'Avg speed' : 'Avg pace';
}

/** Splits "VirtualRide" / "virtual_ride" into "Virtual Ride" for display. */
export function formatSportType(sportType: string): string {
  return sportType
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
