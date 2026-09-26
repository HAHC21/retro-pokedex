import { en } from "./en";
import { es } from "./es";

export type Locale = "en" | "es";

type DeepString<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepString<T[K]>;
};

export type Messages = DeepString<typeof en>;

export const LOCALES: Locale[] = ["en", "es"];

export const LOCALE_STORAGE_KEY = "pokedex-locale";
export const LANG_PROMPT_DISMISS_KEY = "pokedex-lang-prompt-dismissed";

const catalogs: Record<Locale, Messages> = { en, es };

let activeLocale: Locale = "en";
let active: Messages = en;

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "es";
}

export function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) {
      return stored;
    }
  } catch {
    /* private mode */
  }
  return "en";
}

export function bindLocale(locale: Locale) {
  activeLocale = locale;
  active = catalogs[locale];
}

export function getLocale(): Locale {
  return activeLocale;
}

export function getMessages(): Messages {
  return active;
}

export function messagesFor(locale: Locale): Messages {
  return catalogs[locale];
}

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = vars[key];
    return value === undefined ? "" : String(value);
  });
}

export function countryName(code: string, locale: Locale): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}
