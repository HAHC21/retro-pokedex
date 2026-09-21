import { useEffect, type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: "md" | "wide" | "xl";
};

export function Modal({ open, title, onClose, children, size = "md" }: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="dialog-backdrop pk-modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`dialog pk-modal${size === "wide" ? " is-wide" : ""}${size === "xl" ? " is-xl" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pk-modal-title"
      >
        <div className="pk-modal-head">
          <h2 id="pk-modal-title" className="dialog-title">
            {title}
          </h2>
          <button type="button" className="btn btn-ghost pk-nav" onClick={onClose} aria-label="Close">
            Close
          </button>
        </div>
        <div className="dialog-body pk-modal-body">{children}</div>
      </div>
    </div>
  );
}
