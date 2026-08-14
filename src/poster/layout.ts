import type { Activity, Poster, Rect, Theme } from '../types';
import { getPaper, marginFor, pageDimensions } from '../design/paper';
import { getTheme } from '../design/themes';
import { getTemplate } from '../templates/registry';
import { computeBounds, fitScale, makeTransform, type Bounds } from '../geo/bounds';
import { mercatorScaleFactor, projectAll, type Point } from '../geo/project';
import { simplify, toPathData } from '../geo/simplify';
import { formatDate } from '../format/date';
import {
  formatDistance,
  formatDuration,
  formatElevation,
  formatPace,
  formatSportType,
  paceLabel,
} from '../format/units';

export interface StatEntry {
  label: string;
  value: string;
}

export interface RenderedCell {
  activityId: string;
  rect: Rect;
  mapRect: Rect;
  pathData: string;
  strokeWidth: number;
  title: string | null;
  titleSize: number;
  titleY: number;
  stats: StatEntry[];
  statColumns: number;
  /** Width of one stat column, capped so wide cells don't fling their figures apart. */
  statColWidth: number;
  statRect: Rect;
  labelSize: number;
  valueSize: number;
}

export interface RenderedPoster {
  width: number;
  height: number;
  bleed: number;
  theme: Theme;
  header: { title: string; subtitle: string; titleSize: number; subtitleSize: number; y: number } | null;
  footer: { text: string; size: number; y: number } | null;
  cells: RenderedCell[];
  /** Shared ground-metres-per-millimetre when scale normalisation is on. */
  sharedScale: number | null;
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/** Fraction of the map box left empty so routes never touch the cell edge. */
const MAP_PADDING = 0.06;

interface CellContent {
  title: string | null;
  stats: StatEntry[];
}

function cellContent(
  activity: Activity,
  poster: Poster,
  slotIndex: number,
): CellContent {
  const slot = poster.slots[slotIndex];
  const fields = new Set(slot.fields);
  const stats: StatEntry[] = [];

  if (fields.has('distance')) {
    stats.push({ label: 'Distance', value: formatDistance(activity.distanceM, poster.units) });
  }
  if (fields.has('time')) {
    stats.push({ label: 'Time', value: formatDuration(activity.movingTimeS) });
  }
  if (fields.has('pace')) {
    stats.push({
      label: paceLabel(activity.sportType),
      value: formatPace(activity.distanceM, activity.movingTimeS, poster.units, activity.sportType),
    });
  }
  if (fields.has('elevation')) {
    stats.push({ label: 'Elevation', value: formatElevation(activity.elevationGainM, poster.units) });
  }
  if (fields.has('date')) {
    stats.push({ label: 'Date', value: formatDate(activity.startDateLocal, 'short') });
  }
  if (fields.has('type')) {
    stats.push({ label: 'Activity', value: formatSportType(activity.sportType) });
  }
  if (fields.has('location') && activity.locationName) {
    stats.push({ label: 'Location', value: activity.locationName });
  }

  const title = poster.showCellTitles ? (slot.titleOverride ?? activity.name) : null;
  return { title, stats };
}

/**
 * Splits a cell into its map area and caption area. The caption is measured first — it needs
 * exactly as much room as its content — and the map takes whatever is left, which is what keeps
 * a stats-heavy poster from silently overlapping its routes.
 */
function measureCell(rect: Rect, content: CellContent) {
  const base = Math.min(rect.w, rect.h);
  const titleSize = content.title ? clamp(rect.w * 0.062, 3.2, 13) : 0;
  const labelSize = clamp(rect.w * 0.022, 1.5, 3.1);
  const valueSize = clamp(rect.w * 0.038, 2.2, 5.2);

  const statColumns =
    content.stats.length === 0
      ? 0
      : Math.max(1, Math.min(content.stats.length, Math.floor(rect.w / 22) || 1));
  const statRows = statColumns === 0 ? 0 : Math.ceil(content.stats.length / statColumns);

  /**
   * Stat columns are capped rather than simply dividing the cell width. In a full-width hero
   * cell, even spacing would fling four figures to the far corners of the page where they read
   * as unrelated fragments; keeping the columns tight holds them together as one block.
   */
  const statColWidth =
    statColumns === 0 ? 0 : Math.min(rect.w / statColumns, valueSize * 8.5);

  const titleBlock = content.title ? titleSize * 1.16 : 0;
  const statBlock = statRows * (labelSize * 1.5 + valueSize * 1.24);
  const gapAfterMap = titleBlock || statBlock ? base * 0.045 : 0;
  const captionH = titleBlock + statBlock + gapAfterMap;

  const mapRect: Rect = {
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: Math.max(rect.h - captionH, rect.h * 0.35),
  };

  return {
    mapRect,
    titleSize,
    labelSize,
    valueSize,
    statColumns,
    statColWidth,
    captionH,
    gapAfterMap,
  };
}

/** The map box actually used for fitting, inset so the route keeps some air around it. */
function paddedMapRect(mapRect: Rect): Rect {
  const pad = Math.min(mapRect.w, mapRect.h) * MAP_PADDING;
  return {
    x: mapRect.x + pad,
    y: mapRect.y + pad,
    w: Math.max(mapRect.w - pad * 2, 1),
    h: Math.max(mapRect.h - pad * 2, 1),
  };
}

interface PreparedTrack {
  points: Point[];
  bounds: Bounds;
  /** Mercator distortion at this activity's latitude, used to compare scales honestly. */
  distortion: number;
}

function prepareTrack(activity: Activity): PreparedTrack {
  const points = projectAll(activity.coords);
  const bounds = computeBounds(points);
  const midLat =
    activity.coords.reduce((sum, c) => sum + c[1], 0) / Math.max(activity.coords.length, 1);
  return { points, bounds, distortion: mercatorScaleFactor(midLat) };
}

/**
 * Builds everything needed to draw the poster. Pure: given the same poster and activities it
 * returns the same model, which is what lets the preview and both exporters share one code path.
 */
export function layoutPoster(poster: Poster, activities: Map<string, Activity>): RenderedPoster {
  const paper = getPaper(poster.paperId);
  const theme = getTheme(poster.themeId);
  const { width, height } = pageDimensions(paper, poster.orientation, poster.bleedMm);
  const margin = marginFor(width, height) + poster.bleedMm;
  const pageMin = Math.min(width, height);

  const headerTitleSize = clamp(pageMin * 0.052, 6, 30);
  const headerSubtitleSize = clamp(pageMin * 0.021, 2.6, 11);
  const footerSize = clamp(pageMin * 0.016, 2.2, 7);

  const headerText = poster.header.title.trim();
  const headerSub = poster.header.subtitle.trim();
  const showHeader = poster.header.show && (headerText !== '' || headerSub !== '');
  const headerHeight = showHeader
    ? headerTitleSize * (headerText ? 1.06 : 0) +
      headerSubtitleSize * (headerSub ? 2.0 : 0) +
      pageMin * 0.03
    : 0;

  const footerText = [
    poster.footer.text.trim(),
    poster.footer.showPoweredByStrava ? 'Powered by Strava' : '',
  ]
    .filter(Boolean)
    .join('   ·   ');
  const showFooter = poster.footer.show && footerText !== '';
  const footerHeight = showFooter ? footerSize * 2.6 : 0;

  const content: Rect = {
    x: margin,
    y: margin + headerHeight,
    w: width - margin * 2,
    h: height - margin * 2 - headerHeight - footerHeight,
  };

  const slots = poster.slots.filter((s) => activities.has(s.activityId));
  const template = getTemplate(poster.templateId);
  const gap = clamp(pageMin * 0.035, 3, 18);
  const rects = template.cells(content, slots.length, gap);

  // Measure every cell first: shared scaling needs to know each map box before any route is
  // fitted, since the boxes differ in size between templates like "Feature + three".
  const measured = slots.map((slot, i) => {
    const activity = activities.get(slot.activityId)!;
    const rect = rects[i] ?? rects[rects.length - 1] ?? content;
    const content_ = cellContent(activity, poster, poster.slots.indexOf(slot));
    const m = measureCell(rect, content_);
    return { slot, activity, rect, content: content_, ...m, track: prepareTrack(activity) };
  });

  /**
   * With normalisation on, every cell shares one ground-metres-per-millimetre. Dividing each
   * cell's required scale by its Mercator distortion converts to true ground units first, so
   * activities recorded at different latitudes stay comparable; the largest requirement wins,
   * guaranteeing nothing overflows its box.
   */
  let sharedScale: number | null = null;
  if (poster.normalizeScale && measured.length > 1) {
    sharedScale = measured.reduce((max, m) => {
      const needed = fitScale(m.track.bounds, paddedMapRect(m.mapRect)) / m.track.distortion;
      return Math.max(max, needed);
    }, 0);
  }

  const cells: RenderedCell[] = measured.map((m) => {
    const fitBox = paddedMapRect(m.mapRect);
    const scale = sharedScale === null ? undefined : sharedScale * m.track.distortion;
    const transform = makeTransform(m.track.bounds, fitBox, scale);
    const projected = m.track.points.map(transform);

    // Simplify in output space: a tolerance of a tenth of a millimetre is invisible in print
    // yet typically removes most of the points a 1-second-sampling device recorded.
    const simplified = simplify(projected, 0.1);
    const strokeWidth =
      clamp(Math.min(m.mapRect.w, m.mapRect.h) * 0.0115, 0.22, 2.4) * (m.slot.strokeScale ?? 1);

    const titleY = m.mapRect.y + m.mapRect.h + m.gapAfterMap + m.titleSize * 0.82;
    const statTop = titleY + (m.content.title ? m.titleSize * 0.5 : -m.titleSize * 0.3);

    return {
      activityId: m.slot.activityId,
      rect: m.rect,
      mapRect: m.mapRect,
      pathData: toPathData(simplified),
      strokeWidth,
      title: m.content.title,
      titleSize: m.titleSize,
      titleY,
      stats: m.content.stats,
      statColumns: m.statColumns,
      statColWidth: m.statColWidth,
      statRect: {
        x: m.rect.x,
        y: statTop,
        w: m.rect.w,
        h: Math.max(m.rect.y + m.rect.h - statTop, 0),
      },
      labelSize: m.labelSize,
      valueSize: m.valueSize,
    };
  });

  return {
    width,
    height,
    bleed: poster.bleedMm,
    theme,
    header: showHeader
      ? {
          title: headerText,
          subtitle: headerSub,
          titleSize: headerTitleSize,
          subtitleSize: headerSubtitleSize,
          y: margin + headerTitleSize * 0.86,
        }
      : null,
    footer: showFooter
      ? { text: footerText, size: footerSize, y: height - margin + footerSize * 0.4 }
      : null,
    cells,
    sharedScale,
  };
}
