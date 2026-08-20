import { describe, expect, it } from 'vitest';
import type { Activity, Poster } from '../types';
import { layoutPoster } from './layout';
import { defaultPoster, makeSlot } from '../store/project';
import { activityMap } from '../store/project';

/** A circular track of the given radius, centred on `lat` so latitude effects can be tested. */
function circleActivity(id: string, radiusKm: number, lat = 51.5, over: Partial<Activity> = {}): Activity {
  const coords: Array<[number, number]> = [];
  const latDeg = radiusKm / 111.32;
  const lonDeg = latDeg / Math.cos((lat * Math.PI) / 180);
  for (let i = 0; i <= 64; i++) {
    const t = (i / 64) * Math.PI * 2;
    coords.push([-0.1 + Math.cos(t) * lonDeg, lat + Math.sin(t) * latDeg]);
  }
  return {
    id,
    source: 'file',
    name: `Activity ${id}`,
    sportType: 'Run',
    startDateLocal: '2026-03-09T07:00:00',
    distanceM: 2 * Math.PI * radiusKm * 1000,
    movingTimeS: 3600,
    elapsedTimeS: 3700,
    elevationGainM: 120,
    coords,
    fetchedAt: Date.now(),
    ...over,
  };
}

function posterWith(activities: Activity[], over: Partial<Poster> = {}): Poster {
  return { ...defaultPoster(), slots: activities.map(makeSlot), ...over };
}

/** Width of the drawn route in millimetres, read back off the generated path data. */
function pathWidth(d: string): number {
  const xs = [...d.matchAll(/[ML](-?[\d.]+),/g)].map((m) => Number(m[1]));
  return Math.max(...xs) - Math.min(...xs);
}

