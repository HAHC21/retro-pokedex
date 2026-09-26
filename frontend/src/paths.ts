import { GAMES, clampGen, gameByKey, regionBySlug } from "./catalog";
import { formPath, isFormKind, isFormList, type FormList, type SpeciesForm } from "./forms";
import type { DexScope, StatusFilter, View } from "./types";

export type DetailSection = "home" | "spawns" | "specimens" | "moves";

export const DETAIL_SECTIONS: Array<{ id: DetailSection; label: string }> = [
  { id: "home", label: "Home" },
  { id: "spawns", label: "Spawns" },
  { id: "moves", label: "Moves" },
  { id: "specimens", label: "My Specimens" },
];

const GAME_KEYS = new Set(GAMES.map((entry) => entry.k));
const DETAIL_SECTION_IDS = new Set<string>(DETAIL_SECTIONS.map((entry) => entry.id));

export type AppPath = {
  view: View;
  game: string;
  gen: number;
  region: string | null;
  id: number | null;
  form: SpeciesForm | null;
  formList: FormList | null;
  section: DetailSection;
  q: string;
  status: StatusFilter;
  scope: DexScope;
};

const DEFAULT_PATH: AppPath = {
  view: "dash",
  game: "home",
  gen: 1,
  region: null,
  id: null,
  form: null,
  formList: null,
  section: "home",
  q: "",
  status: "all",
  scope: "national",
};

const DEX_PREFS_KEY = "pk-dex-prefs";
const LIST_VIEW_KEY = "pk-list-view";

export type ListView = "dex" | "checklist";

export function loadListView(): ListView {
  try {
    return localStorage.getItem(LIST_VIEW_KEY) === "checklist" ? "checklist" : "dex";
  } catch {
    return "dex";
  }
}

export function saveListView(view: ListView) {
  try {
    localStorage.setItem(LIST_VIEW_KEY, view);
  } catch {
    /* ignore quota */
  }
}

type DexPrefs = { gen: number; scope: DexScope };

export function loadDexPrefs(game: string): DexPrefs | null {
  try {
    const raw = JSON.parse(localStorage.getItem(DEX_PREFS_KEY) || "{}") as Record<string, unknown>;
    const entry = raw[game];
    if (!entry || typeof entry !== "object") {
      return null;
    }
    const gen = Number((entry as DexPrefs).gen);
    const scope = (entry as DexPrefs).scope;
    const nextScope: DexScope =
      scope === "regional" ? "regional" : scope === "generation" ? "generation" : "national";
    if (!Number.isFinite(gen) || gen < 1) {
      return null;
    }
    return { gen: Math.floor(gen), scope: nextScope };
  } catch {
    return null;
  }
}

/** Remember last dex region + national/regional scope per game save. */
export function saveDexPrefs(game: string, gen: number, scope: DexScope) {
  try {
    const raw = JSON.parse(localStorage.getItem(DEX_PREFS_KEY) || "{}") as Record<string, DexPrefs>;
    raw[game] = { gen: clampGen(gen), scope };
    localStorage.setItem(DEX_PREFS_KEY, JSON.stringify(raw));
  } catch {
    /* ignore quota */
  }
}

function parseGen(raw: string | undefined): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1) {
    return 1;
  }
  return clampGen(Math.floor(value));
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

/** Segments after the species id: kind, optional form name, then an optional section. */
function parseFormTail(tail: string[]): { form: SpeciesForm | null; section: DetailSection } {
  const [kind, second, third] = tail;
  if (!isFormKind(kind)) {
    return { form: null, section: parseSection(kind) };
  }
  if (!second || DETAIL_SECTION_IDS.has(second)) {
    if (kind === "regional" || kind === "variant") {
      return { form: null, section: "home" };
    }
    return { form: { kind, name: null }, section: parseSection(second) };
  }
  if (kind === "gmax") {
    return { form: { kind, name: null }, section: parseSection(second) };
  }
  return { form: { kind, name: second }, section: parseSection(third) };
}

function parseRegionSlug(raw: string | null | undefined): string | null {
  return regionBySlug(raw)?.slug ?? null;
}

/** Parse the browser location into app navigation state. Filters live in React state. */
export function parseAppPath(pathname: string, _search = ""): AppPath {
  const path = pathname.replace(/\/+$/, "") || "/";

  if (path === "/signin") {
    return { ...DEFAULT_PATH, view: "signin" };
  }
  if (path === "/login") {
    return { ...DEFAULT_PATH, view: "login" };
  }
  if (path === "/changelog") {
    return { ...DEFAULT_PATH, view: "changelog" };
  }
  if (path === "/roadmap") {
    return { ...DEFAULT_PATH, view: "roadmap" };
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

  if (parts.length === 1) {
    return {
      ...DEFAULT_PATH,
      view: "dash",
      game,
      gen: 1,
    };
  }

  if (parts[1] === "dex" || parts[1] === "checklist") {
    const listView = parts[1] === "checklist" ? "checklist" : "dex";
    if (listView === "dex" && parts[2] === "forms" && isFormList(parts[3])) {
      return {
        ...DEFAULT_PATH,
        view: listView,
        game,
        formList: parts[3],
      };
    }
    const regionSlug = parts[2] === "region" ? parseRegionSlug(parts[3]) : null;
    if (regionSlug) {
      return {
        ...DEFAULT_PATH,
        view: listView,
        game,
        region: regionSlug,
        scope: "generation",
      };
    }
    const gen = parts[2] === "gen" ? parseGen(parts[3]) : 1;
    return {
      ...DEFAULT_PATH,
      view: listView,
      game,
      gen,
    };
  }

  if (parts[1] === "pokemon") {
    const id = parsePokemonId(parts[2]);
    if (id == null) {
      return {
        ...DEFAULT_PATH,
        view: "dex",
        game,
      };
    }
    const tail = parseFormTail(parts.slice(3));
    return {
      ...DEFAULT_PATH,
      view: "mon",
      game,
      id,
      form: tail.form,
      section: tail.section,
    };
  }

  return {
    ...DEFAULT_PATH,
    view: "dash",
    game,
    gen: 1,
  };
}

/** Build a pathname from navigation state. Search, status, and scope stay in React state. */
export function buildAppPath(path: Partial<AppPath> & Pick<AppPath, "view" | "game">): string {
  const game = GAME_KEYS.has(path.game) ? path.game : "home";
  const gen = clampGen(path.gen ?? 1);

  if (path.view === "signin") {
    return "/signin";
  }
  if (path.view === "login") {
    return "/login";
  }
  if (path.view === "changelog") {
    return "/changelog";
  }
  if (path.view === "roadmap") {
    return "/roadmap";
  }
  if (path.view === "dash") {
    return `/${game}`;
  }
  const region = regionBySlug(path.region)?.slug ?? null;

  if (path.view === "dex" || path.view === "checklist") {
    if (path.view === "dex" && path.formList && isFormList(path.formList)) {
      return `/${game}/dex/forms/${path.formList}`;
    }
    if (region) {
      return `/${game}/${path.view}/region/${region}`;
    }
    return `/${game}/${path.view}/gen/${gen}`;
  }

  const id = Math.min(1025, Math.max(1, path.id ?? 1));
  const section = path.section && path.section !== "home" ? `/${path.section}` : "";
  return `/${game}/pokemon/${id}${formPath(path.form)}${section}`;
}

export function isKnownGame(gameKey: string): boolean {
  return GAME_KEYS.has(gameKey);
}
