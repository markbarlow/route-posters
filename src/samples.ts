import { parseActivityFile } from './ingest';
import { addActivities, emptyProject, type Project } from './store/project';
import type { Preset } from './showcase';

/**
 * One bundled example activity.
 *
 * Real exports need correcting before they belong on a poster. Watch and route-planner files carry
 * names like "Running 3/13/16 8:43 am" or "[Itinéraire] B-Ascension Ventoux par Bédoin", and a
 * planned route has no recognised sport at all, so it parses as "Workout" — which would print a
 * 20km alpine climb with a *running pace in min/km* instead of a speed in km/h.
 */
export interface SampleActivity {
  /** Stable key the gallery presets refer to. */
  id: string;
  file: string;
  /** Replaces whatever the file calls itself. */
  title: string;
  sportType: 'Run' | 'Ride';
}

/**
 * The bundled activities: ten marathons and the two great Alpine climbs. Real recordings, so the
 * distances, times and elevations on every sample poster are true.
 *
 * Titles are set here rather than taken from the files. Review them in this one block — the data
 * itself is untouched.
 */
export const SAMPLE_ACTIVITIES: SampleActivity[] = [
  // Boston in Lincolnshire, not Massachusetts — spelled out so the poster cannot mislead.
  { id: 'boston', file: 'boston-lincs-marathon.gpx', title: 'Boston Lincolnshire Marathon', sportType: 'Run' },
  { id: 'london', file: 'london-marathon.gpx', title: 'London Marathon', sportType: 'Run' },
  { id: 'berlin', file: 'berlin-marathon.gpx', title: 'Berlin Marathon', sportType: 'Run' },
  { id: 'barcelona', file: 'barcelona-marathon.gpx', title: 'Barcelona Marathon', sportType: 'Run' },
  { id: 'manchester', file: 'manchester-marathon.gpx', title: 'Manchester Marathon', sportType: 'Run' },
  { id: 'edinburgh', file: 'edinburgh-marathon.gpx', title: 'Edinburgh Marathon', sportType: 'Run' },
  { id: 'york', file: 'york-marathon.gpx', title: 'York Marathon', sportType: 'Run' },
  { id: 'newport', file: 'newport-marathon.gpx', title: 'Newport Marathon', sportType: 'Run' },
  { id: 'dorney', file: 'dorney-lake-marathon.gpx', title: 'Dorney Lake Marathon', sportType: 'Run' },
  { id: 'thames', file: 'thames-meander-marathon.gpx', title: 'Thames Meander Marathon', sportType: 'Run' },
  { id: 'ventoux', file: 'ventoux-par-bedoin.gpx', title: 'Ventoux par Bédoin', sportType: 'Ride' },
  { id: 'alpe', file: 'alpe-d-huez.gpx', title: "Alpe d'Huez", sportType: 'Ride' },
];

/** Every marathon, in the order above — the pool the grid layouts draw from. */
export const MARATHONS = SAMPLE_ACTIVITIES.filter((a) => a.sportType === 'Run').map((a) => a.id);

/**
 * Fallback heading for a preset that names none.
 *
 * Deliberately carries no year: a gallery captioned with a date starts looking stale the moment
 * that year turns, and these posters sit on the site indefinitely.
 */
export const SAMPLE_HEADING = {
  title: 'Miles worth keeping',
  subtitle: 'Routes turned into something you can hang',
};

function sampleById(id: string): SampleActivity {
  const found = SAMPLE_ACTIVITIES.find((a) => a.id === id);
  if (!found) throw new Error(`Unknown sample activity "${id}"`);
  return found;
}

/**
 * Builds a complete project from named sample activities with a preset applied.
 *
 * Both the samples gallery and the showcase image generator go through here, and both reuse the
 * ordinary import path — the files are parsed exactly as a dropped file would be, so a gallery card
 * can never show something the editor would not produce.
 */
export async function buildSampleProject(preset: Preset): Promise<Project> {
  const wanted = preset.activities.map(sampleById);
  const files = await loadSampleFiles(wanted.map((s) => s.file));

  // Parsed one at a time, on purpose. parseActivityFiles() re-sorts by date, which would both
  // scramble the order a preset asked for and lose the pairing between a file and its manifest
  // entry — and nothing on the parsed Activity records which file it came from.
  const corrected = [];
  for (const [i, file] of files.entries()) {
    const activity = await parseActivityFile(file);
    corrected.push({ ...activity, name: wanted[i].title, sportType: wanted[i].sportType });
  }

  const project = addActivities(emptyProject(), corrected);

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

/** Fetches the named samples as File objects so they go through the normal import path. */
export async function loadSampleFiles(files: string[]): Promise<File[]> {
  const base = import.meta.env.BASE_URL;
  return Promise.all(
    files.map(async (name) => {
      const res = await fetch(`${base}samples/${name}`);
      if (!res.ok) throw new Error(`Could not load sample ${name}`);
      return new File([await res.blob()], name, { type: 'application/gpx+xml' });
    }),
  );
}
