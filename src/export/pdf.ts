import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import { FONTS } from '../design/themes';
import { loadFonts } from './fonts';

/**
 * Registers the poster faces with jsPDF's virtual filesystem.
 *
 * svg2pdf resolves each text element's font-family against fonts jsPDF knows about, so the
 * names here must match the family names used in the SVG exactly. Without this the PDF falls
 * back to Helvetica and the poster's typography — the thing carrying its whole character —
 * quietly disappears.
 */
async function registerFonts(doc: jsPDF): Promise<void> {
  const fonts = await loadFonts();
  for (const font of fonts) {
    const file = `${font.family}-${font.weight}.ttf`;
    const style = font.weight >= 700 ? 'bold' : 'normal';
    doc.addFileToVFS(file, font.ttf);
    doc.addFont(file, font.family, style);
  }
  doc.setFont(FONTS.body, 'normal');
}

/**
 * Renders the poster to a true-vector PDF at exact physical size.
 *
 * Unlike the PNG path, nothing here is rasterised: routes stay as paths and text stays as
 * selectable, embedded text, so the file prints sharp at A1 and stays a few hundred kilobytes.
 */
export async function exportPdf(
  svg: SVGSVGElement,
  widthMm: number,
  heightMm: number,
): Promise<Blob> {
  const doc = new jsPDF({
    unit: 'mm',
    format: [widthMm, heightMm],
    orientation: widthMm > heightMm ? 'landscape' : 'portrait',
    compress: true,
  });

  await registerFonts(doc);

  // svg2pdf walks a live DOM subtree and consults getComputedStyle, so the node must be
  // attached and laid out. It is positioned off-screen rather than hidden, because
  // `display: none` yields zero-size boxes and collapses the drawing.
  const holder = document.createElement('div');
  holder.setAttribute(
    'style',
    'position:fixed;left:-10000px;top:0;width:0;height:0;overflow:hidden;',
  );
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(widthMm));
  clone.setAttribute('height', String(heightMm));
  holder.appendChild(clone);
  document.body.appendChild(holder);

  try {
    await svg2pdf(clone, doc, { x: 0, y: 0, width: widthMm, height: heightMm });
    return doc.output('blob');
  } finally {
    holder.remove();
  }
}
