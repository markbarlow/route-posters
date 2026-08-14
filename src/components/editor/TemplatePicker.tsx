import { TEMPLATES, type Template } from '../../templates/registry';

const GLYPH_W = 26;
const GLYPH_H = 34;

/**
 * The icon is drawn by running the template's own layout function, so it is always a true
 * miniature of what the template does rather than a hand-drawn approximation that can fall out
 * of step with the code.
 */
function Glyph({ template, count }: { template: Template; count: number }) {
  const cells = template.cells({ x: 0, y: 0, w: GLYPH_W, h: GLYPH_H }, count, 2);
  return (
    <svg
      className="template__glyph"
      width={GLYPH_W}
      height={GLYPH_H}
      viewBox={`0 0 ${GLYPH_W} ${GLYPH_H}`}
      aria-hidden="true"
    >
      {cells.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={Math.max(c.w, 0)} height={Math.max(c.h, 0)} rx={1} />
      ))}
    </svg>
  );
}

export function TemplatePicker({
  value,
  activityCount,
  onChange,
}: {
  value: string;
  activityCount: number;
  onChange: (id: string) => void;
}) {
  return (
    <div className="templates">
      {TEMPLATES.map((template) => {
        const fits = activityCount >= template.minSlots && activityCount <= template.maxSlots;
        const previewCount = Math.min(
          Math.max(activityCount || template.slots, template.minSlots),
          template.maxSlots,
        );
        return (
          <button
            key={template.id}
            type="button"
            className="template"
            aria-pressed={value === template.id}
            disabled={!fits}
            onClick={() => onChange(template.id)}
            title={
              fits
                ? template.description
                : `${template.name} needs ${
                    template.minSlots === template.maxSlots
                      ? template.minSlots
                      : `${template.minSlots}–${template.maxSlots}`
                  } activities`
            }
          >
            <Glyph template={template} count={previewCount} />
            <span className="template__name">{template.name}</span>
          </button>
        );
      })}
    </div>
  );
}
