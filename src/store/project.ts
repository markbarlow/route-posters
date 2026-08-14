import type { Activity, Field, Poster, Slot } from '../types';
import { MAX_SLOTS, bestTemplateFor, getTemplate } from '../templates/registry';
import { evictExpiredStravaData } from '../ingest/strava';

export const DEFAULT_FIELDS: Field[] = ['distance', 'time', 'pace', 'date'];

export interface Project {
  poster: Poster;
  activities: Activity[];
}

export function defaultPoster(): Poster {
  return {
    paperId: 'a3',
    orientation: 'portrait',
    bleedMm: 0,
    templateId: 'single',
    themeId: 'midnight',
    units: 'metric',
    normalizeScale: false,
    showCellTitles: true,
    header: { show: true, title: '', subtitle: '' },
    footer: { show: true, text: '', showPoweredByStrava: false },
    slots: [],
  };
}

export function emptyProject(): Project {
  return { poster: defaultPoster(), activities: [] };
}

export function makeSlot(activityId: string): Slot {
  return { activityId, fields: [...DEFAULT_FIELDS] };
}

export function activityMap(activities: Activity[]): Map<string, Activity> {
  return new Map(activities.map((a) => [a.id, a]));
}

/**
 * Adds activities, skipping duplicates and refusing to exceed ten. The template follows the
 * count unless the user has already chosen one that still fits, so importing nine files lands
 * on the 3x3 grid without overriding a deliberate choice.
 */
export function addActivities(project: Project, incoming: Activity[]): Project {
  const existing = new Set(project.activities.map((a) => a.id));
  const room = MAX_SLOTS - project.poster.slots.length;
  const accepted = incoming.filter((a) => !existing.has(a.id)).slice(0, Math.max(room, 0));
  if (accepted.length === 0) return project;

  const activities = [...project.activities, ...accepted];
  const slots = [...project.poster.slots, ...accepted.map((a) => makeSlot(a.id))];
  const current = getTemplate(project.poster.templateId);
  const stillFits = slots.length >= current.minSlots && slots.length <= current.maxSlots;

  return {
    activities,
    poster: {
      ...project.poster,
      slots,
      templateId: stillFits ? current.id : bestTemplateFor(slots.length).id,
    },
  };
}

export function removeActivity(project: Project, activityId: string): Project {
  const slots = project.poster.slots.filter((s) => s.activityId !== activityId);
  const current = getTemplate(project.poster.templateId);
  const stillFits =
    slots.length > 0 && slots.length >= current.minSlots && slots.length <= current.maxSlots;

  return {
    activities: project.activities.filter((a) => a.id !== activityId),
    poster: {
      ...project.poster,
      slots,
      templateId: slots.length === 0 ? 'single' : stillFits ? current.id : bestTemplateFor(slots.length).id,
    },
  };
}

export function moveSlot(project: Project, from: number, to: number): Project {
  if (to < 0 || to >= project.poster.slots.length || from === to) return project;
  const slots = [...project.poster.slots];
  const [moved] = slots.splice(from, 1);
  slots.splice(to, 0, moved);
  return { ...project, poster: { ...project.poster, slots } };
}

export function updateSlot(project: Project, activityId: string, patch: Partial<Slot>): Project {
  return {
    ...project,
    poster: {
      ...project.poster,
      slots: project.poster.slots.map((s) =>
        s.activityId === activityId ? { ...s, ...patch } : s,
      ),
    },
  };
}

/** Applies a field toggle to every slot at once — the common case for a multi-map poster. */
export function setFieldsOnAllSlots(project: Project, fields: Field[]): Project {
  return {
    ...project,
    poster: {
      ...project.poster,
      slots: project.poster.slots.map((s) => ({ ...s, fields: [...fields] })),
    },
  };
}

/** Drops Strava-sourced activities past their 7-day cache window, and any slots pointing at them. */
export function pruneExpired(project: Project, now = Date.now()): Project {
  const activities = evictExpiredStravaData(project.activities, now);
  if (activities.length === project.activities.length) return project;
  const kept = new Set(activities.map((a) => a.id));
  return {
    activities,
    poster: {
      ...project.poster,
      slots: project.poster.slots.filter((s) => kept.has(s.activityId)),
    },
  };
}
