import type { PaperSize } from '../types';

/**
 * Portrait dimensions in millimetres. Working in millimetres throughout — rather than pixels —
 * means the PDF page size, the print size and the SVG viewBox are all the same numbers, so
 * nothing has to be reconciled at export time.
 */
export const PAPER_SIZES: PaperSize[] = [
  { id: 'a4', name: 'A4', widthMm: 210, heightMm: 297 },
  { id: 'a3', name: 'A3', widthMm: 297, heightMm: 420 },
  { id: 'a2', name: 'A2', widthMm: 420, heightMm: 594 },
  { id: 'a1', name: 'A1', widthMm: 594, heightMm: 841 },
  { id: 'in12x18', name: '12 × 18 in', widthMm: 304.8, heightMm: 457.2 },
  { id: 'in18x24', name: '18 × 24 in', widthMm: 457.2, heightMm: 609.6 },
  { id: 'square', name: 'Square (social)', widthMm: 260, heightMm: 260 },
  { id: 'portrait45', name: '4:5 (social)', widthMm: 260, heightMm: 325 },
  { id: 'story', name: '9:16 (story)', widthMm: 200, heightMm: 356 },
];

export function getPaper(id: string): PaperSize {
  return PAPER_SIZES.find((p) => p.id === id) ?? PAPER_SIZES[1];
}

/** Page dimensions after applying orientation and adding bleed on all four edges. */
export function pageDimensions(
  paper: PaperSize,
  orientation: 'portrait' | 'landscape',
  bleedMm = 0,
): { width: number; height: number } {
  const w = orientation === 'portrait' ? paper.widthMm : paper.heightMm;
  const h = orientation === 'portrait' ? paper.heightMm : paper.widthMm;
  return { width: w + bleedMm * 2, height: h + bleedMm * 2 };
}

/**
 * Margins scale with the page rather than being fixed, so an A1 print gets the generous
 * border the size deserves while an A4 doesn't lose half its area to whitespace.
 */
export function marginFor(width: number, height: number): number {
  return Math.round(Math.min(width, height) * 0.075 * 10) / 10;
}
