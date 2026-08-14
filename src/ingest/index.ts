import type { Activity } from '../types';
import { parseXmlActivity } from './xml';

export const ACCEPTED_EXTENSIONS = ['.gpx', '.tcx', '.fit'] as const;
export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(',');

export class ImportError extends Error {
  constructor(
    readonly filename: string,
    message: string,
  ) {
    super(message);
    this.name = 'ImportError';
  }
}

/** Dispatches on extension; GPX and TCX are then distinguished by their actual root element. */
export async function parseActivityFile(file: File): Promise<Activity> {
  const lower = file.name.toLowerCase();
  try {
    if (lower.endsWith('.fit')) {
      // The FIT parser ships Garmin's full message profile — several hundred kilobytes that
      // most imports never need, since GPX is what Strava's bulk export produces.
      const { parseFit } = await import('./fit');
      return await parseFit(await file.arrayBuffer(), file.name);
    }
    if (lower.endsWith('.gpx') || lower.endsWith('.tcx') || lower.endsWith('.xml')) {
      return parseXmlActivity(await file.text(), file.name);
    }
    throw new Error('Unsupported file type. Use a .gpx, .tcx or .fit file.');
  } catch (err) {
    throw new ImportError(file.name, err instanceof Error ? err.message : String(err));
  }
}

export interface ImportResult {
  activities: Activity[];
  errors: ImportError[];
}

/**
 * Import a batch, keeping the successes even when some files fail. Dropping a whole
 * drag-and-drop of a year's running because one file is corrupt would be needlessly hostile.
 */
export async function parseActivityFiles(files: File[]): Promise<ImportResult> {
  const settled = await Promise.allSettled(files.map(parseActivityFile));
  const activities: Activity[] = [];
  const errors: ImportError[] = [];

  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      activities.push(result.value);
    } else {
      const reason = result.reason;
      errors.push(
        reason instanceof ImportError
          ? reason
          : new ImportError(files[i].name, String(reason?.message ?? reason)),
      );
    }
  });

  // Oldest first is the order people expect from a year-in-review grid.
  activities.sort((a, b) => (a.startDateLocal ?? '').localeCompare(b.startDateLocal ?? ''));
  return { activities, errors };
}
