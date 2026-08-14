import type { LngLat } from '../types';
import { haversine } from '../geo/project';

/**
 * A pause longer than this is treated as the recording being stopped rather than the athlete
 * standing still, so the gap contributes to moving time not at all.
 */
const MAX_GAP_S = 60;

/** Below this the athlete is stopped at a junction, not moving. */
const MOVING_SPEED_MS = 0.3;

/**
 * Ignore elevation changes smaller than this between samples. Barometric and GPS altitude both
 * jitter by a metre or two at rest, and summing that noise raw can invent hundreds of metres of
 * "climb" on a completely flat ride.
 */
const ELEVATION_NOISE_M = 1.5;

/**
 * One recorded trackpoint. Parsers emit these and nothing else, which keeps position, time and
 * elevation travelling together — the alternative, parallel arrays, silently misaligns the
 * moment any cleaning step drops a sample.
 */
export interface Sample {
  coord: LngLat;
  /** Epoch milliseconds, or null when the file carried no timestamps. */
  time: number | null;
  elevation: number | null;
}

export interface DerivedStats {
  distanceM: number;
  movingTimeS: number;
  elapsedTimeS: number;
  elevationGainM: number | null;
}

/**
 * Drop samples that would distort the poster: bad numbers, out-of-range coordinates, repeated
 * identical fixes, and the occasional null-island (0,0) fix devices emit before satellite lock.
 * One of those left in place drags the map bounds into the Atlantic and shrinks the real route
 * to a dot in the corner.
 */
export function cleanSamples(samples: Sample[]): Sample[] {
  const out: Sample[] = [];
  for (const s of samples) {
    const [lon, lat] = s.coord ?? [];
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    if (Math.abs(lon) > 180 || Math.abs(lat) > 90) continue;
    if (lon === 0 && lat === 0) continue;
    const prev = out[out.length - 1];
    if (prev && prev.coord[0] === lon && prev.coord[1] === lat) continue;
    out.push(s);
  }
  return out;
}

/**
 * Derive summary stats from raw samples. Used when a file carries no summary of its own —
 * plain GPX from most sources — and as a fallback for individual missing fields.
 */
export function deriveStats(samples: Sample[]): DerivedStats {
  let distanceM = 0;
  let movingTimeS = 0;
  let elevationGainM = 0;
  let sawElevation = false;
  let lastElevation: number | null = null;

  for (let i = 1; i < samples.length; i++) {
    const step = haversine(samples[i - 1].coord, samples[i].coord);
    distanceM += step;

    const t0 = samples[i - 1].time;
    const t1 = samples[i].time;
    if (t0 !== null && t1 !== null) {
      const dt = (t1 - t0) / 1000;
      if (dt > 0 && dt <= MAX_GAP_S && step / dt >= MOVING_SPEED_MS) movingTimeS += dt;
    }
  }

  for (const s of samples) {
    if (s.elevation === null || !Number.isFinite(s.elevation)) continue;
    sawElevation = true;
    if (lastElevation === null) {
      lastElevation = s.elevation;
      continue;
    }
    const delta = s.elevation - lastElevation;
    if (Math.abs(delta) < ELEVATION_NOISE_M) continue;
    if (delta > 0) elevationGainM += delta;
    lastElevation = s.elevation;
  }

  const stamps = samples.map((s) => s.time).filter((t): t is number => t !== null);
  const elapsedTimeS =
    stamps.length >= 2 ? (stamps[stamps.length - 1] - stamps[0]) / 1000 : movingTimeS;

  return {
    distanceM,
    movingTimeS: movingTimeS > 0 ? movingTimeS : elapsedTimeS,
    elapsedTimeS,
    elevationGainM: sawElevation ? elevationGainM : null,
  };
}

/**
 * Render an epoch as a local ISO string *without* timezone conversion. The poster should say
 * the date the athlete experienced, so an early-morning run must not slide onto the previous
 * day just because the viewer's browser sits in a different zone.
 */
export function toLocalIso(epochMs: number, offsetMinutes = 0): string {
  return new Date(epochMs + offsetMinutes * 60_000).toISOString().replace(/\.\d{3}Z$/, '');
}
