import { useEffect, useState } from 'react';
import { PosterFan } from '../components/site/PosterFan';
import { Link } from '../router';
import { hasSavedProject } from '../store/persistence';

export default function SplashPage() {
  // Read once on mount rather than during render: localStorage is not something React can
  // subscribe to, and the answer cannot change while this page is on screen.
  const [resuming, setResuming] = useState(false);
  useEffect(() => setResuming(hasSavedProject()), []);

  return (
    <main className="site splash">
      <PosterFan />

      <div className="splash__pitch">
        <h1 className="splash__headline">Your routes, worth putting on a wall</h1>
        <p className="splash__sub">
          Turn runs, rides and hikes into print-quality poster art. Choose a layout, pick what to
          show, and export a sharp PNG or a true-vector PDF for the print shop.
        </p>

        <Link to="/create" className="btn btn--primary btn--large">
          {resuming ? 'Continue your poster' : 'Create your poster'}
        </Link>

        <p className="splash__aside">
          Not ready to dig out your files? <Link to="/samples">Browse the samples</Link>.
        </p>
        <p className="note splash__privacy">
          Everything happens in your browser. Nothing is uploaded, and there is no account to make.
        </p>
      </div>
    </main>
  );
}
