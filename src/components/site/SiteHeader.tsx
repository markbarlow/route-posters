import { Link, useRoute } from '../../router';

/**
 * Shared site chrome: the brand, and links to the two places worth going. The nav renders on every
 * page including the splash, so the header is one consistent thing rather than something that
 * changes shape depending on where you landed.
 */
export function SiteHeader() {
  const route = useRoute();

  return (
    <header className="topbar">
      <Link to="/" className="topbar__brand">
        Route Posters
      </Link>
      <span className="topbar__tag">Print-ready art from your activities</span>
      <span className="topbar__spacer" />
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
    </header>
  );
}
