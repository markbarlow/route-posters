import type { Activity } from '../types';
import { cleanSamples, deriveStats, type Sample } from './track';
import { newActivityId } from './id';

/**
 * Strava writes GPX <type> as either a word or one of its numeric activity codes; other tools
 * write free text. Anything unrecognised falls through as-is and gets title-cased for display.
 */
const GPX_TYPE_ALIASES: Record<string, string> = {
  '1': 'Ride',
  '4': 'Hike',
  '9': 'Run',
  '10': 'Walk',
  '11': 'AlpineSki',
  '16': 'Swim',
  running: 'Run',
  run: 'Run',
  cycling: 'Ride',
  biking: 'Ride',
  ride: 'Ride',
  hiking: 'Hike',
  hike: 'Hike',
  walking: 'Walk',
  walk: 'Walk',
  swimming: 'Swim',
  swim: 'Swim',
  rowing: 'Rowing',
  kayaking: 'Kayaking',
  nordicski: 'NordicSki',
  backcountryski: 'BackcountrySki',
  alpineski: 'AlpineSki',
  snowboarding: 'Snowboard',
};

function normaliseSport(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  const key = raw.trim().toLowerCase().replace(/[\s_-]/g, '');
  return GPX_TYPE_ALIASES[key] ?? raw.trim();
}

function text(parent: Element | Document, tag: string): string | null {
  const el = parent.getElementsByTagName(tag)[0];
  const value = el?.textContent?.trim();
  return value ? value : null;
}

function num(value: string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseTime(value: string | null): number | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

/**
 * The recorded local date, preserved as written. GPX timestamps are UTC, so the offset between
 * the first sample's UTC time and the file's own local rendering is unknowable — we take the
 * UTC instant and let the formatter present it without further conversion, which is correct for
 * the overwhelming majority of activities (recorded and viewed in the same place).
 */
function isoFromEpoch(epoch: number | null): string | null {
  return epoch === null ? null : new Date(epoch).toISOString().replace(/\.\d{3}Z$/, '');
}

function fallbackName(filename: string): string {
  return (
    filename
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .trim() || 'Untitled activity'
  );
}

function build(
  samples: Sample[],
  name: string,
  sportType: string,
  summary: Partial<ReturnType<typeof deriveStats>> = {},
): Activity {
  const cleaned = cleanSamples(samples);
  if (cleaned.length < 2) {
    throw new Error('No usable GPS track found in this file.');
  }
  const derived = deriveStats(cleaned);
  return {
    id: newActivityId(),
    source: 'file',
    name,
    sportType,
    startDateLocal: isoFromEpoch(cleaned.find((s) => s.time !== null)?.time ?? null),
    distanceM: summary.distanceM ?? derived.distanceM,
    movingTimeS: summary.movingTimeS ?? derived.movingTimeS,
    elapsedTimeS: summary.elapsedTimeS ?? derived.elapsedTimeS,
    elevationGainM: summary.elevationGainM ?? derived.elevationGainM,
    coords: cleaned.map((s) => s.coord),
    fetchedAt: Date.now(),
  };
}

export function parseGpxDocument(doc: Document, filename: string): Activity {
  const trk = doc.getElementsByTagName('trk')[0];
  const points = Array.from(doc.getElementsByTagName('trkpt'));
  const samples: Sample[] = points.map((pt) => ({
    coord: [Number(pt.getAttribute('lon')), Number(pt.getAttribute('lat'))],
    time: parseTime(text(pt, 'time')),
    elevation: num(text(pt, 'ele')),
  }));

  const name =
    (trk ? text(trk, 'name') : null) ?? text(doc, 'name') ?? fallbackName(filename);
  const sportType = normaliseSport(trk ? text(trk, 'type') : null, 'Workout');
  return build(samples, name, sportType);
}

export function parseTcxDocument(doc: Document, filename: string): Activity {
  const activity = doc.getElementsByTagName('Activity')[0];
  const points = Array.from(doc.getElementsByTagName('Trackpoint'));

  const samples: Sample[] = points.map((pt) => {
    const pos = pt.getElementsByTagName('Position')[0];
    return {
      coord: [
        Number(pos ? text(pos, 'LongitudeDegrees') : NaN),
        Number(pos ? text(pos, 'LatitudeDegrees') : NaN),
      ],
      time: parseTime(text(pt, 'Time')),
      elevation: num(text(pt, 'AltitudeMeters')),
    };
  });

  // TCX carries per-lap summaries, which are the device's own figures and beat anything we can
  // recompute from sampled positions — particularly for distance, where a footpod or wheel
  // sensor is far more accurate than GPS.
  let distanceM = 0;
  let totalTimeS = 0;
  for (const lap of Array.from(doc.getElementsByTagName('Lap'))) {
    distanceM += num(text(lap, 'DistanceMeters')) ?? 0;
    totalTimeS += num(text(lap, 'TotalTimeSeconds')) ?? 0;
  }

  const sportType = normaliseSport(activity?.getAttribute('Sport') ?? null, 'Workout');
  const name = text(doc, 'Notes') ?? fallbackName(filename);

  return build(samples, name, sportType, {
    distanceM: distanceM > 0 ? distanceM : undefined,
    movingTimeS: totalTimeS > 0 ? totalTimeS : undefined,
  });
}

/** Parses GPX or TCX text, choosing by root element rather than by file extension. */
export function parseXmlActivity(xml: string, filename: string): Activity {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('This file is not valid XML.');
  }
  const root = doc.documentElement?.nodeName ?? '';
  if (/gpx/i.test(root)) return parseGpxDocument(doc, filename);
  if (/TrainingCenterDatabase/i.test(root)) return parseTcxDocument(doc, filename);
  throw new Error(`Unrecognised file format: <${root}>`);
}
