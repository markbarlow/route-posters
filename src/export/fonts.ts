import { FONT_FILES, fontUrl } from '../design/themes';

export interface LoadedFont {
  family: string;
  weight: number;
  /** Base64 woff2, inlined into exported SVG so canvas rasterisation can see the face. */
  woff2: string;
  /** Base64 TTF, handed to jsPDF so PDF text stays real embedded text. */
  ttf: string;
}

async function fetchBase64(path: string): Promise<string> {
  const res = await fetch(fontUrl(path));
  if (!res.ok) throw new Error(`Could not load font ${path} (${res.status}).`);
  const buffer = new Uint8Array(await res.arrayBuffer());

  // Chunked conversion: String.fromCharCode(...bytes) on a 32KB font blows the argument limit.
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < buffer.length; i += CHUNK) {
    binary += String.fromCharCode(...buffer.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

let cache: Promise<LoadedFont[]> | null = null;

/** Loads and caches every font as base64. Roughly 130KB total, fetched once per session. */
export function loadFonts(): Promise<LoadedFont[]> {
  cache ??= Promise.all(
    FONT_FILES.map(async (f) => ({
      family: f.family,
      weight: f.weight,
      woff2: await fetchBase64(f.woff2),
      ttf: await fetchBase64(f.ttf),
    })),
  );
  return cache;
}

/**
 * @font-face rules with the font data inlined.
 *
 * This is not an optimisation — it is required. A serialised SVG rasterised through an <img>
 * cannot reach back out for external resources, so a stylesheet reference would be silently
 * ignored and every exported poster would fall back to a default system face.
 */
export function fontFaceCss(fonts: LoadedFont[]): string {
  return fonts
    .map(
      (f) => `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${f.weight};` +
        `src:url(data:font/woff2;base64,${f.woff2}) format('woff2');}`,
    )
    .join('');
}
