import { serializePoster, svgBlob } from './svg';

const MM_PER_INCH = 25.4;

/** Never attempt below this — a poster this soft is not worth producing. */
const MIN_DPI = 96;

/** Each retry after a failed rasterisation drops the resolution by this factor. */
const FALLBACK_STEP = 0.8;

export interface PngResult {
  blob: Blob;
  width: number;
  height: number;
  /** The DPI actually achieved, which may be below the request on a memory-limited browser. */
  dpi: number;
}

export function pixelsFor(mm: number, dpi: number): number {
  return Math.round((mm / MM_PER_INCH) * dpi);
}

/**
 * Browsers cap canvas size, and the caps differ wildly — Safari allows about 16.7 million
 * pixels while Chrome permits far more. Rather than punishing every browser with the tightest
 * limit (which would quietly drop an A2 poster below 300 DPI on a machine well able to render
 * it), the export attempts the requested resolution and steps down only if it actually fails.
 *
 * This is the largest size we will attempt at all, as a guard against absurd allocations.
 */
const ABSOLUTE_MAX_PIXELS = 500_000_000;

export function maxDpiFor(widthMm: number, heightMm: number): number {
  const inchesSq = (widthMm / MM_PER_INCH) * (heightMm / MM_PER_INCH);
  return Math.floor(Math.sqrt(ABSOLUTE_MAX_PIXELS / inchesSq));
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The poster could not be rasterised.'));
    img.src = url;
  });
}

/**
 * Exceeding a browser's canvas limit does not throw — it yields a blank or transparent canvas.
 * Since every poster paints an opaque full-bleed background, a transparent sample pixel is a
 * reliable signal that the rasterisation silently failed.
 */
function canvasRendered(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  const probes: Array<[number, number]> = [
    [1, 1],
    [Math.floor(width / 2), Math.floor(height / 2)],
    [width - 2, height - 2],
  ];
  try {
    return probes.every(([x, y]) => ctx.getImageData(x, y, 1, 1).data[3] > 0);
  } catch {
    return false;
  }
}

async function attempt(
  img: HTMLImageElement,
  widthMm: number,
  heightMm: number,
  dpi: number,
): Promise<PngResult | null> {
  const width = pixelsFor(widthMm, dpi);
  const height = pixelsFor(heightMm, dpi);

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null;
  try {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext('2d');
  } catch {
    return null;
  }
  if (!ctx) return null;

  try {
    ctx.drawImage(img, 0, 0, width, height);
  } catch {
    return null;
  }
  if (!canvasRendered(ctx, width, height)) return null;

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return null;

  return { blob, width, height, dpi };
}

/**
 * Rasterises the poster at print resolution.
 *
 * The SVG goes through a blob URL and an <img> rather than being drawn element by element, so
 * the browser's own renderer produces the bitmap — the preview and the export therefore cannot
 * disagree about layout, spacing or glyph shapes.
 */
export async function exportPng(
  svg: SVGSVGElement,
  widthMm: number,
  heightMm: number,
  requestedDpi: number,
): Promise<PngResult> {
  const markup = await serializePoster(svg);
  const url = URL.createObjectURL(svgBlob(markup));

  try {
    const img = await loadImage(url);
    let dpi = Math.min(requestedDpi, maxDpiFor(widthMm, heightMm));

    while (dpi >= MIN_DPI) {
      const result = await attempt(img, widthMm, heightMm, dpi);
      if (result) return result;
      dpi = Math.floor(dpi * FALLBACK_STEP);
    }

    throw new Error(
      'This poster is too large for your browser to rasterise. Try a smaller paper size, or ' +
        'export the PDF instead — it has no resolution limit.',
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
