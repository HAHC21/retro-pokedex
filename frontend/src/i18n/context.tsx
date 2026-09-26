import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  bindLocale,
  fill,
  getMessages,
  LANG_PROMPT_DISMISS_KEY,
  LOCALE_STORAGE_KEY,
  readStoredLocale,
  type Locale,
  type Messages,
} from "./runtime";

type I18nValue = {
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => void;
  fill: typeof fill;
};

const I18nContext = createContext<I18nValue | null>(null);

function persistLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    localStorage.setItem(LANG_PROMPT_DISMISS_KEY, locale === "en" ? "es" : "en");
  } catch {
    /* private mode */
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = readStoredLocale();
    bindLocale(stored);
    return stored;
  });

  bindLocale(locale);
  const messages = getMessages();

  const setLocale = (next: Locale) => {
    persistLocale(next);
    bindLocale(next);
    setLocaleState(next);
  };

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = messages.meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", messages.meta.description);
    document.querySelector('meta[property="og:locale"]')?.setAttribute("content", locale === "es" ? "es_ES" : "en_US");
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", messages.meta.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", messages.meta.description);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute("content", messages.meta.title);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute("content", messages.meta.description);
  }, [locale, messages]);

  const value = useMemo<I18nValue>(() => ({ locale, messages, setLocale, fill }), [locale, messages]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) {
    bindLocale(readStoredLocale());
    return {
      locale: readStoredLocale(),
      messages: getMessages(),
      setLocale: () => undefined,
      fill,
    };
  }
  return value;
}
