import { useState, type ReactNode } from 'react';

export function Panel({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="panel">
      <button
        type="button"
        className="panel__header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="panel__title">{title}</span>
        <span className="panel__chevron" data-open={open} aria-hidden="true">
          ›
        </span>
      </button>
      {open ? <div className="panel__body">{children}</div> : null}
    </section>
  );
}
