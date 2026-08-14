import { fontFaceCss, loadFonts } from './fonts';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Clones the live poster and inlines its fonts, producing a standalone SVG document that
 * renders identically anywhere — no stylesheet, no network, no host page.
 */
export async function serializePoster(svg: SVGSVGElement): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', SVG_NS);
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.removeAttribute('class');
  clone.removeAttribute('style');

  const style = document.createElementNS(SVG_NS, 'style');
  style.textContent = fontFaceCss(await loadFonts());
  clone.insertBefore(style, clone.firstChild);

  return new XMLSerializer().serializeToString(clone);
}

/** Blob URL for a serialised SVG. Blob rather than data: — it avoids URL length limits. */
export function svgBlob(markup: string): Blob {
  return new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking immediately can cancel the download in some browsers; a tick is enough.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Filesystem-safe filename stem from the poster title, falling back to a dated default. */
export function posterFilename(title: string, extension: string): string {
  const stem =
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || `route-poster-${new Date().toISOString().slice(0, 10)}`;
  return `${stem}.${extension}`;
}
