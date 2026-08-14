import { describe, expect, it } from 'vitest';
import {
  formatDistance,
  formatDuration,
  formatElevation,
  formatPace,
  formatSportType,
  paceStyleFor,
} from './units';
import { formatDate } from './date';

describe('formatDistance', () => {
  it('formats metric and imperial', () => {
    expect(formatDistance(10_000, 'metric')).toBe('10.00 km');
    expect(formatDistance(10_000, 'imperial')).toBe('6.21 mi');
  });

  it('drops a decimal place past 100 units so long rides stay compact', () => {
    expect(formatDistance(150_000, 'metric')).toBe('150.0 km');
  });
});

describe('formatDuration', () => {
  it('omits the hours component when there is none', () => {
    expect(formatDuration(125)).toBe('2:05');
    expect(formatDuration(3725)).toBe('1:02:05');
  });

  it('clamps negatives rather than emitting a broken string', () => {
    expect(formatDuration(-5)).toBe('0:00');
  });
});

describe('formatPace', () => {
  it('uses min/km for runs', () => {
    expect(formatPace(10_000, 3000, 'metric', 'Run')).toBe('5:00 /km');
  });

  it('uses min/mi in imperial', () => {
    expect(formatPace(1609.344, 480, 'imperial', 'Run')).toBe('8:00 /mi');
  });

  it('switches to speed for rides, because cyclists think in km/h', () => {
    expect(formatPace(30_000, 3600, 'metric', 'Ride')).toBe('30.0 km/h');
    expect(formatPace(30_000, 3600, 'imperial', 'VirtualRide')).toBe('18.6 mph');
  });

  it('uses per-100m for swims', () => {
    expect(formatPace(1000, 1200, 'metric', 'Swim')).toBe('2:00 /100m');
  });

  it('returns a dash rather than Infinity when there is no distance or time', () => {
    expect(formatPace(0, 100, 'metric', 'Run')).toBe('—');
    expect(formatPace(100, 0, 'metric', 'Run')).toBe('—');
  });
});

describe('paceStyleFor', () => {
  it('recognises sports regardless of separator or case', () => {
    expect(paceStyleFor('mountain_bike_ride')).toBe('speed');
    expect(paceStyleFor('MountainBikeRide')).toBe('speed');
    expect(paceStyleFor('Run')).toBe('pace');
    expect(paceStyleFor('OpenWaterSwim')).toBe('swim');
  });

  it('defaults unknown sports to pace', () => {
    expect(paceStyleFor('Kitesurfing')).toBe('pace');
  });
});

describe('formatElevation', () => {
  it('rounds to whole units and converts to feet', () => {
    expect(formatElevation(1234.6, 'metric')).toBe('1,235 m');
    expect(formatElevation(1000, 'imperial')).toBe('3,281 ft');
  });

  it('shows a dash when the file carried no elevation', () => {
    expect(formatElevation(null, 'metric')).toBe('—');
  });
});

describe('formatSportType', () => {
  it('splits camel case and underscores', () => {
    expect(formatSportType('VirtualRide')).toBe('Virtual Ride');
    expect(formatSportType('trail_run')).toBe('Trail Run');
  });
});

describe('formatDate', () => {
  it('formats each style', () => {
    const iso = '2026-03-09T06:45:00';
    expect(formatDate(iso, 'long')).toBe('9 March 2026');
    expect(formatDate(iso, 'short')).toBe('9 Mar 2026');
    expect(formatDate(iso, 'numeric')).toBe('09.03.2026');
    expect(formatDate(iso, 'monthYear')).toBe('March 2026');
    expect(formatDate(iso, 'year')).toBe('2026');
  });

  it('does not shift an early-morning activity onto the previous day', () => {
    // Parsing this as UTC and re-rendering in a negative-offset zone would say 8 March.
    expect(formatDate('2026-03-09T00:30:00', 'long')).toBe('9 March 2026');
  });

  it('handles a missing date', () => {
    expect(formatDate(null)).toBe('—');
  });
});
