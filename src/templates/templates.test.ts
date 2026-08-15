import { describe, expect, it } from 'vitest';
import type { Rect } from '../types';
import { autoGrid, autoGridShape, columns, grid, orientedGrid, rows } from './layouts';
import { TEMPLATES, bestTemplateFor, getTemplate, templatesFor } from './registry';

const BOX: Rect = { x: 10, y: 20, w: 200, h: 300 };
const GAP = 5;

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w - 0.001 &&
  b.x < a.x + a.w - 0.001 &&
  a.y < b.y + b.h - 0.001 &&
  b.y < a.y + a.h - 0.001;

function assertInside(cells: Rect[], box: Rect) {
  for (const c of cells) {
    expect(c.x).toBeGreaterThanOrEqual(box.x - 0.001);
    expect(c.y).toBeGreaterThanOrEqual(box.y - 0.001);
    expect(c.x + c.w).toBeLessThanOrEqual(box.x + box.w + 0.001);
    expect(c.y + c.h).toBeLessThanOrEqual(box.y + box.h + 0.001);
    expect(c.w).toBeGreaterThan(0);
    expect(c.h).toBeGreaterThan(0);
  }
}

function assertNoOverlaps(cells: Rect[]) {
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      expect(overlaps(cells[i], cells[j])).toBe(false);
    }
  }
}

describe('primitives', () => {
  it('splits rows and columns with gaps that consume exactly the available space', () => {
    const r = rows(BOX, 3, GAP);
    expect(r).toHaveLength(3);
    expect(r[0].h * 3 + GAP * 2).toBeCloseTo(BOX.h);
    expect(r[2].y + r[2].h).toBeCloseTo(BOX.y + BOX.h);

    const c = columns(BOX, 4, GAP);
    expect(c[0].w * 4 + GAP * 3).toBeCloseTo(BOX.w);
    expect(c[3].x + c[3].w).toBeCloseTo(BOX.x + BOX.w);
  });

  it('lays a grid out in row-major order', () => {
    const cells = grid(BOX, 3, 2, GAP);
    expect(cells).toHaveLength(6);
    // First three share a row...
    expect(cells[1].y).toBeCloseTo(cells[0].y);
    expect(cells[2].y).toBeCloseTo(cells[0].y);
    // ...and the fourth starts the next one.
    expect(cells[3].y).toBeGreaterThan(cells[0].y);
    expect(cells[3].x).toBeCloseTo(cells[0].x);
  });

  it('turns an oriented grid to follow the page', () => {
    const portrait = orientedGrid({ x: 0, y: 0, w: 100, h: 200 }, 2, 3, GAP);
    const landscape = orientedGrid({ x: 0, y: 0, w: 200, h: 100 }, 2, 3, GAP);
    // Portrait: 2 across, 3 down -> the first two cells share a row.
    expect(portrait[1].y).toBeCloseTo(portrait[0].y);
    expect(portrait[2].y).toBeGreaterThan(portrait[0].y);
    // Landscape: 3 across -> the first three share a row.
    expect(landscape[2].y).toBeCloseTo(landscape[0].y);
    expect(landscape[3].y).toBeGreaterThan(landscape[0].y);
  });
});

describe('autoGrid', () => {
  it('prefers near-square cells', () => {
    expect(autoGridShape(9, { x: 0, y: 0, w: 300, h: 300 })).toEqual({ cols: 3, rows: 3 });
    expect(autoGridShape(4, { x: 0, y: 0, w: 300, h: 300 })).toEqual({ cols: 2, rows: 2 });
  });

  it('centres an incomplete final row instead of leaving it ragged', () => {
    const cells = autoGrid(BOX, 8, GAP);
    expect(cells).toHaveLength(8);
    const lastRowY = cells[cells.length - 1].y;
    const lastRow = cells.filter((c) => Math.abs(c.y - lastRowY) < 0.001);
    const rowCentre =
      (lastRow[0].x + lastRow[lastRow.length - 1].x + lastRow[lastRow.length - 1].w) / 2;
    expect(rowCentre).toBeCloseTo(BOX.x + BOX.w / 2, 1);
  });

  it('produces the requested number of cells for every supported count', () => {
    for (let n = 1; n <= 10; n++) {
      const cells = autoGrid(BOX, n, GAP);
      expect(cells).toHaveLength(n);
      assertInside(cells, BOX);
      assertNoOverlaps(cells);
    }
  });

  it('returns nothing for an empty poster', () => {
    expect(autoGrid(BOX, 0, GAP)).toEqual([]);
  });
});

describe('templates', () => {
  it.each(TEMPLATES)('$name keeps its cells inside the page and apart', (template) => {
    for (const box of [BOX, { x: 0, y: 0, w: 300, h: 200 }, { x: 0, y: 0, w: 150, h: 150 }]) {
      const cells = template.cells(box, template.slots, GAP);
      expect(cells).toHaveLength(template.slots);
      assertInside(cells, box);
      assertNoOverlaps(cells);
    }
  });

  it('gives the feature template a hero larger than its supporting cells', () => {
    const cells = getTemplate('feature-three').cells(BOX, 4, GAP);
    const [hero, ...strip] = cells;
    for (const cell of strip) expect(hero.w * hero.h).toBeGreaterThan(cell.w * cell.h * 2);
  });

  it('matches counts to templates', () => {
    expect(bestTemplateFor(9).id).toBe('nine');
    expect(bestTemplateFor(1).id).toBe('single');
    // Nothing is designed for exactly five, so the flexible grid takes it.
    expect(bestTemplateFor(5).id).toBe('auto-grid');
  });

  it('reports which templates accept a given count', () => {
    expect(templatesFor(9).map((t) => t.id)).toEqual(['nine', 'auto-grid']);
    expect(templatesFor(2).map((t) => t.id)).toEqual(['stacked-pair', 'auto-grid']);
  });

  it('falls back to a real template for an unknown id', () => {
    expect(getTemplate('does-not-exist').id).toBe('single');
  });

  it('offers exactly nine templates, which tile the picker as three rows of three', () => {
    expect(TEMPLATES).toHaveLength(9);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(9);
  });
});
