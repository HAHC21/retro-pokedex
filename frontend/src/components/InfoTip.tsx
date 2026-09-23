import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type InfoTipProps = {
  label: string;
  children: ReactNode;
  wide?: boolean;
};

/** Compact (i) control that reveals help text on click/tap (mobile-friendly). */
export function InfoTip({ label, children, wide = false }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const tipId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span className={`pk-info-tip${wide ? " is-wide" : ""}`} ref={rootRef}>
      <button
        type="button"
        className={`pk-info-tip-btn${open ? " is-open" : ""}`}
        aria-expanded={open}
        aria-controls={tipId}
        aria-label={label}
        title={label}
        onClick={() => setOpen((value) => !value)}
      >
        i
      </button>
      {open ? (
        <span className="pk-info-tip-panel" id={tipId} role="note">
          {children}
        </span>
      ) : null}
    </span>
  );
}
