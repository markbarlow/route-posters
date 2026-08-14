import { ALL_FIELDS, FIELD_LABELS, type Field } from '../../types';

export function FieldToggles({
  value,
  onChange,
  disabledFields = [],
}: {
  value: Field[];
  onChange: (fields: Field[]) => void;
  /** Fields with no data behind them, shown but unselectable. */
  disabledFields?: Field[];
}) {
  const selected = new Set(value);

  return (
    <div className="chips">
      {ALL_FIELDS.map((field) => {
        const disabled = disabledFields.includes(field);
        return (
          <button
            key={field}
            type="button"
            className="chip"
            aria-pressed={selected.has(field)}
            disabled={disabled}
            title={disabled ? 'No data for this field' : undefined}
            onClick={() => {
              const next = new Set(selected);
              if (next.has(field)) next.delete(field);
              else next.add(field);
              // Preserve the canonical order so stat blocks read consistently across cells.
              onChange(ALL_FIELDS.filter((f) => next.has(f)));
            }}
          >
            {FIELD_LABELS[field]}
          </button>
        );
      })}
    </div>
  );
}
