import { useI18n } from "../i18n/context";
import { navBtnStyle } from "../format";
import { nextPreference } from "../theme/helpers";
import { useTheme } from "../theme/context";

type ThemeToggleProps = {
  variant?: "icon" | "menu";
  onPick?: () => void;
};

export function ThemeToggle({ variant = "icon", onPick }: ThemeToggleProps) {
  const { messages: m } = useI18n();
  const { theme, setPreference } = useTheme();
  const night = theme === "dark";
  const label = night ? m.theme.day : m.theme.night;

  function toggle() {
    setPreference(nextPreference(theme));
    onPick?.();
  }

  if (variant === "menu") {
    return (
      <button
        type="button"
        className="btn pk-nav"
        role="menuitem"
        style={navBtnStyle(night)}
        aria-pressed={night}
        onClick={toggle}
      >
        {label}
      </button>
    );
  }

  return (
    <span className="pk-header-theme">
      <button
        type="button"
        className="btn pk-nav pk-theme"
        style={navBtnStyle(night)}
        aria-pressed={night}
        aria-label={label}
        title={label}
        onClick={toggle}
      >
        {night ? <SunIcon /> : <MoonIcon />}
      </button>
    </span>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
      />
    </svg>
  );
}
