import { useState } from 'react';
import type { Activity, Field, Poster, Units } from '../../types';
import { formatDate } from '../../format/date';
import { formatDistance, formatSportType } from '../../format/units';
import { FieldToggles } from './FieldToggles';
import { unavailableFields } from '../../store/project';

export function ActivityList({
  poster,
  activities,
  units,
  onMove,
  onRemove,
  onRename,
  onFieldsChange,
}: {
  poster: Poster;
  activities: Map<string, Activity>;
  units: Units;
  onMove: (from: number, to: number) => void;
  onRemove: (activityId: string) => void;
  onRename: (activityId: string, title: string) => void;
  onFieldsChange: (activityId: string, fields: Field[]) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="stack">
      {poster.slots.map((slot, index) => {
        const activity = activities.get(slot.activityId);
        if (!activity) return null;
        const isOpen = expanded === slot.activityId;

        return (
          <div className="activity" key={slot.activityId}>
            <div className="activity__head">
              <span className="activity__index">{index + 1}</span>
              <input
                type="text"
                className="activity__title"
                value={slot.titleOverride ?? activity.name}
                onChange={(e) => onRename(slot.activityId, e.target.value)}
                aria-label={`Title for activity ${index + 1}`}
              />
              <div className="activity__actions">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => onMove(index, index - 1)}
                  disabled={index === 0}
                  aria-label="Move up"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => onMove(index, index + 1)}
                  disabled={index === poster.slots.length - 1}
                  aria-label="Move down"
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setExpanded(isOpen ? null : slot.activityId)}
                  aria-label="Customise fields"
                  title="Customise fields for this activity"
                  aria-expanded={isOpen}
                >
                  ⋯
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  onClick={() => onRemove(slot.activityId)}
                  aria-label="Remove"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="activity__meta">
              {formatSportType(activity.sportType)} · {formatDistance(activity.distanceM, units)}
              {activity.startDateLocal ? ` · ${formatDate(activity.startDateLocal, 'short')}` : ''}
            </div>

            {isOpen ? (
              <div className="activity__fields">
                <FieldToggles
                  value={slot.fields}
                  onChange={(fields) => onFieldsChange(slot.activityId, fields)}
                  disabledFields={unavailableFields(activity)}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
