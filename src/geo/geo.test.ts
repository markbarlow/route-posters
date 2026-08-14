import { describe, expect, it } from 'vitest';
import { haversine, project, trackLength, mercatorScaleFactor } from './project';
import { computeBounds, fitScale, makeTransform } from './bounds';
import { simplify, toPathData } from './simplify';
import type { LngLat } from '../types';

describe('project', () => {
  it('puts the origin at 0,0 and flips y so north is up in SVG space', () => {
    // tan(PI/4) is not exactly 1 in floating point, so the origin lands a fraction of a
    // nanometre off zero.
    expect(project([0, 0]).x).toBe(0);
    expect(project([0, 0]).y).toBeCloseTo(0, 6);
    expect(project([0, 10]).y).toBeLessThan(0);
    expect(project([0, -10]).y).toBeGreaterThan(0);
  });

  it('clamps beyond the Mercator limit instead of returning Infinity', () => {
    expect(Number.isFinite(project([0, 90]).y)).toBe(true);
    expect(Number.isFinite(project([0, -90]).y)).toBe(true);
  });
});

describe('haversine', () => {
  it('measures a known distance', () => {
    // One degree of latitude is ~111.2 km anywhere on the globe.
    expect(haversine([0, 0], [0, 1])).toBeCloseTo(111195, 0);
  });

  it('sums a track', () => {
    const track: LngLat[] = [
      [0, 0],
      [0, 1],
      [0, 2],
    ];
    expect(trackLength(track)).toBeCloseTo(2 * 111195, 0);
  });

  it('is zero for a single point', () => {
    expect(trackLength([[1, 1]])).toBe(0);
  });
});

describe('mercatorScaleFactor', () => {
  it('is 1 at the equator and grows with latitude', () => {
    expect(mercatorScaleFactor(0)).toBeCloseTo(1, 6);
    expect(mercatorScaleFactor(60)).toBeCloseTo(2, 6);
    expect(mercatorScaleFactor(51.5)).toBeGreaterThan(1.6);
  });
});

describe('bounds and fitting', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 100, y: 50 },
  ];

  it('computes bounds', () => {
    expect(computeBounds(points)).toEqual({ minX: 0, minY: 0, maxX: 100, maxY: 50 });
  });

  it('fits to the constraining axis', () => {
    // 100x50 into 50x50mm: width is the binding constraint at 2 units/mm.
    expect(fitScale(computeBounds(points), { x: 0, y: 0, w: 50, h: 50 })).toBeCloseTo(2);
  });

  it('survives a degenerate single-point track without dividing by zero', () => {
    const scale = fitScale(computeBounds([{ x: 5, y: 5 }]), { x: 0, y: 0, w: 10, h: 10 });
    expect(Number.isFinite(scale)).toBe(true);
  });

  it('centres the track inside its cell', () => {
    const rect = { x: 10, y: 10, w: 50, h: 50 };
    const transform = makeTransform(computeBounds(points), rect);
    const a = transform(points[0]);
    const b = transform(points[1]);

    // Width binds, so the drawing spans the full 50mm horizontally...
    expect(a.x).toBeCloseTo(10);
    expect(b.x).toBeCloseTo(60);
    // ...and the leftover vertical space is split evenly.
    expect(a.y - rect.y).toBeCloseTo(rect.y + rect.h - b.y);
  });

  it('honours a shared scale so cells stay comparable', () => {
    const rect = { x: 0, y: 0, w: 50, h: 50 };
    const small = computeBounds([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ]);
    const shared = 2;
    const transform = makeTransform(small, rect, shared);
    // At 2 units/mm a 10-unit track must draw 5mm wide, not stretch to fill the cell.
    expect(transform({ x: 10, y: 10 }).x - transform({ x: 0, y: 0 }).x).toBeCloseTo(5);
  });
});

describe('simplify', () => {
  it('drops collinear midpoints', () => {
    const line = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ];
    expect(simplify(line, 0.1)).toEqual([
      { x: 0, y: 0 },
      { x: 3, y: 0 },
    ]);
  });

  it('keeps a corner that exceeds the tolerance', () => {
    const corner = [
      { x: 0, y: 0 },
      { x: 1, y: 5 },
      { x: 2, y: 0 },
    ];
    expect(simplify(corner, 0.1)).toHaveLength(3);
  });

  it('always keeps both endpoints', () => {
    const pts = Array.from({ length: 50 }, (_, i) => ({ x: i, y: 0 }));
    const out = simplify(pts, 100);
    expect(out[0]).toEqual(pts[0]);
    expect(out.at(-1)).toEqual(pts.at(-1));
  });

  it('handles a very long track without exhausting the stack', () => {
    const pts = Array.from({ length: 200_000 }, (_, i) => ({
      x: i,
      y: Math.sin(i / 100) * 50,
    }));
    expect(() => simplify(pts, 0.5)).not.toThrow();
  });
});

describe('toPathData', () => {
  it('emits a rounded move-then-line path', () => {
    expect(
      toPathData([
        { x: 1.234, y: 2.345 },
        { x: 3.456, y: 4.567 },
      ]),
    ).toBe('M1.23,2.35L3.46,4.57');
  });

  it('normalises negative zero, which would otherwise print as "-0"', () => {
    expect(toPathData([{ x: -0.001, y: 0 }])).toBe('M0,0');
  });

  it('returns an empty string for no points', () => {
    expect(toPathData([])).toBe('');
  });
});
