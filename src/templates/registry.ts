import type { Rect } from '../types';
import { autoGrid, columns, grid, orientedGrid, rows, splitTop } from './layouts';

export interface Template {
  id: string;
  name: string;
  description: string;
  /** How many activities this layout is designed around. */
  slots: number;
  /** Accepts any count in this range; most templates are fixed at exactly `slots`. */
  minSlots: number;
  maxSlots: number;
  /**
   * Cell rectangles in millimetres, given the poster's content box (page minus margins, header
   * and footer) and the number of activities actually placed.
   */
  cells: (box: Rect, count: number, gap: number) => Rect[];
}

/** Trims a layout to the number of activities actually present. */
const take = (rects: Rect[], count: number) => rects.slice(0, count);

export const TEMPLATES: Template[] = [
  {
    id: 'single',
    name: 'Single',
    description: 'One route, given the whole page.',
    slots: 1,
    minSlots: 1,
    maxSlots: 1,
    cells: (box) => [box],
  },
  {
    id: 'stacked-pair',
    name: 'Stacked pair',
    description: 'Two routes, one above the other.',
    slots: 2,
    minSlots: 2,
    maxSlots: 2,
    cells: (box, count, gap) => take(rows(box, 2, gap), count),
  },
  {
    id: 'triptych',
    name: 'Triptych',
    description: 'Three routes in a row — a classic gallery hang.',
    slots: 3,
    minSlots: 3,
    maxSlots: 3,
    cells: (box, count, gap) =>
      take(box.w >= box.h ? columns(box, 3, gap) : rows(box, 3, gap), count),
  },
  {
    id: 'quad',
    name: 'Quad',
    description: 'Four routes in a two-by-two block.',
    slots: 4,
    minSlots: 4,
    maxSlots: 4,
    cells: (box, count, gap) => take(grid(box, 2, 2, gap), count),
  },
  {
    id: 'feature-three',
    name: 'Feature + three',
    description: 'One hero route above three supporting ones.',
    slots: 4,
    minSlots: 4,
    maxSlots: 4,
    cells: (box, count, gap) => {
      const [hero, strip] = splitTop(box, 0.56, gap);
      return take([hero, ...columns(strip, 3, gap)], count);
    },
  },
  {
    id: 'six',
    name: 'Six',
    description: 'Six routes in a two-by-three grid.',
    slots: 6,
    minSlots: 6,
    maxSlots: 6,
    cells: (box, count, gap) => take(orientedGrid(box, 2, 3, gap), count),
  },
  {
    id: 'nine',
    name: 'Nine',
    description: 'A three-by-three grid — the year-in-runs wall piece.',
    slots: 9,
    minSlots: 9,
    maxSlots: 9,
    cells: (box, count, gap) => take(grid(box, 3, 3, gap), count),
  },
  {
    id: 'ten',
    name: 'Ten',
    description: 'Ten routes in a two-by-five grid.',
    slots: 10,
    minSlots: 10,
    maxSlots: 10,
    cells: (box, count, gap) => take(orientedGrid(box, 2, 5, gap), count),
  },
  {
    id: 'auto-grid',
    name: 'Auto grid',
    description: 'Any number from one to ten, arranged to suit the page.',
    slots: 6,
    minSlots: 1,
    maxSlots: 10,
    cells: (box, count, gap) => autoGrid(box, count, gap),
  },
];

export const MAX_SLOTS = 10;

export function getTemplate(id: string): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

/** Templates that can accommodate a given number of activities, best fit first. */
export function templatesFor(count: number): Template[] {
  return TEMPLATES.filter((t) => count >= t.minSlots && count <= t.maxSlots);
}

/**
 * The template that best suits a count, used when activities are added or removed. Prefers an
 * exact-fit named layout (nine activities should land on "Nine", not the generic grid) and
 * falls back to the auto grid.
 */
export function bestTemplateFor(count: number): Template {
  const exact = TEMPLATES.find((t) => t.id !== 'auto-grid' && t.slots === count);
  return exact ?? getTemplate('auto-grid');
}
