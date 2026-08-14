import type { Point } from './project';

/** Squared perpendicular distance from `p` to segment `a`-`b`. */
function segmentDistanceSq(p: Point, a: Point, b: Point): number {
  let x = a.x;
  let y = a.y;
  let dx = b.x - x;
  let dy = b.y - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b.x;
      y = b.y;
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = p.x - x;
  dy = p.y - y;
  return dx * dx + dy * dy;
}

/**
 * Ramer-Douglas-Peucker, iterative rather than recursive so that a long ride (100k+ points
 * from a 1-second-sampling head unit) cannot blow the call stack.
 */
export function simplify(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points.slice();

  const toleranceSq = tolerance * tolerance;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    let maxDistSq = 0;
    let index = -1;

    for (let i = first + 1; i < last; i++) {
      const distSq = segmentDistanceSq(points[i], points[first], points[last]);
      if (distSq > maxDistSq) {
        maxDistSq = distSq;
        index = i;
      }
    }

    if (index !== -1 && maxDistSq > toleranceSq) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }

  const out: Point[] = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
  return out;
}

/**
 * Turn points into an SVG path. Coordinates are rounded to `precision` decimals — at
 * millimetre units, 2dp is 10 microns, far below what any printer resolves, and it typically
 * halves the size of the path data that ends up embedded in the exported PDF.
 */
export function toPathData(points: Point[], precision = 2): string {
  if (points.length === 0) return '';
  const r = (n: number) => {
    const v = Number(n.toFixed(precision));
    return Object.is(v, -0) ? 0 : v;
  };
  let d = `M${r(points[0].x)},${r(points[0].y)}`;
  for (let i = 1; i < points.length; i++) d += `L${r(points[i].x)},${r(points[i].y)}`;
  return d;
}
