import { useEffect, useMemo, useRef, useState } from 'react';
import type { Field, Poster } from '../types';
import { Poster as PosterView } from '../components/poster/Poster';
import { Panel } from '../components/editor/Panel';
import { TemplatePicker } from '../components/editor/TemplatePicker';
import { FieldToggles } from '../components/editor/FieldToggles';
import { ActivityList } from '../components/editor/ActivityList';
import { Dropzone } from '../components/editor/Dropzone';
import { ExportPanel } from '../components/editor/ExportPanel';
import { layoutPoster } from '../poster/layout';
import { PAPER_SIZES, getPaper, pageDimensions } from '../design/paper';
import { THEMES } from '../design/themes';
import { MAX_SLOTS } from '../templates/registry';
import { parseActivityFiles } from '../ingest';
import { Link } from '../router';
import {
  DEFAULT_FIELDS,
  activityMap,
  addActivities,
  emptyProject,
  moveSlot,
  removeActivity,
  setFieldsOnAllSlots,
  updateSlot,
  type Project,
} from '../store/project';
import {
  clearProject,
  loadProject,
  projectFromFile,
  projectToFile,
  saveProject,
} from '../store/persistence';
import { downloadBlob } from '../export/svg';

/**
 * The editor. Its state autosaves to localStorage on every change, so navigating away to the
 * splash or samples page and back restores the poster exactly as it was.
 */
