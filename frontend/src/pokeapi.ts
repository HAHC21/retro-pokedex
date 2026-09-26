import { API, IDX_KEY } from "./catalog";
import { formFromStorageKey, type SpeciesForm } from "./forms";
import { rememberEvolvesFrom, rememberObtainVersions } from "./obtainability";
import type { WildEncounter } from "./encounters";
import type { DexIndex, EvolutionStep, MonPayload } from "./types";

export function loadCachedIndex(): DexIndex | null {
  try {
    const cached = localStorage.getItem(IDX_KEY);
    if (!cached) {
      return null;
    }
    const index = JSON.parse(cached) as DexIndex;
    return { names: index.names || {}, types: index.types || {}, rarity: index.rarity || {} };
  } catch {
    return null;
  }
}

export function saveIndex(index: DexIndex) {
  try {
    localStorage.setItem(IDX_KEY, JSON.stringify(index));
  } catch {
    /* ignore quota */
  }
}

/** One request: National Dex names + pokemon_id → type names (replaces /index + N× /types). */
export async function fetchCatalog(): Promise<DexIndex> {
  const payload = await (await fetch(`${API}/catalog`)).json();
  const names: Record<number, string> = {};
  Object.entries(payload.names || {}).forEach(([id, name]) => {
    names[Number(id)] = String(name);
  });
  const types: Record<number, string[]> = {};
  Object.entries(payload.types || {}).forEach(([id, typeNames]) => {
    if (Array.isArray(typeNames)) {
      types[Number(id)] = typeNames.map(String);
    }
  });
  const rarity: DexIndex["rarity"] = {};
  const mythicalIds = Array.isArray(payload.mythicals) ? payload.mythicals : [];
  const legendaryIds = Array.isArray(payload.legendaries) ? payload.legendaries : [];
  mythicalIds.forEach((id: unknown) => {
    const pokedexId = Number(id);
    if (Number.isFinite(pokedexId)) {
      rarity[pokedexId] = "mythical";
    }
  });
  legendaryIds.forEach((id: unknown) => {
    const pokedexId = Number(id);
    if (Number.isFinite(pokedexId) && !rarity[pokedexId]) {
      rarity[pokedexId] = "legendary";
    }
  });
  const pseudoIds = Array.isArray(payload.pseudos) ? payload.pseudos : [];
  pseudoIds.forEach((id: unknown) => {
    const pokedexId = Number(id);
    if (Number.isFinite(pokedexId) && !rarity[pokedexId]) {
      rarity[pokedexId] = "pseudo";
    }
  });
  const fossilIds = Array.isArray(payload.fossils) ? payload.fossils : [];
  fossilIds.forEach((id: unknown) => {
    const pokedexId = Number(id);
    if (Number.isFinite(pokedexId) && !rarity[pokedexId]) {
      rarity[pokedexId] = "fossil";
    }
  });
  const starterIds = Array.isArray(payload.starters) ? payload.starters : [];
  starterIds.forEach((id: unknown) => {
    const pokedexId = Number(id);
    if (Number.isFinite(pokedexId) && !rarity[pokedexId]) {
      rarity[pokedexId] = "starter";
    }
  });
  return { names, types, rarity };
}

export type CatalogForm = {
  pokedexId: number;
  form: SpeciesForm;
  resourceId: number;
  types: string[];
  capture: boolean;
  spriteForm: string | null;
};

export async function fetchForms(): Promise<CatalogForm[]> {
  const payload = await (await fetch(`${API}/forms`)).json();
  const rows = Array.isArray(payload.forms) ? payload.forms : [];
  const forms: CatalogForm[] = [];
  rows.forEach((row: { pokedex_id?: number; form?: string; resource_id?: number; types?: string[]; capture?: boolean; sprite_form?: string | null }) => {
    const form = formFromStorageKey(String(row.form || ""));
    const pokedexId = Number(row.pokedex_id);
    const resourceId = Number(row.resource_id);
    const spriteForm = typeof row.sprite_form === "string" && row.sprite_form ? row.sprite_form : null;
    if (!form || !Number.isFinite(pokedexId) || !Number.isFinite(resourceId)) {
      return;
    }
    forms.push({
      pokedexId,
      form,
      resourceId,
      types: Array.isArray(row.types) ? row.types.map(String) : [],
      capture: row.capture === true,
      spriteForm,
    });
  });
  return forms;
}

