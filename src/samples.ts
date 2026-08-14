/**
 * Bundled example activities, so the app has something to show before anyone has exported
 * anything from Strava. Nine of them, which fills the 3x3 grid.
 */
export const SAMPLE_FILES = [
  'richmond-park-loop.gpx',
  'thames-riverside.gpx',
  'surrey-hills-ride.gpx',
  'brighton-half.gpx',
  'peak-district-trail.gpx',
  'regents-park-intervals.gpx',
  'chilterns-gravel.gpx',
  'coastal-path-hike.gpx',
  'hyde-park-recovery.gpx',
] as const;

/** Fetches the bundled samples as File objects so they go through the normal import path. */
export async function loadSampleFiles(count: number = SAMPLE_FILES.length): Promise<File[]> {
  const base = import.meta.env.BASE_URL;
  return Promise.all(
    SAMPLE_FILES.slice(0, count).map(async (name) => {
      const res = await fetch(`${base}samples/${name}`);
      if (!res.ok) throw new Error(`Could not load sample ${name}`);
      return new File([await res.blob()], name, { type: 'application/gpx+xml' });
    }),
  );
}
