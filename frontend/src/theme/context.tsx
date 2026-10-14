import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { THEME_STORAGE_KEY, type Theme, type ThemePreference } from "./constants";
import { applyTheme, isThemePreference, persistPreference, readStoredPreference, systemTheme } from "./helpers";

type ThemeValue = {
  preference: ThemePreference;
  theme: Theme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readStoredPreference());
  const [system, setSystem] = useState<Theme>(() => systemTheme());
  const theme = preference === "system" ? system : preference;

  const setPreference = (next: ThemePreference) => {
    persistPreference(next);
    setPreferenceState(next);
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function onChange() {
      setSystem(media.matches ? "dark" : "light");
    }
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY) {
        return;
      }
      if (isThemePreference(event.newValue)) {
        setPreferenceState(event.newValue);
        return;
      }
      setPreferenceState("system");
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<ThemeValue>(() => ({ preference, theme, setPreference }), [preference, theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) {
    const preference = readStoredPreference();
    return {
      preference,
      theme: preference === "system" ? systemTheme() : preference,
      setPreference: () => undefined,
    };
  }
  return value;
}
