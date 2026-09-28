import type { ReactNode } from "react";

type ViewLoadingProps = {
  children: ReactNode;
};

const LOADING_MASCOT = "/pikachu_loading.gif";

/** View-level loading status: Pikachu gif stacked above the message. */
export function ViewLoading({ children }: ViewLoadingProps) {
  return (
    <div className="pk-status pk-view-loading" role="status" aria-busy="true" aria-live="polite">
      <div className="pk-view-loading-track" aria-hidden="true">
        <img
          className="pk-view-loading-mascot"
          src={LOADING_MASCOT}
          alt=""
          width={96}
          draggable={false}
        />
      </div>
      <span className="pk-view-loading-label">{children}</span>
    </div>
  );
}
