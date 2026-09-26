import { useEffect, useState } from "react";
import { Blueprint } from "./Blueprint";
import { detectLocationLanguage, type LocationHint } from "../i18n/detect";
import { countryName, LANG_PROMPT_DISMISS_KEY, messagesFor } from "../i18n/runtime";
import { useI18n } from "../i18n/context";

function dismissedSuggestion(): string | null {
  try {
    return localStorage.getItem(LANG_PROMPT_DISMISS_KEY);
  } catch {
    return null;
  }
}

function dismiss(locale: string) {
  try {
    localStorage.setItem(LANG_PROMPT_DISMISS_KEY, locale);
  } catch {
    /* private mode */
  }
}

export function LanguagePrompt() {
  const { locale, setLocale, fill } = useI18n();
  const [hint, setHint] = useState<LocationHint | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void detectLocationLanguage().then((next) => {
      if (!cancelled) {
        setHint(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (hidden || !hint || hint.suggested === locale || dismissedSuggestion() === hint.suggested) {
    return null;
  }

  const copy = messagesFor(hint.suggested).prompt;
  const country = countryName(hint.countryCode, hint.suggested);

  return (
    <Blueprint className="pk-lang-prompt">
      <div className="pk-lang-prompt-copy">
        <h2>{copy.title}</h2>
        <p>{fill(copy.body, { country })}</p>
      </div>
      <div className="pk-lang-prompt-actions">
        <button
          type="button"
          className="btn pk-nav"
          onClick={() => {
            setLocale(hint.suggested);
          }}
        >
          {copy.accept}
        </button>
        <button
          type="button"
          className="btn pk-nav"
          onClick={() => {
            dismiss(hint.suggested);
            setHidden(true);
          }}
        >
          {copy.decline}
        </button>
      </div>
    </Blueprint>
  );
}
