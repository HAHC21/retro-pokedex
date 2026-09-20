import { GAMES, clampGenForGame, gameByKey } from "./catalog";
import type { DexScope, StatusFilter, View } from "./types";

export type DetailSection = "home" | "basic" | "spawns" | "moves";

export const DETAIL_SECTIONS: Array<{ id: DetailSection; label: string }> = [
  { id: "home", label: "Home" },
  { id: "basic", label: "Basic" },
  { id: "spawns", label: "Spawns" },
  { id: "moves", label: "Moves" },
];

const GAME_KEYS = new Set(GAMES.map((entry) => entry.k));
const DETAIL_SECTION_IDS = new Set<string>(DETAIL_SECTIONS.map((entry) => entry.id));
const STATUS_VALUES = new Set<string>([
  "all",
  "missing",
  "missing-normal",
  "missing-shiny",
  "normal",
  "shiny",
]);

export type AppPath = {
  view: View;
  game: string;
  gen: number;
  id: number | null;
  section: DetailSection;
  q: string;
  status: StatusFilter;
  scope: DexScope;
};

const DEFAULT_PATH: AppPath = {
  view: "dash",
  game: "home",
  gen: 1,
  id: null,
  section: "home",
  q: "",
  status: "all",
  scope: "national",
};

const DEX_PREFS_KEY = "pk-dex-prefs";

type DexPrefs = { gen: number; scope: DexScope };

function loadDexPrefs(game: string): DexPrefs | null {
  try {
    const raw = JSON.parse(localStorage.getItem(DEX_PREFS_KEY) || "{}") as Record<string, unknown>;
    const entry = raw[game];
    if (!entry || typeof entry !== "object") {
      return null;
    }
    const gen = Number((entry as DexPrefs).gen);
    const scope = (entry as DexPrefs).scope === "regional" ? "regional" : "national";
    if (!Number.isFinite(gen) || gen < 1) {
      return null;
    }
    return { gen: Math.floor(gen), scope };
  } catch {
    return null;
  }
}

/** Remember last dex region + national/regional scope per game save. */
export function saveDexPrefs(game: string, gen: number, scope: DexScope) {
  try {
    const raw = JSON.parse(localStorage.getItem(DEX_PREFS_KEY) || "{}") as Record<string, DexPrefs>;
    raw[game] = { gen: clampGenForGame(gen, game), scope };
    localStorage.setItem(DEX_PREFS_KEY, JSON.stringify(raw));
  } catch {
    /* ignore quota */
  }
}

function parseGen(raw: string | undefined, game: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1) {
    return clampGenForGame(1, game);
  }
  return clampGenForGame(Math.floor(value), game);
}

function parsePokemonId(raw: string | undefined): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1 || value > 1025) {
    return null;
  }
  return Math.floor(value);
}

function parseSection(raw: string | undefined): DetailSection {
  if (raw && DETAIL_SECTION_IDS.has(raw) && raw !== "home") {
    return raw as DetailSection;
  }
  return "home";
}

function parseStatus(raw: string | null): StatusFilter {
  if (raw && STATUS_VALUES.has(raw)) {
    return raw as StatusFilter;
  }
  return "all";
}

function parseScope(raw: string | null): DexScope {
  return raw === "regional" ? "regional" : "national";
}

/** Parse the browser location into app navigation state. */
export function parseAppPath(pathname: string, search = ""): AppPath {
  const path = pathname.replace(/\/+$/, "") || "/";
  const params = new URLSearchParams(search);

  if (path === "/signin") {
    return { ...DEFAULT_PATH, view: "signin" };
  }
  if (path === "/login") {
    return { ...DEFAULT_PATH, view: "login" };
  }

  const parts = path.split("/").filter(Boolean);
  if (!parts.length) {
    return { ...DEFAULT_PATH };
  }

  const gameKey = parts[0];
  if (!GAME_KEYS.has(gameKey)) {
    return { ...DEFAULT_PATH };
  }

  const game = gameByKey(gameKey)?.k || "home";
  const q = params.get("q") || "";
  const status = parseStatus(params.get("status"));
  const scope = parseScope(params.get("scope"));

  if (parts.length === 1) {
    return {
      ...DEFAULT_PATH,
      view: "dash",
      game,
      gen: clampGenForGame(1, game),
      q,
      status,
      scope,
    };
  }

  if (parts[1] === "dex") {
    const gen =
      parts[2] === "gen" ? parseGen(parts[3], game) : clampGenForGame(Number(params.get("gen")) || 1, game);
    return {
      ...DEFAULT_PATH,
      view: "dex",
      game,
      gen,
      q,
      status,
      scope,
    };
  }

  if (parts[1] === "pokemon") {
    const id = parsePokemonId(parts[2]);
    const stored = loadDexPrefs(game);
    const gen = clampGenForGame(Number(params.get("gen")) || stored?.gen || 1, game);
    const scope = params.has("scope")
      ? parseScope(params.get("scope"))
      : params.has("gen")
        ? "national"
        : (stored?.scope ?? "national");
    if (id == null) {
      return {
        ...DEFAULT_PATH,
        view: "dex",
        game,
        gen,
        q,
        status,
        scope,
      };
    }
    return {
      ...DEFAULT_PATH,
      view: "mon",
      game,
      gen,
      id,
      section: parseSection(parts[3]),
      q,
      status,
      scope,
    };
  }

  return {
    ...DEFAULT_PATH,
    view: "dash",
    game,
    gen: clampGenForGame(1, game),
  };
}

function dexSearch(path: AppPath): string {
  const params = new URLSearchParams();
  if (path.q.trim()) {
    params.set("q", path.q.trim());
  }
  if (path.status !== "all") {
    params.set("status", path.status);
  }
  if (path.scope === "regional") {
    params.set("scope", "regional");
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Persist dex context on detail URLs so Back / Prev / Next keep region + scope. */
function detailSearch(path: AppPath): string {
  const params = new URLSearchParams();
  params.set("gen", String(clampGenForGame(path.gen ?? 1, path.game)));
  if (path.q.trim()) {
    params.set("q", path.q.trim());
  }
  if (path.status !== "all") {
    params.set("status", path.status);
  }
  if (path.scope === "regional") {
    params.set("scope", "regional");
  }
  return `?${params.toString()}`;
}

/** Build a pathname (+ optional query) from navigation state. */
export function buildAppPath(path: Partial<AppPath> & Pick<AppPath, "view" | "game">): string {
  const game = GAME_KEYS.has(path.game) ? path.game : "home";
  const gen = clampGenForGame(path.gen ?? 1, game);

  if (path.view === "signin") {
    return "/signin";
  }
  if (path.view === "login") {
    return "/login";
  }
  if (path.view === "dash") {
    return `/${game}`;
  }
  if (path.view === "dex") {
    return `/${game}/dex/gen/${gen}${dexSearch({
      view: "dex",
      game,
      gen,
      id: null,
      section: "home",
      q: path.q ?? "",
      status: path.status ?? "all",
      scope: path.scope ?? "national",
    })}`;
  }

  const id = Math.min(1025, Math.max(1, path.id ?? 1));
  const section = path.section && path.section !== "home" ? `/${path.section}` : "";
  return `/${game}/pokemon/${id}${section}${detailSearch({
    view: "mon",
    game,
    gen,
    id,
    section: path.section ?? "home",
    q: path.q ?? "",
    status: path.status ?? "all",
    scope: path.scope ?? "national",
  })}`;
}

export function isKnownGame(gameKey: string): boolean {
  return GAME_KEYS.has(gameKey);
}