export async function fetchMon(id: number): Promise<MonPayload> {
  const payload = await (await fetch(`${API}/pokemon/${id}`)).json();
  rememberObtainVersions(id, payload.obtain_versions || []);
  rememberEvolvesFrom(id, payload.evolves_from ?? null);
  return {
    data: payload.data,
    species: payload.species,
    evo: (payload.evo || []) as EvolutionStep[],
    enc: [],
    overview: typeof payload.overview === "string" ? payload.overview : null,
    capture: payload.capture !== false,
    games: Array.isArray(payload.games) ? payload.games : [],
  };
}

export async function fetchSpawns(id: number): Promise<WildEncounter[]> {
  const payload = await (await fetch(`${API}/pokemon/${id}/spawns`)).json();
  return (payload.enc || []) as WildEncounter[];
}

export type LearnsetMove = {
  id: number;
  name: string;
  level: number;
  type: string | null;
  damage_class: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  priority: number;
};

export type LearnsetGroup = {
  method: string;
  label: string;
  moves: LearnsetMove[];
};

export type LearnsetPayload = {
  game: string;
  groups: LearnsetGroup[];
  catalog_count: number;
};

export async function fetchLearnset(id: number, gameKey: string): Promise<LearnsetPayload> {
  const payload = await (await fetch(`${API}/pokemon/${id}/moves?game=${encodeURIComponent(gameKey)}`)).json();
  return {
    game: payload.game || gameKey,
    groups: (payload.groups || []) as LearnsetGroup[],
    catalog_count: Number(payload.catalog_count) || 0,
  };
}

export type MovesetCard = {
  name: string;
  role?: string | null;
  moves: string[];
  notes?: string | null;
  format?: string;
  source: string;
};

export type SmogonMovesetsPayload = {
  game: string;
  sets: MovesetCard[];
  attribution: string;
  attribution_url: string;
  format: string | null;
};

export type AiMovesetsPayload = {
  game: string;
  available: boolean;
  provider: string | null;
  message: string | null;
  sets: MovesetCard[];
};

export async function fetchSmogonMovesets(id: number, gameKey: string): Promise<SmogonMovesetsPayload> {
  const payload = await (await fetch(`${API}/pokemon/${id}/movesets/smogon?game=${encodeURIComponent(gameKey)}`)).json();
  return {
    game: payload.game || gameKey,
    sets: (payload.sets || []) as MovesetCard[],
    attribution: payload.attribution || "Smogon University",
    attribution_url: payload.attribution_url || "https://www.smogon.com/",
    format: payload.format ?? null,
  };
}

export const GEMINI_UNAVAILABLE_MESSAGE =
  "We apologize, AI suggestions by Gemini is not available right now.";

export async function fetchAiMovesets(id: number, gameKey: string): Promise<AiMovesetsPayload> {
  try {
    const response = await fetch(`${API}/pokemon/${id}/movesets/ai?game=${encodeURIComponent(gameKey)}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        game: gameKey,
        available: false,
        provider: null,
        message: GEMINI_UNAVAILABLE_MESSAGE,
        sets: [],
      };
    }
    return {
      game: payload.game || gameKey,
      available: payload.available !== false,
      provider: payload.provider ?? null,
      message: payload.available === false ? GEMINI_UNAVAILABLE_MESSAGE : payload.message ?? null,
      sets: (payload.sets || []) as MovesetCard[],
    };
  } catch {
    return {
      game: gameKey,
      available: false,
      provider: null,
      message: GEMINI_UNAVAILABLE_MESSAGE,
      sets: [],
    };
  }
}

export async function refreshAiMovesets(id: number, gameKey: string): Promise<AiMovesetsPayload> {
  const response = await fetch(
    `${API}/pokemon/${id}/movesets/ai/refresh?game=${encodeURIComponent(gameKey)}`,
    { method: "POST", credentials: "include" },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof payload.detail === "string" ? payload.detail : GEMINI_UNAVAILABLE_MESSAGE,
    );
  }
  return {
    game: payload.game || gameKey,
    available: payload.available !== false,
    provider: payload.provider ?? null,
    message: payload.available === false ? GEMINI_UNAVAILABLE_MESSAGE : payload.message ?? null,
    sets: (payload.sets || []) as MovesetCard[],
  };
}


export type RegionalDex = {
  game: string;
  ids: number[];
  numbers: Record<number, number>;
};

export async function fetchRegionalDex(gameKey: string): Promise<RegionalDex> {
  const payload = await (await fetch(`${API}/regional/${gameKey}`)).json();
  const numbers: Record<number, number> = {};
  (payload.entries || []).forEach((entry: { id: number; number: number }) => {
    numbers[entry.id] = entry.number;
  });
  return {
    game: payload.game || gameKey,
    ids: (payload.ids || []) as number[],
    numbers,
  };
}
