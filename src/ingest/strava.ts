import polyline from '@mapbox/polyline';
import type { Activity, LngLat } from '../types';
import { cleanSamples } from './track';

/**
 * How the app obtains a Strava access token.
 *
 * Nothing implements this yet, and that is deliberate. Strava's OAuth requires a client secret
 * and does not support PKCE, so the token exchange cannot happen in a static page — it needs a
 * small server-side helper (a Cloudflare Worker, or a local dev-only endpoint). Keeping the
 * dependency behind this interface means that decision can be made later without touching any
 * of the code below.
 */
export interface TokenProvider {
  getAccessToken(): Promise<string>;
}

export const STRAVA_API = 'https://www.strava.com/api/v3';

/**
 * Strava-sourced data may be cached for at most seven days under the API Agreement. Activities
 * older than this are dropped on load and re-fetched.
 */
export const STRAVA_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function isStravaCacheExpired(activity: Activity, now = Date.now()): boolean {
  return activity.source === 'strava' && now - activity.fetchedAt > STRAVA_CACHE_TTL_MS;
}

/** Removes Strava activities whose 7-day cache window has passed. Files are never evicted. */
export function evictExpiredStravaData(activities: Activity[], now = Date.now()): Activity[] {
  return activities.filter((a) => !isStravaCacheExpired(a, now));
}

/**
 * Pulls the numeric id out of a Strava activity URL. Accepts the bare id too, so pasting either
 * works.
 *
 * Worth knowing: the API only ever returns activities belonging to the authenticated athlete.
 * A URL for someone else's ride will resolve to an id here and then 404 at the API, which is
 * why the fetch below reports that case explicitly rather than as a generic failure.
 */
export function parseActivityUrl(input: string): string | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  const match = /strava\.com\/activities\/(\d+)/i.exec(trimmed);
  return match ? match[1] : null;
}

/** Shape of the pieces of Strava's DetailedActivity that the poster actually uses. */
interface StravaActivity {
  id: number;
  name: string;
  sport_type?: string;
  type?: string;
  start_date_local: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain?: number;
  location_city?: string | null;
  location_country?: string | null;
  map?: { polyline?: string; summary_polyline?: string };
}

/**
 * Strava returns an encoded polyline rather than a map image, which is exactly what a poster
 * wants: decoding it yields real coordinates that render as crisp vector at any print size.
 * `polyline.decode` yields [lat, lng]; the rest of this app works in [lng, lat].
 */
export function decodeStravaPolyline(encoded: string): LngLat[] {
  return polyline.decode(encoded).map(([lat, lng]) => [lng, lat] as LngLat);
}

export function toActivity(raw: StravaActivity): Activity {
  const encoded = raw.map?.polyline || raw.map?.summary_polyline;
  if (!encoded) {
    throw new Error(`"${raw.name}" has no GPS track (it may have been entered manually).`);
  }

  const samples = cleanSamples(
    decodeStravaPolyline(encoded).map((coord) => ({ coord, time: null, elevation: null })),
  );
  if (samples.length < 2) {
    throw new Error(`"${raw.name}" has no usable GPS track.`);
  }

  const city = raw.location_city ?? undefined;
  const country = raw.location_country ?? undefined;

  return {
    id: `strava-${raw.id}`,
    source: 'strava',
    name: raw.name,
    sportType: raw.sport_type ?? raw.type ?? 'Workout',
    startDateLocal: raw.start_date_local ?? null,
    distanceM: raw.distance,
    movingTimeS: raw.moving_time,
    elapsedTimeS: raw.elapsed_time,
    elevationGainM: raw.total_elevation_gain ?? null,
    locationName: [city, country].filter(Boolean).join(', ') || undefined,
    coords: samples.map((s) => s.coord),
    fetchedAt: Date.now(),
  };
}

async function call<T>(path: string, tokens: TokenProvider): Promise<T> {
  const token = await tokens.getAccessToken();
  const res = await fetch(`${STRAVA_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) {
    throw new Error(
      'Strava could not find that activity. The API only returns your own activities — ' +
        "another athlete's activity cannot be imported, even if it is public.",
    );
  }
  if (res.status === 429) {
    throw new Error('Strava rate limit reached (200 requests per 15 minutes). Try again shortly.');
  }
  if (!res.ok) {
    throw new Error(`Strava request failed (${res.status}).`);
  }
  return (await res.json()) as T;
}

export async function fetchActivity(id: string, tokens: TokenProvider): Promise<Activity> {
  return toActivity(await call<StravaActivity>(`/activities/${id}`, tokens));
}

export async function fetchRecentActivities(
  tokens: TokenProvider,
  page = 1,
  perPage = 30,
): Promise<Activity[]> {
  const raw = await call<StravaActivity[]>(
    `/athlete/activities?page=${page}&per_page=${perPage}`,
    tokens,
  );
  const out: Activity[] = [];
  for (const item of raw) {
    // Manually-entered activities have no track; skip rather than fail the whole page.
    try {
      out.push(toActivity(item));
    } catch {
      continue;
    }
  }
  return out;
}
