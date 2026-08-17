import { describe, expect, it } from 'vitest';
import { toHref, toRoute } from './router';

const BASE = '/strava-posters/';

describe('toRoute', () => {
  it('maps the deployed paths onto routes', () => {
    expect(toRoute('/strava-posters/', BASE)).toBe('/');
    expect(toRoute('/strava-posters/create', BASE)).toBe('/create');
    expect(toRoute('/strava-posters/samples', BASE)).toBe('/samples');
  });

  it('tolerates a trailing slash', () => {
    expect(toRoute('/strava-posters/create/', BASE)).toBe('/create');
  });

  it('works when served from the domain root, as on a custom domain', () => {
    expect(toRoute('/create', '/')).toBe('/create');
    expect(toRoute('/', '/')).toBe('/');
  });

  it('falls back to the splash for anything unrecognised', () => {
    // GitHub Pages serves 404.html for these, so the app still boots and must show something.
    expect(toRoute('/strava-serve/nope', BASE)).toBe('/');
    expect(toRoute('/strava-posters/create/deeper', BASE)).toBe('/');
    expect(toRoute('/strava-posters/CREATE', BASE)).toBe('/');
  });

  it('does not mistake a path that merely starts with the base name', () => {
    expect(toRoute('/strava-posters-old/create', BASE)).toBe('/');
  });
});

describe('toHref', () => {
  it('re-adds the base', () => {
    expect(toHref('/', BASE)).toBe('/strava-posters/');
    expect(toHref('/create', BASE)).toBe('/strava-posters/create');
  });

  it('works at the domain root', () => {
    expect(toHref('/', '/')).toBe('/');
    expect(toHref('/create', '/')).toBe('/create');
  });

  it('round-trips every route', () => {
    for (const base of [BASE, '/']) {
      for (const route of ['/', '/create', '/samples'] as const) {
        expect(toRoute(toHref(route, base), base)).toBe(route);
      }
    }
  });
});
