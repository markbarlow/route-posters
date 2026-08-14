import FitParser from 'fit-file-parser';
import type { Activity } from '../types';
import { cleanSamples, deriveStats, type Sample } from './track';
import { newActivityId } from './id';

/** Title-cases the parser's snake_case sport names ("mountain_biking" -> "Mountain Biking"). */
function normaliseSport(sport: string | undefined): string {
  if (!sport) return 'Workout';
  const mapped: Record<string, string> = {
    running: 'Run',
    cycling: 'Ride',
    swimming: 'Swim',
    hiking: 'Hike',
    walking: 'Walk',
  };
  const key = sport.toLowerCase();
  if (mapped[key]) return mapped[key];
  return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function toEpoch(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Parse a Garmin/Wahoo .fit file. The device's own session summary is preferred over anything
 * recomputed from sampled positions — a wheel sensor or footpod measures distance far more
 * accurately than GPS, and the head unit already knows exactly how long it was paused.
 */
export async function parseFit(buffer: ArrayBuffer, filename: string): Promise<Activity> {
  const parser = new FitParser({
    force: true,
    mode: 'list',
    lengthUnit: 'm',
    speedUnit: 'm/s',
  });

  const data = await parser.parseAsync(buffer);
  const records = data.records ?? [];

  const samples: Sample[] = records.map((r) => ({
    coord: [Number(r.position_long), Number(r.position_lat)],
    time: toEpoch(r.timestamp),
    elevation: finite(r.enhanced_altitude) ?? finite(r.altitude),
  }));

  const cleaned = cleanSamples(samples);
  if (cleaned.length < 2) {
    throw new Error('No usable GPS track found in this .fit file.');
  }

  const derived = deriveStats(cleaned);
  const session = data.sessions?.[0];
  const startEpoch =
    toEpoch(session?.start_time) ?? cleaned.find((s) => s.time !== null)?.time ?? null;

  return {
    id: newActivityId(),
    source: 'file',
    name: filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Untitled activity',
    sportType: normaliseSport(session?.sport as string | undefined),
    startDateLocal:
      startEpoch === null ? null : new Date(startEpoch).toISOString().replace(/\.\d{3}Z$/, ''),
    distanceM: finite(session?.total_distance) ?? derived.distanceM,
    movingTimeS: finite(session?.total_timer_time) ?? derived.movingTimeS,
    elapsedTimeS: finite(session?.total_elapsed_time) ?? derived.elapsedTimeS,
    elevationGainM: finite(session?.total_ascent) ?? derived.elevationGainM,
    coords: cleaned.map((s) => s.coord),
    fetchedAt: Date.now(),
  };
}
