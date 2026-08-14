import type { Rect } from '../types';
import type { Point } from './project';

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function computeBounds(points: Point[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export const boundsWidth = (b: Bounds) => b.maxX - b.minX;
export const boundsHeight = (b: Bounds) => b.maxY - b.minY;

/**
 * Scale (projected units per mm) that makes `bounds` exactly fill `rect`. A degenerate track
 * — a single point, or a perfectly straight there-and-back — would divide by zero, so both
 * axes get a floor.
 */
export function fitScale(bounds: Bounds, rect: Rect): number {
  const w = Math.max(boundsWidth(bounds), 1e-6);
  const h = Math.max(boundsHeight(bounds), 1e-6);
  return Math.max(w / rect.w, h / rect.h);
}

/**
 * Build a projected-space -> millimetre transform that centres `bounds` inside `rect`.
 *
 * Passing an explicit `scale` is what drives shared-scale posters: every cell is handed the
 * same units-per-mm, so routes keep their true relative sizes instead of each being blown up
 * to fill its own box.
 */
export function makeTransform(bounds: Bounds, rect: Rect, scale?: number) {
  const s = scale ?? fitScale(bounds, rect);
  const drawnW = boundsWidth(bounds) / s;
  const drawnH = boundsHeight(bounds) / s;
  const offsetX = rect.x + (rect.w - drawnW) / 2;
  const offsetY = rect.y + (rect.h - drawnH) / 2;
  return (p: Point): Point => ({
    x: offsetX + (p.x - bounds.minX) / s,
    y: offsetY + (p.y - bounds.minY) / s,
  });
}
