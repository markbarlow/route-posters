import { useState, type RefObject } from 'react';
import { maxDpiFor, pixelsFor } from '../../export/png';
import { downloadBlob, posterFilename, serializePoster, svgBlob } from '../../export/svg';

// jsPDF and its dependencies are around 900KB — a third of them only relevant to features this
// app never uses. Loading them when an export is actually requested keeps the editor's initial
// download small, and the delay is hidden by the "Rendering…" state the buttons already show.
const pngExporter = () => import('../../export/png');
const pdfExporter = () => import('../../export/pdf');

const DPI_OPTIONS = [150, 300];

export function ExportPanel({
  svgRef,
  widthMm,
  heightMm,
  title,
  disabled,
}: {
  svgRef: RefObject<SVGSVGElement | null>;
  widthMm: number;
  heightMm: number;
  title: string;
  disabled: boolean;
}) {
  const [dpi, setDpi] = useState(300);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const achievableDpi = Math.min(dpi, maxDpiFor(widthMm, heightMm));
  const pxW = pixelsFor(widthMm, achievableDpi);
  const pxH = pixelsFor(heightMm, achievableDpi);

  const run = async (kind: string, fn: () => Promise<void>) => {
    setBusy(kind);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : String(err), error: true });
    } finally {
      setBusy(null);
    }
  };

  const svg = () => {
    const node = svgRef.current;
    if (!node) throw new Error('The poster is not ready yet.');
    return node;
  };

  return (
    <>
      <div className="field">
        <label className="field__label" htmlFor="dpi">
          PNG resolution
        </label>
        <select id="dpi" value={dpi} onChange={(e) => setDpi(Number(e.target.value))}>
          {DPI_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d} DPI{d === 300 ? ' — print' : ' — screen'}
            </option>
          ))}
        </select>
      </div>

      <p className="note">
        {pxW.toLocaleString()} × {pxH.toLocaleString()} px at {widthMm.toFixed(0)} ×{' '}
        {heightMm.toFixed(0)} mm
        {achievableDpi < dpi ? ` · capped at ${achievableDpi} DPI by browser canvas limits` : ''}
      </p>

      <button
        type="button"
        className="btn btn--primary btn--block"
        disabled={disabled || busy !== null}
        onClick={() =>
          run('png', async () => {
            const { exportPng } = await pngExporter();
            const result = await exportPng(svg(), widthMm, heightMm, dpi);
            downloadBlob(result.blob, posterFilename(title, 'png'));
            setMessage({
              text: `Saved ${result.width} × ${result.height} px at ${result.dpi} DPI.`,
            });
          })
        }
      >
        {busy === 'png' ? 'Rendering…' : 'Download PNG'}
      </button>

      <button
        type="button"
        className="btn btn--block"
        disabled={disabled || busy !== null}
        onClick={() =>
          run('pdf', async () => {
            const { exportPdf } = await pdfExporter();
            const blob = await exportPdf(svg(), widthMm, heightMm);
            downloadBlob(blob, posterFilename(title, 'pdf'));
            setMessage({ text: 'Saved a vector PDF at exact print size.' });
          })
        }
      >
        {busy === 'pdf' ? 'Rendering…' : 'Download PDF (vector)'}
      </button>

      <button
        type="button"
        className="btn btn--block"
        disabled={disabled || busy !== null}
        onClick={() =>
          run('svg', async () => {
            const markup = await serializePoster(svg());
            downloadBlob(svgBlob(markup), posterFilename(title, 'svg'));
            setMessage({ text: 'Saved an SVG you can open in Illustrator or Figma.' });
          })
        }
      >
        {busy === 'svg' ? 'Rendering…' : 'Download SVG'}
      </button>

      {message ? (
        <div className={`status${message.error ? ' status--error' : ''}`}>{message.text}</div>
      ) : null}

      <p className="note">
        PDF keeps routes and text as vectors, so it stays sharp at any size — use it for a print
        shop. PNG is the one to share.
      </p>
    </>
  );
}
