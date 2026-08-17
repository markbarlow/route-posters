import { useState } from 'react';
import { SAMPLE_GALLERY, showcaseImageUrl, type ShowcaseItem } from '../showcase';
import { buildSampleProject } from '../samples';
import { saveProject } from '../store/persistence';
import { navigate } from '../router';

export default function SamplesPage() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Builds the project, saves it, then navigates. The editor reads localStorage on mount, so
   * handing work between pages needs no shared state — the same mechanism that already lets a
   * poster survive a reload.
   */
  const open = async (item: ShowcaseItem) => {
    setBusy(item.id);
    setError(null);
    try {
      saveProject(await buildSampleProject(item.preset));
      navigate('/create');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(null);
    }
  };

  return (
    <main className="site">
      <header className="site__head">
        <h1 className="site__title">Samples</h1>
        <p className="site__lede">
          Nine example activities, arranged a few different ways. Open any of them in the editor to
          pull it apart, change the layout, or swap in your own files.
        </p>
      </header>

      {error ? <div className="status status--error">{error}</div> : null}

      <ul className="gallery">
        {SAMPLE_GALLERY.map((item) => (
          <li key={item.id} className="gallery__item">
            <div className="gallery__frame">
              <img
                src={showcaseImageUrl(item.image)}
                alt={item.description}
                width={900}
                height={1273}
                loading="lazy"
              />
            </div>
            <div className="gallery__body">
              <h2 className="gallery__title">{item.title}</h2>
              <p className="gallery__desc">{item.description}</p>
              <button
                type="button"
                className="btn btn--block"
                disabled={busy !== null}
                onClick={() => open(item)}
              >
                {busy === item.id ? 'Opening…' : 'Open in editor'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
