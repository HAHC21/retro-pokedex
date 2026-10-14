export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_PREFERENCES = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const THEME_STORAGE_KEY = "pokedex-theme";
export const THEME_LIGHT_COLOR = "#fefcfc";
export const THEME_DARK_COLOR = "#14161a";