describe('layoutPoster', () => {
  it('produces an A3 page at true millimetre dimensions', () => {
    const a = circleActivity('a', 2);
    const model = layoutPoster(posterWith([a]), activityMap([a]));
    expect(model.width).toBe(297);
    expect(model.height).toBe(420);
    expect(model.cells).toHaveLength(1);
    expect(model.cells[0].pathData.length).toBeGreaterThan(50);
  });

  it('swaps dimensions in landscape and adds bleed on every edge', () => {
    const a = circleActivity('a', 2);
    const model = layoutPoster(
      posterWith([a], { orientation: 'landscape', bleedMm: 3 }),
      activityMap([a]),
    );
    expect(model.width).toBe(420 + 6);
    expect(model.height).toBe(297 + 6);
  });

  it('fits each route to its own cell when normalisation is off', () => {
    const small = circleActivity('small', 1);
    const big = circleActivity('big', 10);
    const model = layoutPoster(
      posterWith([small, big], { templateId: 'stacked-pair', normalizeScale: false }),
      activityMap([small, big]),
    );
    // Both fill their cells, so the drawn widths are near identical despite a 10x size gap.
    const [w1, w2] = model.cells.map((c) => pathWidth(c.pathData));
    expect(w1).toBeGreaterThan(0);
    expect(Math.abs(w1 - w2)).toBeLessThan(1);
    expect(model.sharedScale).toBeNull();
  });

  it('preserves true relative size when normalisation is on', () => {
    const small = circleActivity('small', 1);
    const big = circleActivity('big', 10);
    const model = layoutPoster(
      posterWith([small, big], { templateId: 'stacked-pair', normalizeScale: true }),
      activityMap([small, big]),
    );
    const [w1, w2] = model.cells.map((c) => pathWidth(c.pathData));
    expect(model.sharedScale).toBeGreaterThan(0);
    expect(w2 / w1).toBeCloseTo(10, 0);
  });

  it('compares like with like across latitudes', () => {
    // Same real-world size, but Mercator stretches the northern one nearly twice as much.
    const london = circleActivity('london', 5, 51.5);
    const equator = circleActivity('equator', 5, 0.5);
    const model = layoutPoster(
      posterWith([london, equator], { templateId: 'stacked-pair', normalizeScale: true }),
      activityMap([london, equator]),
    );
    const [w1, w2] = model.cells.map((c) => pathWidth(c.pathData));
    // Without correcting for projection distortion these would differ by ~60%.
    expect(w1 / w2).toBeCloseTo(1, 1);
  });

  it('never lets a route overflow its cell', () => {
    const activities = Array.from({ length: 9 }, (_, i) => circleActivity(`a${i}`, 1 + i * 3));
    const model = layoutPoster(
      posterWith(activities, { templateId: 'nine', normalizeScale: true }),
      activityMap(activities),
    );
    for (const cell of model.cells) {
      const xs = [...cell.pathData.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)];
      for (const [, x, y] of xs) {
        expect(Number(x)).toBeGreaterThanOrEqual(cell.mapRect.x - 0.01);
        expect(Number(x)).toBeLessThanOrEqual(cell.mapRect.x + cell.mapRect.w + 0.01);
        expect(Number(y)).toBeGreaterThanOrEqual(cell.mapRect.y - 0.01);
        expect(Number(y)).toBeLessThanOrEqual(cell.mapRect.y + cell.mapRect.h + 0.01);
      }
    }
  });

  it('keeps the caption inside the cell', () => {
    const activities = Array.from({ length: 4 }, (_, i) => circleActivity(`a${i}`, 5));
    const model = layoutPoster(posterWith(activities, { templateId: 'quad' }), activityMap(activities));
    for (const cell of model.cells) {
      expect(cell.titleY).toBeLessThanOrEqual(cell.rect.y + cell.rect.h);
      expect(cell.statRect.y).toBeGreaterThanOrEqual(cell.mapRect.y + cell.mapRect.h - 0.01);
    }
  });

  it('shows only the fields that are switched on', () => {
    const a = circleActivity('a', 5);
    const poster = posterWith([a]);
    poster.slots[0].fields = ['distance', 'elevation'];
    const model = layoutPoster(poster, activityMap([a]));
    expect(model.cells[0].stats.map((s) => s.label)).toEqual(['Distance', 'Elevation']);
  });

  it('prefers a slot title override over the original name', () => {
    const a = circleActivity('a', 5, 51.5, { name: 'Morning Run' });
    const poster = posterWith([a]);
    poster.slots[0].titleOverride = 'The one where it rained';
    const model = layoutPoster(poster, activityMap([a]));
    expect(model.cells[0].title).toBe('The one where it rained');
  });

  it('hides the heading when it has no text, and shows it when it does', () => {
    const a = circleActivity('a', 5);
    expect(layoutPoster(posterWith([a]), activityMap([a])).header).toBeNull();

    const titled = layoutPoster(
      posterWith([a], { header: { show: true, title: '2026', subtitle: '' } }),
      activityMap([a]),
    );
    expect(titled.header?.title).toBe('2026');
    // A heading pushes the maps down the page.
    expect(titled.cells[0].rect.y).toBeGreaterThan(
      layoutPoster(posterWith([a]), activityMap([a])).cells[0].rect.y,
    );
  });

  it('joins footer text with the Strava attribution', () => {
    const a = circleActivity('a', 5);
    const model = layoutPoster(
      posterWith([a], {
        footer: { show: true, text: 'Made in London', showPoweredByStrava: true },
      }),
      activityMap([a]),
    );
    expect(model.footer?.text).toContain('Made in London');
    expect(model.footer?.text).toContain('Powered by Strava');
  });

  it('ignores slots whose activity has gone missing', () => {
    const a = circleActivity('a', 5);
    const poster = posterWith([a]);
    poster.slots.push({ activityId: 'vanished', fields: [] });
    const model = layoutPoster(poster, activityMap([a]));
    expect(model.cells).toHaveLength(1);
  });

  it('handles an empty poster without throwing', () => {
    const model = layoutPoster(defaultPoster(), new Map());
    expect(model.cells).toEqual([]);
  });
});
