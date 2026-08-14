import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Activity } from '../types';
import {
  addActivities,
  emptyProject,
  moveSlot,
  pruneExpired,
  removeActivity,
  setFieldsOnAllSlots,
  updateSlot,
  type Project,
} from './project';
import { projectFromFile, projectToFile } from './persistence';
import { STRAVA_CACHE_TTL_MS } from '../ingest/strava';

function activity(id: string, over: Partial<Activity> = {}): Activity {
  return {
    id,
    source: 'file',
    name: `Run ${id}`,
    sportType: 'Run',
    startDateLocal: '2026-03-09T07:00:00',
    distanceM: 10_000,
    movingTimeS: 3000,
    elapsedTimeS: 3100,
    elevationGainM: 80,
    coords: [
      [-0.1, 51.5],
      [-0.11, 51.51],
    ],
    fetchedAt: Date.now(),
    ...over,
  };
}

const withActivities = (n: number): Project =>
  addActivities(emptyProject(), Array.from({ length: n }, (_, i) => activity(`a${i}`)));

describe('addActivities', () => {
  it('adds activities and a slot for each', () => {
    const project = withActivities(3);
    expect(project.activities).toHaveLength(3);
    expect(project.poster.slots).toHaveLength(3);
    expect(project.poster.slots[0].fields.length).toBeGreaterThan(0);
  });

  it('picks the matching template as the count grows', () => {
    expect(withActivities(1).poster.templateId).toBe('single');
    expect(withActivities(4).poster.templateId).toBe('quad');
    expect(withActivities(9).poster.templateId).toBe('nine');
    expect(withActivities(5).poster.templateId).toBe('auto-grid');
  });

  it('respects a deliberate template choice that still fits', () => {
    let project = withActivities(2);
    project = { ...project, poster: { ...project.poster, templateId: 'side-by-side' } };
    project = addActivities(project, []);
    expect(project.poster.templateId).toBe('side-by-side');
  });

  it('caps the poster at ten activities', () => {
    const project = withActivities(14);
    expect(project.activities).toHaveLength(10);
    expect(project.poster.slots).toHaveLength(10);
  });

  it('ignores duplicates', () => {
    const first = addActivities(emptyProject(), [activity('dup')]);
    const second = addActivities(first, [activity('dup')]);
    expect(second.activities).toHaveLength(1);
  });
});

describe('slot editing', () => {
  it('removes an activity and its slot together', () => {
    const project = removeActivity(withActivities(3), 'a1');
    expect(project.activities.map((a) => a.id)).toEqual(['a0', 'a2']);
    expect(project.poster.slots.map((s) => s.activityId)).toEqual(['a0', 'a2']);
  });

  it('reorders slots without touching the activities', () => {
    const project = moveSlot(withActivities(3), 0, 2);
    expect(project.poster.slots.map((s) => s.activityId)).toEqual(['a1', 'a2', 'a0']);
    expect(project.activities).toHaveLength(3);
  });

  it('ignores an out-of-range move', () => {
    const before = withActivities(3);
    expect(moveSlot(before, 0, 5)).toBe(before);
    expect(moveSlot(before, 1, 1)).toBe(before);
  });

  it('applies a title override to one slot only', () => {
    const project = updateSlot(withActivities(2), 'a0', { titleOverride: 'Renamed' });
    expect(project.poster.slots[0].titleOverride).toBe('Renamed');
    expect(project.poster.slots[1].titleOverride).toBeUndefined();
  });

  it('sets fields across every slot at once', () => {
    const project = setFieldsOnAllSlots(withActivities(3), ['distance']);
    expect(project.poster.slots.every((s) => s.fields.length === 1)).toBe(true);
  });
});

describe('Strava cache eviction', () => {
  it('drops Strava activities past seven days, with their slots', () => {
    const stale = activity('strava-1', {
      source: 'strava',
      fetchedAt: Date.now() - STRAVA_CACHE_TTL_MS - 1000,
    });
    const fresh = activity('file-1');
    const project = pruneExpired(addActivities(emptyProject(), [stale, fresh]));
    expect(project.activities.map((a) => a.id)).toEqual(['file-1']);
    expect(project.poster.slots.map((s) => s.activityId)).toEqual(['file-1']);
  });

  it('never evicts activities imported from files, however old', () => {
    const ancient = activity('file-old', { fetchedAt: Date.now() - STRAVA_CACHE_TTL_MS * 10 });
    const project = pruneExpired(addActivities(emptyProject(), [ancient]));
    expect(project.activities).toHaveLength(1);
  });
});

describe('project files', () => {
  it('round-trips a project, keeping titles and field choices', () => {
    let project = withActivities(3);
    project = updateSlot(project, 'a1', { titleOverride: 'The rainy one', fields: ['distance'] });
    project = { ...project, poster: { ...project.poster, themeId: 'blueprint', units: 'imperial' } };

    const restored = projectFromFile(projectToFile(project));
    expect(restored.poster.themeId).toBe('blueprint');
    expect(restored.poster.units).toBe('imperial');
    expect(restored.poster.slots[1].titleOverride).toBe('The rainy one');
    expect(restored.poster.slots[1].fields).toEqual(['distance']);
    expect(restored.activities).toHaveLength(3);
  });

  it('rejects a file that is not a project', () => {
    expect(() => projectFromFile('{"format":"something-else"}')).toThrow(/not a Route Posters/);
  });

  it('rejects a project from a newer version', () => {
    expect(() =>
      projectFromFile(JSON.stringify({ format: 'route-posters-project', version: 99 })),
    ).toThrow(/newer version/);
  });

  it('fills in options a stored project predates', () => {
    const legacy = JSON.stringify({
      format: 'route-posters-project',
      version: 1,
      poster: { templateId: 'single', slots: [] },
      activities: [],
    });
    const restored = projectFromFile(legacy);
    expect(restored.poster.themeId).toBeDefined();
    expect(restored.poster.header).toBeDefined();
    expect(restored.poster.footer.showPoweredByStrava).toBe(false);
  });

  it('drops slots whose activity is missing from the file', () => {
    const orphaned = JSON.stringify({
      format: 'route-posters-project',
      version: 1,
      poster: { ...emptyProject().poster, slots: [{ activityId: 'gone', fields: [] }] },
      activities: [],
    });
    expect(projectFromFile(orphaned).poster.slots).toEqual([]);
  });
});

describe('localStorage persistence', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('survives localStorage being unavailable', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota exceeded');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    });
    const { loadProject, saveProject } = await import('./persistence');
    expect(() => saveProject(emptyProject())).not.toThrow();
    expect(loadProject().activities).toEqual([]);
    vi.unstubAllGlobals();
  });
});
