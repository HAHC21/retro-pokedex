import { useEffect, useState, type ReactNode } from "react";
import { Blueprint } from "./Blueprint";

const MOBILE_QUERY = "(max-width: 700px)";

type FoldProps = {
  title: string;
  className?: string;
  children: ReactNode;
};

export function Fold({ title, className, children }: FoldProps) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    function onChange() {
      setMobile(media.matches);
    }
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <Blueprint className={["pk-fold", open ? "is-open" : "", className].filter(Boolean).join(" ")}>
      {mobile ? (
        <button
          type="button"
          className="pk-fold-toggle"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="pk-fold-title">{title}</span>
          <ChevronIcon />
        </button>
      ) : (
        <h3>{title}</h3>
      )}
      <div className="pk-fold-body">{children}</div>
    </Blueprint>
  );
}

function ChevronIcon() {
  return (
    <svg className="pk-fold-chevron" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m6 9 6 6 6-6"
      />
    </svg>
  );
}
