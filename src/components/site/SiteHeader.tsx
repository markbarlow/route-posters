import { Link, useRoute } from '../../router';

/**
 * Shared site chrome. On the splash page the nav is dropped (`minimal`) so the page stays a
 * single, uncluttered pitch — the call to action is the only route onward that matters there.
 */
export function SiteHeader({ minimal = false }: { minimal?: boolean }) {
  const route = useRoute();

  return (
    <header className="topbar">
      <Link to="/" className="topbar__brand">
        Route Posters
      </Link>
      <span className="topbar__tag">Print-ready art from your activities</span>
      <span className="topbar__spacer" />
      {minimal ? null : (
        <nav className="topbar__nav">
          <Link
            to="/create"
            className={`topbar__link${route === '/create' ? ' topbar__link--current' : ''}`}
          >
            Create
          </Link>
          <Link
            to="/samples"
            className={`topbar__link${route === '/samples' ? ' topbar__link--current' : ''}`}
          >
            Samples
          </Link>
        </nav>
      )}
    </header>
  );
}
