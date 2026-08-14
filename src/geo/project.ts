import type { LngLat } from '../types';

/**
 * Web Mercator is defined against the WGS84 equatorial radius, so projection must use this
 * value to stay consistent with every other map of the same data.
 */
const MERCATOR_R = 6378137;

/**
 * Distance, by contrast, wants the mean radius. Using the equatorial figure would inflate every
 * measurement by about 0.11% — roughly 46 metres on a marathon, which is enough to make a
 * printed poster disagree with what Strava reported.
 */
const MEAN_R = 6371008.8;

const MAX_LAT = 85.05112878;

export interface Point {
  x: number;
  y: number;
}

/**
 * Web Mercator projection, metres. Mercator is the right choice here despite its area
 * distortion: it is conformal, so at the scale of a single activity the route keeps the shape
 * you saw on Strava rather than being subtly sheared.
 *
 * Y is negated so that increasing y points down, matching SVG's coordinate system.
 */
export function project([lon, lat]: LngLat): Point {
  const clamped = Math.max(Math.min(lat, MAX_LAT), -MAX_LAT);
  const rad = (clamped * Math.PI) / 180;
  return {
    x: (MERCATOR_R * lon * Math.PI) / 180,
    y: -MERCATOR_R * Math.log(Math.tan(Math.PI / 4 + rad / 2)),
  };
}

export function projectAll(coords: LngLat[]): Point[] {
  return coords.map(project);
}

/**
 * Great-circle distance in metres. Used to derive distance from raw tracks when a file
 * carries no summary — accurate to well under a percent at activity scale, where the
 * ellipsoidal correction is far smaller than GPS noise.
 */
export function haversine(a: LngLat, b: LngLat): number {
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dLon / 2) ** 2;
  return 2 * MEAN_R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Total length of a track in metres. */
export function trackLength(coords: LngLat[]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) total += haversine(coords[i - 1], coords[i]);
  return total;
}

/**
 * Mercator's scale factor grows with latitude, so a metre of projected space is worth less
 * real distance the further you are from the equator. Dividing by this converts projected
 * units to true ground metres, which is what makes `normalizeScale` honest across activities
 * recorded in different parts of the world.
 */
export function mercatorScaleFactor(lat: number): number {
  const clamped = Math.max(Math.min(lat, MAX_LAT), -MAX_LAT);
  return 1 / Math.cos((clamped * Math.PI) / 180);
}
