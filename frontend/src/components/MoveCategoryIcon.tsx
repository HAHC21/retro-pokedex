/** Compact physical / special / status markers for learnset rows. */

import { getMessages } from "../i18n/runtime";

type MoveCategoryIconProps = {
  damageClass: string | null;
};

export function MoveCategoryIcon({ damageClass }: MoveCategoryIconProps) {
  const kind = damageClass === "physical" || damageClass === "special" || damageClass === "status" ? damageClass : null;
  if (!kind) {
    return <span className="pk-move-category pk-move-category-empty" aria-hidden="true" />;
  }

  const categories = getMessages().categories;
  const label = kind === "physical" ? categories.physical : kind === "special" ? categories.special : categories.status;

  return (
    <span className={`pk-move-category pk-move-category-${kind}`} title={label} aria-label={label}>
      {kind === "physical" ? (
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path
            fill="currentColor"
            d="M8 1.2 9.4 5.4 13.8 5.6 10.4 8.4 11.6 12.8 8 10.4 4.4 12.8 5.6 8.4 2.2 5.6 6.6 5.4Z"
          />
        </svg>
      ) : null}
      {kind === "special" ? (
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <circle cx="8" cy="8" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="8" cy="8" r="2.1" fill="currentColor" />
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            d="M8 2.8c2.2 1.4 3.4 3 3.4 5.2S10.2 12 8 13.2c-2.2-1.2-3.4-2.8-3.4-5.2S5.8 4.2 8 2.8Z"
          />
        </svg>
      ) : null}
      {kind === "status" ? (
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <circle cx="8" cy="8" r="5.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path fill="currentColor" d="M8 2.6a5.4 5.4 0 0 1 0 10.8V8.8a1.8 1.8 0 1 0 0-3.6V2.6Z" />
          <circle cx="8" cy="5.6" r="1" fill="currentColor" />
          <circle cx="8" cy="10.4" r="1" fill="#fff" />
        </svg>
      ) : null}
    </span>
  );
}
