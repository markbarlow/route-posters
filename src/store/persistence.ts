import type { Activity, Poster } from '../types';
import { TEMPLATES, bestTemplateFor, getTemplate } from '../templates/registry';
import { defaultPoster, emptyProject, pruneExpired, type Project } from './project';

const STORAGE_KEY = 'route-posters:project:v1';
const FILE_FORMAT = 'route-posters-project';
const FILE_VERSION = 1;

interface ProjectFile {
  format: string;
  version: number;
  savedAt: string;
  poster: Poster;
  activities: Activity[];
}

/**
 * Merges a stored poster onto the current defaults so a project saved by an older build — one
 * that predates a newly added option — loads with sensible values instead of `undefined`
 * propagating into the renderer.
 */
function reconcilePoster(stored: Partial<Poster> | undefined): Poster {
  const base = defaultPoster();
  if (!stored) return base;
  return {
    ...base,
    ...stored,
    header: { ...base.header, ...(stored.header ?? {}) },
    footer: { ...base.footer, ...(stored.footer ?? {}) },
    slots: Array.isArray(stored.slots) ? stored.slots : [],
  };
}

/**
 * Replaces a template the current build cannot honour. A stored project may name a layout that
 * has since been removed, or one that no longer suits its activity count; either way the
 * renderer would be handed fewer cells than it has routes and would silently draw them stacked
 * on top of each other. Falling back to the best fit for the count keeps an old project
 * openable and correct.
 */
function reconcileTemplate(poster: Poster): void {
  const count = poster.slots.length;
  if (count === 0) {
    poster.templateId = 'single';
    return;
  }
  const exists = TEMPLATES.some((t) => t.id === poster.templateId);
  const template = getTemplate(poster.templateId);
  const fits = count >= template.minSlots && count <= template.maxSlots;
  if (!exists || !fits) poster.templateId = bestTemplateFor(count).id;
}

function reconcile(data: Partial<ProjectFile>): Project {
  const activities = Array.isArray(data.activities) ? data.activities : [];
  const poster = reconcilePoster(data.poster);
  // Never trust stored slots to still have activities behind them.
  const known = new Set(activities.map((a) => a.id));
  poster.slots = poster.slots.filter((s) => known.has(s.activityId));
  reconcileTemplate(poster);
  return pruneExpired({ poster, activities });
}

export function saveProject(project: Project): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } catch {
    // A poster full of long tracks can exceed the storage quota. Losing autosave is an
    // annoyance, not a failure — the editor keeps working and the user can still export.
  }
}

export function loadProject(): Project {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProject();
    return reconcile(JSON.parse(raw) as Partial<ProjectFile>);
  } catch {
    return emptyProject();
  }
}

/**
 * Whether there is saved work worth returning to. Deliberately cheap — it parses the stored JSON
 * but looks only at the slot count, because the splash page calls this on every render to decide
 * whether its button should say "Continue" or "Create".
 */
export function hasSavedProject(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as { poster?: { slots?: unknown[] } };
    return Array.isArray(data.poster?.slots) && data.poster.slots.length > 0;
  } catch {
    return false;
  }
}

export function clearProject(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do — an unavailable localStorage means there was nothing stored anyway.
  }
}

/** Serialises a project to a portable file, so work survives a different browser or machine. */
export function projectToFile(project: Project): string {
  const payload: ProjectFile = {
    format: FILE_FORMAT,
    version: FILE_VERSION,
    savedAt: new Date().toISOString(),
    poster: project.poster,
    activities: project.activities,
  };
  return JSON.stringify(payload, null, 2);
}

export function projectFromFile(json: string): Project {
  const data = JSON.parse(json) as Partial<ProjectFile>;
  if (data.format !== FILE_FORMAT) {
    throw new Error('That file is not a Route Posters project.');
  }
  if (typeof data.version === 'number' && data.version > FILE_VERSION) {
    throw new Error('That project was saved by a newer version of the app.');
  }
  return reconcile(data);
}
