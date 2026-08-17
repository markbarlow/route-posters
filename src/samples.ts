import { parseActivityFiles } from './ingest';
import { addActivities, emptyProject, type Project } from './store/project';
import type { Preset } from './showcase';

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

/**
 * Heading applied when the samples are loaded onto a poster that has none. Without it the demo
 * renders with an empty heading, which reads as though the feature is broken rather than
 * optional. Only ever fills a blank — a heading the user has written is never overwritten.
 */
export const SAMPLE_HEADING = {
  title: '2026 in motion',
  subtitle: 'Nine days worth remembering',
};

/**
 * Builds a complete project from the bundled samples with a preset applied.
 *
 * Both the samples gallery and the showcase image generator go through here, and both reuse the
 * ordinary import path — the samples are parsed exactly as a dropped file would be, so a gallery
 * card can never show something the editor would not produce.
 */
export async function buildSampleProject(preset: Preset): Promise<Project> {
  const files = await loadSampleFiles(preset.activityCount);
  const { activities } = await parseActivityFiles(files);
  const project = addActivities(emptyProject(), activities);

  return {
    ...project,
    poster: {
      ...project.poster,
      templateId: preset.templateId,
      themeId: preset.themeId,
      paperId: preset.paperId,
      header: { show: true, ...(preset.heading ?? SAMPLE_HEADING) },
    },
  };
}

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
