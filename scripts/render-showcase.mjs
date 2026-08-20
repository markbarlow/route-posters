/**
 * Regenerates every image in public/showcase/.
 *
 * The gallery on the samples page is pre-rendered, which means it can drift out of date whenever a
 * theme or layout changes. This script is the answer to that: run `npm run showcase` and every
 * card is redrawn from the current code in a few seconds.
 *
 * It drives the real app in headless Chromium, so the images are always exactly what the editor
 * would produce — no separate rendering path to keep in sync.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'public/showcase');
const PORT = 5199;
const BASE = `http://localhost:${PORT}/route-posters/`;

/** Output size: portrait, web-sized. Print-resolution exports would make the homepage crawl. */
const WIDTH = 900;
const HEIGHT = 1273;
const MAX_BYTES = 260_000;

/** Splash images are user-supplied artwork; only redraw them when asked. */
const withSplash = process.argv.includes('--splash');

async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Dev server did not start at ${url}`);
}

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  cwd: ROOT,
  stdio: 'ignore',
});

let browser;
try {
  await waitForServer(BASE);
  mkdirSync(OUT_DIR, { recursive: true });

  // Normally Playwright finds its own browser (`npx playwright install`). The override exists for
  // sandboxes that ship a Chromium at a fixed path.
  browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  );
  const page = await browser.newPage({ viewport: { width: 1500, height: 1500 } });
  page.on('pageerror', (e) => console.error('page error:', e.message));

  await page.goto(BASE, { waitUntil: 'networkidle' });

  // Force the poster to the exact output size, so an element screenshot needs no resampling.
  await page.addStyleTag({
    content: `.stage{padding:0 !important;align-items:flex-start !important}
      .stage__frame{width:${WIDTH}px !important;height:${HEIGHT}px !important;
      max-width:none !important;max-height:none !important;box-shadow:none !important}`,
  });

  // The app hands over its own manifest, so filenames and presets can never drift apart.
  const manifest = await page.evaluate(() => {
    const pick = (list) => list.map((i) => ({ image: i.image, preset: i.preset }));
    return {
      splash: pick(window.__routePosters.showcase.splash),
      gallery: pick(window.__routePosters.showcase.gallery),
    };
  });

  /*
   * The splash images are the ones a user supplies, so they are left alone unless explicitly
   * asked for. Regenerating them by default would mean the command that keeps the gallery fresh
   * also quietly destroys the artwork on the homepage.
   */
  const items = withSplash ? [...manifest.splash, ...manifest.gallery] : manifest.gallery;
  if (items.length === 0) throw new Error('The app exposed no showcase entries.');
  console.log(
    withSplash
      ? 'Rendering gallery and splash images.'
      : `Rendering gallery images. Leaving ${manifest.splash.length} splash images untouched (--splash to include them).`,
  );

  for (const { image, preset } of items) {
    await page.evaluate(async (p) => {
      const api = window.__routePosters;
      api.saveProject(await api.buildSampleProject(p));
    }, preset);

    await page.goto(`${BASE}create`, { waitUntil: 'networkidle' });
    await page.addStyleTag({
      content: `.stage{padding:0 !important;align-items:flex-start !important}
        .stage__frame{width:${WIDTH}px !important;height:${HEIGHT}px !important;
        max-width:none !important;max-height:none !important;box-shadow:none !important}`,
    });
    await page.waitForSelector('.stage__frame svg', { timeout: 20_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);

    const buffer = await page.locator('.stage__frame').screenshot({ type: 'png' });
    const path = resolve(OUT_DIR, image);
    writeFileSync(path, buffer);

    const { size } = statSync(path);
    const warn = size > MAX_BYTES ? '  ⚠ over budget' : '';
    console.log(`${image.padEnd(30)} ${(size / 1024).toFixed(0).padStart(4)} KB${warn}`);
  }
} finally {
  await browser?.close();
  server.kill();
}
