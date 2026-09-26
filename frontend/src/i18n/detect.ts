import type { Locale } from "./runtime";

const SPANISH_COUNTRIES = new Set([
  "ES",
  "MX",
  "AR",
  "CO",
  "PE",
  "VE",
  "CL",
  "EC",
  "GT",
  "CU",
  "BO",
  "DO",
  "HN",
  "PY",
  "SV",
  "NI",
  "CR",
  "PA",
  "UY",
  "PR",
  "GQ",
]);

const ENGLISH_COUNTRIES = new Set([
  "US",
  "GB",
  "CA",
  "AU",
  "NZ",
  "IE",
  "ZA",
  "JM",
  "TT",
  "BB",
  "BS",
  "BZ",
  "GY",
  "SG",
  "PH",
]);

const CACHE_KEY = "pokedex-location-lang";

export type LocationHint = {
  countryCode: string;
  suggested: Locale;
};

function suggestedLocale(countryCode: string): Locale | null {
  if (SPANISH_COUNTRIES.has(countryCode)) {
    return "es";
  }
  if (ENGLISH_COUNTRIES.has(countryCode)) {
    return "en";
  }
  return null;
}

function readCache(): LocationHint | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as LocationHint;
    if (parsed && (parsed.suggested === "en" || parsed.suggested === "es") && parsed.countryCode) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function lookupCountry(): Promise<string | null> {
  const response = await fetch("https://ipwho.is/");
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as { success?: boolean; country_code?: string };
  if (!payload.success || !payload.country_code) {
    return null;
  }
  return payload.country_code.toUpperCase();
}

/** Country from the network address, used only to offer a language. */
export async function detectLocationLanguage(): Promise<LocationHint | null> {
  const cached = readCache();
  if (cached) {
    return cached;
  }
  try {
    const countryCode = await lookupCountry();
    if (!countryCode) {
      return null;
    }
    const suggested = suggestedLocale(countryCode);
    if (!suggested) {
      return null;
    }
    const hint = { countryCode, suggested };
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(hint));
    } catch {
      /* ignore */
    }
    return hint;
  } catch {
    return null;
  }
}
