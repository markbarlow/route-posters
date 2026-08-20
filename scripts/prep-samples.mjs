/**
 * Slims the bundled sample GPX files.
 *
 * The recordings arrive from watch exports carrying three kinds of dead weight, none of which this
 * app ever reads:
 *
 *   - coordinates at full float64 precision (`lat="52.51519686542451381683349609375"`), where six
 *     decimal places is about 11cm — already far finer than any GPS fix
 *   - per-point `<extensions>` holding heart rate and cadence
 *   - elevations and timestamps at similarly pointless precision
 *
 * Stripping those is **lossless for everything the app computes**: every point is kept, so distance,
 * moving time and elevation gain are unchanged bar rounding in the centimetres. That matters — an
 * earlier idea to thin the tracks with Ramer-Douglas-Peucker would have risked exactly the opposite,
 * because `deriveStats` only counts an interval towards moving time when it is 60 seconds or less,
 * so dropping points from a long straight can silently shorten the reported time and skew pace.
 *
 * Run with `npm run samples:prep`. It is idempotent; re-running a cleaned file changes nothing.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = resolve(ROOT, 'public/samples');

/** ~11cm. Beyond this is recording noise, not information. */
const COORD_DP = 6;
const ELE_DP = 1;

const round = (value, dp) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return String(Number(n.toFixed(dp)));
};

function slim(xml) {
  return (
    xml
      // Heart rate, cadence, temperature: never read, and the bulk of the file.
      .replace(/\s*<extensions>[\s\S]*?<\/extensions>/g, '')
      .replace(/(lat|lon)="(-?[\d.eE+]+)"/g, (_, attr, value) => `${attr}="${round(value, COORD_DP)}"`)
      .replace(/<ele>(-?[\d.eE+]+)<\/ele>/g, (_, value) => `<ele>${round(value, ELE_DP)}</ele>`)
      // Sub-second resolution on a run is noise; Date.parse handles either form.
      .replace(/<time>([^<]+?)\.\d+Z<\/time>/g, '<time>$1Z</time>')
      // Tidy the blank lines the extensions left behind.
      .replace(/\n\s*\n/g, '\n')
  );
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.gpx'));
let before = 0;
let after = 0;

console.log('file'.padEnd(30) + 'before'.padStart(10) + 'after'.padStart(10) + 'saved'.padStart(9));
for (const file of files) {
  const path = resolve(DIR, file);
  const original = readFileSync(path, 'utf8');
  const sizeBefore = statSync(path).size;

  const slimmed = slim(original);
  writeFileSync(path, slimmed);
  const sizeAfter = statSync(path).size;

  before += sizeBefore;
  after += sizeAfter;

  const saved = sizeBefore === 0 ? 0 : (1 - sizeAfter / sizeBefore) * 100;
  console.log(
    file.padEnd(30) +
      `${(sizeBefore / 1024).toFixed(0)}KB`.padStart(10) +
      `${(sizeAfter / 1024).toFixed(0)}KB`.padStart(10) +
      `${saved.toFixed(0)}%`.padStart(9),
  );
}

console.log(
  '\ntotal'.padEnd(31) +
    `${(before / 1024 / 1024).toFixed(2)}MB`.padStart(10) +
    `${(after / 1024 / 1024).toFixed(2)}MB`.padStart(10) +
    `${((1 - after / before) * 100).toFixed(0)}%`.padStart(9),
);
