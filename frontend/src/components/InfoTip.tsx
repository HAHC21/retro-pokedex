import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

type InfoTipProps = {
  label: string;
  children: ReactNode;
  wide?: boolean;
};

const VIEW_MARGIN = 8;

function keepPanelInView(panel: HTMLElement) {
  panel.style.transform = "";
  panel.style.top = "";
  panel.style.bottom = "";
  const box = panel.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  let dx = 0;
  if (box.right > vw - VIEW_MARGIN) {
    dx -= box.right - (vw - VIEW_MARGIN);
  }
  if (box.left + dx < VIEW_MARGIN) {
    dx += VIEW_MARGIN - (box.left + dx);
  }
  if (dx) {
    panel.style.transform = `translateX(${dx}px)`;
  }
  const next = panel.getBoundingClientRect();
  if (next.bottom > vh - VIEW_MARGIN) {
    panel.style.top = "auto";
    panel.style.bottom = "calc(100% + 8px)";
  }
}

/** Compact (i) control that reveals help text on click/tap (mobile-friendly). */
export function InfoTip({ label, children, wide = false }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);
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

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const panel = panelRef.current;
    if (!panel) {
      return;
    }
    function place() {
      if (panelRef.current) {
        keepPanelInView(panelRef.current);
      }
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
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
        <span className="pk-info-tip-panel" id={tipId} role="note" ref={panelRef}>
          {children}
        </span>
      ) : null}
    </span>
  );
}
