import type { Rect } from '../types';

/** Splits a rect into `count` equal rows, separated by `gap` millimetres. */
export function rows(box: Rect, count: number, gap: number): Rect[] {
  const h = (box.h - gap * (count - 1)) / count;
  return Array.from({ length: count }, (_, i) => ({
    x: box.x,
    y: box.y + i * (h + gap),
    w: box.w,
    h,
  }));
}

/** Splits a rect into `count` equal columns, separated by `gap` millimetres. */
export function columns(box: Rect, count: number, gap: number): Rect[] {
  const w = (box.w - gap * (count - 1)) / count;
  return Array.from({ length: count }, (_, i) => ({
    x: box.x + i * (w + gap),
    y: box.y,
    w,
    h: box.h,
  }));
}

/** Row-major grid. */
export function grid(box: Rect, cols: number, rowCount: number, gap: number): Rect[] {
  const out: Rect[] = [];
  for (const row of rows(box, rowCount, gap)) out.push(...columns(row, cols, gap));
  return out;
}

/**
 * A grid whose long axis follows the page. Given a 2x3 shape, a portrait poster gets 2 columns
 * and 3 rows while a landscape one gets 3 columns and 2 rows — so a template keeps its
 * character instead of producing absurdly squashed cells when the page is rotated.
 */
export function orientedGrid(box: Rect, a: number, b: number, gap: number): Rect[] {
  const long = Math.max(a, b);
  const short = Math.min(a, b);
  return box.w >= box.h ? grid(box, long, short, gap) : grid(box, short, long, gap);
}

/** Splits a rect into two stacked parts, the first taking `fraction` of the height. */
export function splitTop(box: Rect, fraction: number, gap: number): [Rect, Rect] {
  const topH = (box.h - gap) * fraction;
  return [
    { x: box.x, y: box.y, w: box.w, h: topH },
    { x: box.x, y: box.y + topH + gap, w: box.w, h: box.h - topH - gap },
  ];
}

/**
 * Chooses grid dimensions for an arbitrary count, aiming for cells whose aspect ratio is close
 * to square — routes are rarely long thin ribbons, so near-square cells waste the least space.
 */
export function autoGridShape(count: number, box: Rect): { cols: number; rows: number } {
  let best = { cols: 1, rows: count, score: Infinity };
  for (let cols = 1; cols <= count; cols++) {
    const rowCount = Math.ceil(count / cols);
    const cellW = box.w / cols;
    const cellH = box.h / rowCount;
    const aspect = cellW / cellH;
    // Penalise non-square cells, and penalise leaving holes in the final row.
    const score = Math.abs(Math.log(aspect)) + (cols * rowCount - count) * 0.12;
    if (score < best.score) best = { cols, rows: rowCount, score };
  }
  return { cols: best.cols, rows: best.rows };
}

/**
 * Grid for an arbitrary count, centring any short final row. Nine activities in a 3x3 look
 * deliberate; eight in a 3x3 with a ragged last row looks like a mistake, so the orphans are
 * centred instead.
 */
export function autoGrid(box: Rect, count: number, gap: number): Rect[] {
  if (count <= 0) return [];
  const { cols, rows: rowCount } = autoGridShape(count, box);
  const rowRects = rows(box, rowCount, gap);
  const out: Rect[] = [];

  for (let r = 0; r < rowCount; r++) {
    const remaining = count - r * cols;
    const inThisRow = Math.min(cols, remaining);
    if (inThisRow <= 0) break;

    const cellW = (box.w - gap * (cols - 1)) / cols;
    const usedW = inThisRow * cellW + gap * (inThisRow - 1);
    const startX = box.x + (box.w - usedW) / 2;

    for (let c = 0; c < inThisRow; c++) {
      out.push({
        x: startX + c * (cellW + gap),
        y: rowRects[r].y,
        w: cellW,
        h: rowRects[r].h,
      });
    }
  }
  return out;
}
