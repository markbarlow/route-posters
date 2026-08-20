import { useCallback, useEffect, useSyncExternalStore, type ReactNode, type MouseEvent } from 'react';

/**
 * A very small router. Three static routes do not justify a dependency, and the surface here
 * deliberately mirrors the shape of a real one, so swapping in react-router later is mechanical.
 */
export const ROUTES = ['/', '/create', '/samples'] as const;
export type Route = (typeof ROUTES)[number];

/**
 * The site is served from a sub-path on GitHub Pages ("/route-posters/"), so every path has to
 * be translated in both directions. Getting this wrong is the most likely bug in the whole
 * module, which is why both halves are pure and tested.
 */
export function basePath(): string {
  return import.meta.env.BASE_URL || '/';
}

/** Strips the deployment base off a location pathname, yielding a leading-slash route. */
export function toRoute(pathname: string, base = basePath()): Route {
  let path = pathname;
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  if (trimmedBase && path.startsWith(trimmedBase)) path = path.slice(trimmedBase.length);
  if (!path.startsWith('/')) path = `/${path}`;
  // Tolerate a trailing slash so "/create/" is the same page as "/create".
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);

  return (ROUTES as readonly string[]).includes(path) ? (path as Route) : '/';
}

/** Turns a route into a real href, including the deployment base. */
export function toHref(route: Route, base = basePath()): string {
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return route === '/' ? `${trimmedBase}/` : `${trimmedBase}${route}`;
}

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('popstate', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', listener);
  };
}

function currentPath(): string {
  return window.location.pathname;
}

export function navigate(route: Route): void {
  const href = toHref(route);
  if (window.location.pathname !== href) {
    window.history.pushState(null, '', href);
    notify();
  }
  window.scrollTo(0, 0);
}

/** The active route, re-rendering on pushState and on back/forward. */
export function useRoute(): Route {
  const pathname = useSyncExternalStore(subscribe, currentPath, () => basePath());
  return toRoute(pathname);
}

const TITLES: Record<Route, string> = {
  '/': 'Route Posters — print-ready art from your activities',
  '/create': 'Create a poster — Route Posters',
  '/samples': 'Samples — Route Posters',
};

export function useDocumentTitle(route: Route): void {
  useEffect(() => {
    document.title = TITLES[route];
  }, [route]);
}

export function Link({
  to,
  children,
  className,
  onNavigate,
}: {
  to: Route;
  children: ReactNode;
  className?: string;
  onNavigate?: () => void;
}) {
  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      // Leave modified clicks alone so "open in new tab" keeps working.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      e.preventDefault();
      onNavigate?.();
      navigate(to);
    },
    [to, onNavigate],
  );

  return (
    <a href={toHref(to)} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}