export default function CreatePage() {
  const [project, setProject] = useState<Project>(() => loadProject());
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [importing, setImporting] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveProject(project);
  }, [project]);

  const activities = useMemo(() => activityMap(project.activities), [project.activities]);
  const model = useMemo(() => layoutPoster(project.poster, activities), [project.poster, activities]);

  const paper = getPaper(project.poster.paperId);
  const { width: pageW, height: pageH } = pageDimensions(
    paper,
    project.poster.orientation,
    project.poster.bleedMm,
  );

  const slotCount = project.poster.slots.length;
  const remaining = MAX_SLOTS - slotCount;
  const isEmpty = slotCount === 0;

  const patchPoster = (patch: Partial<Poster>) =>
    setProject((p) => ({ ...p, poster: { ...p.poster, ...patch } }));

  const importFiles = async (files: File[]) => {
    setImporting(true);
    setStatus(null);
    try {
      const { activities: parsed, errors } = await parseActivityFiles(files);
      const overflow = Math.max(parsed.length - remaining, 0);
      if (parsed.length > 0) setProject((p) => addActivities(p, parsed));

      const notes: string[] = [];
      if (parsed.length > 0) notes.push(`Added ${Math.min(parsed.length, remaining)}.`);
      if (overflow > 0) notes.push(`${overflow} skipped — ten is the maximum.`);
      for (const e of errors) notes.push(`${e.filename}: ${e.message}`);
      setStatus(
        notes.length > 0
          ? { text: notes.join(' '), error: parsed.length === 0 && errors.length > 0 }
          : null,
      );
    } catch (err) {
      setStatus({ text: err instanceof Error ? err.message : String(err), error: true });
    } finally {
      setImporting(false);
    }
  };

  const globalFields = project.poster.slots[0]?.fields ?? DEFAULT_FIELDS;
  const posterTitle = project.poster.header.title || 'route-poster';

  return (
    <div className="workspace">
        <main className="stage">
          {isEmpty ? (
            <div className="stage__empty">
              <h2>Nothing on the wall yet</h2>
              <p>
                Drop in GPX, TCX or FIT files and pick a layout. Everything happens in your browser;
                no files are uploaded anywhere.
              </p>
              <p>
                Haven't got a file to hand? <Link to="/samples">Start from a sample</Link>.
              </p>
            </div>
          ) : (
            <div className="stage__frame" style={{ aspectRatio: `${pageW} / ${pageH}` }}>
              <PosterView model={model} svgRef={svgRef} />
            </div>
          )}
        </main>

        <aside className="sidebar">
          <Panel title={`Activities (${slotCount})`}>
            <Dropzone onFiles={importFiles} disabled={importing || remaining === 0} remaining={remaining} />
            {status ? (
              <div className={`status${status.error ? ' status--error' : ''}`}>{status.text}</div>
            ) : null}
            {slotCount > 0 ? (
              <ActivityList
                poster={project.poster}
                activities={activities}
                units={project.poster.units}
                onMove={(from, to) => setProject((p) => moveSlot(p, from, to))}
                onRemove={(id) => setProject((p) => removeActivity(p, id))}
                onRename={(id, title) => setProject((p) => updateSlot(p, id, { titleOverride: title }))}
                onFieldsChange={(id, fields) => setProject((p) => updateSlot(p, id, { fields }))}
              />
            ) : null}
          </Panel>

          <Panel title="Layout">
            <TemplatePicker
              value={project.poster.templateId}
              activityCount={slotCount}
              onChange={(templateId) => patchPoster({ templateId })}
            />
            <div className="row">
              <div className="field">
                <label className="field__label" htmlFor="paper">
                  Size
                </label>
                <select
                  id="paper"
                  value={project.poster.paperId}
                  onChange={(e) => patchPoster({ paperId: e.target.value })}
                >
                  {PAPER_SIZES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="orientation">
                  Orientation
                </label>
                <select
                  id="orientation"
                  value={project.poster.orientation}
                  onChange={(e) =>
                    patchPoster({ orientation: e.target.value as Poster['orientation'] })
                  }
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
            </div>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={project.poster.bleedMm > 0}
                onChange={(e) => patchPoster({ bleedMm: e.target.checked ? 3 : 0 })}
              />
              <span>Add 3mm print bleed</span>
            </label>
          </Panel>

          <Panel title="Style">
            <div className="swatches">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className="swatch"
                  aria-pressed={project.poster.themeId === theme.id}
                  onClick={() => patchPoster({ themeId: theme.id })}
                  title={theme.name}
                >
                  <span className="swatch__preview" style={{ background: theme.background }}>
                    <span className="swatch__line" style={{ background: theme.route }} />
                  </span>
                  <span className="swatch__name">{theme.name}</span>
                </button>
              ))}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="units">
                Units
              </label>
              <select
                id="units"
                value={project.poster.units}
                onChange={(e) => patchPoster({ units: e.target.value as Poster['units'] })}
              >
                <option value="metric">Metric — km</option>
                <option value="imperial">Imperial — miles</option>
              </select>
            </div>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={project.poster.showCellTitles}
                onChange={(e) => patchPoster({ showCellTitles: e.target.checked })}
              />
              <span>Show a title on each map</span>
            </label>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={project.poster.normalizeScale}
                disabled={slotCount < 2}
                onChange={(e) => patchPoster({ normalizeScale: e.target.checked })}
              />
              <span>Draw all routes to the same scale</span>
            </label>
            <p className="note">
              With this on, a 5k looks shorter than a marathon instead of every route being
              stretched to fill its own box.
            </p>
          </Panel>

          <Panel title="Metadata">
            <p className="note">Applies to every map. Use the ⋯ menu on an activity to individually customise it.</p>
            <FieldToggles
              value={globalFields}
              onChange={(fields: Field[]) => setProject((p) => setFieldsOnAllSlots(p, fields))}
            />
          </Panel>

          <Panel title="Heading &amp; footer">
            <p className="note">
              Optional. A heading sits above the maps; leave these empty for a poster that is
              nothing but routes.
            </p>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={project.poster.header.show}
                onChange={(e) =>
                  patchPoster({ header: { ...project.poster.header, show: e.target.checked } })
                }
              />
              <span>Show poster heading</span>
            </label>
            <div className="field">
              <label className="field__label" htmlFor="title">
                Heading
              </label>
              <input
                id="title"
                type="text"
                placeholder="2026 in running"
                value={project.poster.header.title}
                onChange={(e) =>
                  patchPoster({ header: { ...project.poster.header, title: e.target.value } })
                }
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="subtitle">
                Subheading
              </label>
              <input
                id="subtitle"
                type="text"
                placeholder="Nine mornings worth remembering"
                value={project.poster.header.subtitle}
                onChange={(e) =>
                  patchPoster({ header: { ...project.poster.header, subtitle: e.target.value } })
                }
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="footer">
                Footer
              </label>
              <input
                id="footer"
                type="text"
                placeholder="Optional"
                value={project.poster.footer.text}
                onChange={(e) =>
                  patchPoster({ footer: { ...project.poster.footer, text: e.target.value } })
                }
              />
            </div>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={project.poster.footer.showPoweredByStrava}
                onChange={(e) =>
                  patchPoster({
                    footer: { ...project.poster.footer, showPoweredByStrava: e.target.checked },
                  })
                }
              />
              <span>Add “Powered by Strava”</span>
            </label>
          </Panel>

          <Panel title="Export">
            <ExportPanel
              svgRef={svgRef}
              widthMm={pageW}
              heightMm={pageH}
              title={posterTitle}
              disabled={isEmpty}
            />
          </Panel>

          <Panel title="Project" defaultOpen={false}>
            <p className="note">
              Your work is saved in this browser automatically. Save a project file to back it up or move it to
              another device. The project is saved in json format and can be reloaded here using the Open Project button.
            </p>
            <div className="inline">
              <button
                type="button"
                className="btn"
                disabled={isEmpty}
                onClick={() =>
                  downloadBlob(
                    new Blob([projectToFile(project)], { type: 'application/json' }),
                    'route-poster-project.json',
                  )
                }
              >
                Save project
              </button>
              <button type="button" className="btn" onClick={() => projectInputRef.current?.click()}>
                Open project
              </button>
            </div>
            <input
              ref={projectInputRef}
              type="file"
              accept="application/json,.json"
              className="visually-hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                try {
                  setProject(projectFromFile(await file.text()));
                  setStatus({ text: 'Project loaded.' });
                } catch (err) {
                  setStatus({
                    text: err instanceof Error ? err.message : String(err),
                    error: true,
                  });
                }
              }}
            />
            <hr className="rule" />
            <button
              type="button"
              className="btn btn--danger btn--block"
              disabled={isEmpty}
              onClick={() => {
                setProject(emptyProject());
                clearProject();
                setStatus(null);
              }}
            >
              Start over
            </button>
            <p className="note">Clears this poster and every activity on it.</p>
          </Panel>
        </aside>
    </div>
  );
}
