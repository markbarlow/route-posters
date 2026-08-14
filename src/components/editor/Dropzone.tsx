import { useRef, useState } from 'react';
import { ACCEPT_ATTRIBUTE } from '../../ingest';

export function Dropzone({
  onFiles,
  disabled,
  remaining,
}: {
  onFiles: (files: File[]) => void;
  disabled: boolean;
  remaining: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    onFiles(Array.from(list));
  };

  return (
    <>
      <button
        type="button"
        className="dropzone"
        data-dragging={dragging}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) handle(e.dataTransfer.files);
        }}
      >
        <strong>{disabled ? 'Poster is full' : 'Drop activity files here'}</strong>
        <span className="dropzone__hint">
          {disabled
            ? 'Remove one to add another (ten maximum)'
            : `GPX, TCX or FIT · room for ${remaining} more`}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        className="visually-hidden"
        onChange={(e) => {
          handle(e.target.files);
          // Reset so re-selecting the same file still fires a change event.
          e.target.value = '';
        }}
      />
    </>
  );
}
