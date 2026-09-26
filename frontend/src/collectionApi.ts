import { API_ORIGIN } from "./apiBase";
import type { MarkEntry, Progress } from "./types";

const API = `${API_ORIGIN}/api/collection`;

export async function fetchCollectionProgress(): Promise<Progress | null> {
  try {
    const response = await fetch(`${API}/progress`, { credentials: "include" });
    if (response.status === 401) {
      return null;
    }
    if (!response.ok) {
      throw new Error("Could not load collection.");
    }
    const payload = (await response.json()) as { progress?: Progress };
    return payload.progress || {};
  } catch {
    return null;
  }
}

export async function syncCollectionProgress(
  progress: Progress,
  mode: "merge" | "replace" = "merge",
): Promise<Progress | null> {
  const response = await fetch(`${API}/progress`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ progress, mode }),
  });
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error("Could not sync collection.");
  }
  const payload = (await response.json()) as { progress?: Progress };
  return payload.progress || {};
}

export async function upsertCollectionMark(
  game: string,
  pokemonId: number,
  mark: MarkEntry,
  form = "base",
): Promise<void> {
  const response = await fetch(
    `${API}/marks/${encodeURIComponent(game)}/${pokemonId}?form=${encodeURIComponent(form)}`,
    {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      caught: !!mark.caught,
      caughtAt: mark.caughtAt ?? null,
      caughtMale: !!mark.caughtMale,
      caughtFemale: !!mark.caughtFemale,
      shiny: !!mark.shiny,
      shinyAt: mark.shinyAt ?? null,
      shinyMale: !!mark.shinyMale,
      shinyFemale: !!mark.shinyFemale,
    }),
  },
  );
  if (response.status === 401) {
    return;
  }
  if (!response.ok) {
    throw new Error("Could not save mark.");
  }
}

export type StatBlock = {
  hp?: number | null;
  attack?: number | null;
  defense?: number | null;
  special_attack?: number | null;
  special_defense?: number | null;
  speed?: number | null;
};

export type OwnedMove = {
  slot: number;
  move_id?: number | null;
  name?: string | null;
  pp?: number | null;
  pp_ups?: number | null;
};

export type OwnedPokemon = {
  owned_id: string;
  pokemon_id: number;
  game_key: string | null;
  nickname: string | null;
  level: number | null;
  gender: string | null;
  shiny: boolean;
  ability_name: string | null;
  ability_slot: number | null;
  nature: string | null;
  held_item: string | null;
  species_slug: string | null;
  source_type: string;
  raw_format?: string | null;
  ot_name?: string | null;
  ball?: string | null;
  met_game?: string | null;
  met_location?: string | null;
  met_level?: number | null;
  met_date?: string | null;
  fateful_encounter?: boolean;
  egg_location?: string | null;
  moves?: OwnedMove[];
  ivs: StatBlock | null;
  evs: StatBlock | null;
  stats?: StatBlock | null;
  created_at: string;
  updated_at: string;
};

export type OwnedPokemonList = {
  items: OwnedPokemon[];
  collected_abilities: string[];
  collected_natures: string[];
};

export type OwnedPokemonInput = {
  pokemon_id: number;
  game_key?: string | null;
  nickname?: string | null;
  level?: number | null;
  gender?: string | null;
  shiny?: boolean;
  ability_name?: string | null;
  ability_slot?: number | null;
  nature?: string | null;
  held_item?: string | null;
  species_slug?: string | null;
  source_type?: string | null;
  raw_format?: string | null;
  ot_name?: string | null;
  ball?: string | null;
  met_game?: string | null;
  met_location?: string | null;
  met_level?: number | null;
  met_date?: string | null;
  fateful_encounter?: boolean;
  egg_location?: string | null;
  moves?: OwnedMove[];
  ivs?: StatBlock | null;
  evs?: StatBlock | null;
  stats?: StatBlock | null;
};

export type OwnedIndexRow = {
  pokemon_id: number;
  species_slug?: string | null;
  form_slug?: string | null;
  source_type: string;
};

export async function fetchOwnedIndex(): Promise<OwnedIndexRow[] | null> {
  try {
    const response = await fetch(`${API}/owned/index`, { credentials: "include" });
    if (response.status === 401) {
      return null;
    }
    if (!response.ok) {
      throw new Error("Could not load collection.");
    }
    const payload = (await response.json()) as { items?: OwnedIndexRow[] };
    return payload.items || [];
  } catch {
    return null;
  }
}

export async function fetchOwnedPokemon(
  pokemonId: number,
  gameKey?: string,
): Promise<OwnedPokemonList | null> {
  const params = new URLSearchParams({ pokemon_id: String(pokemonId) });
  if (gameKey) {
    params.set("game", gameKey);
  }
  const response = await fetch(`${API}/owned?${params}`, { credentials: "include" });
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error("Could not load owned Pokémon.");
  }
  return (await response.json()) as OwnedPokemonList;
}

export async function createOwnedPokemon(input: OwnedPokemonInput): Promise<OwnedPokemon> {
  const response = await fetch(`${API}/owned`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.detail === "string" ? payload.detail : "Could not add Pokémon.");
  }
  return payload as OwnedPokemon;
}

export async function deleteOwnedPokemon(ownedId: string): Promise<void> {
  const response = await fetch(`${API}/owned/${encodeURIComponent(ownedId)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok && response.status !== 404) {
    throw new Error("Could not remove Pokémon.");
  }
}

export type PokemonImportResult = {
  import_id: string;
  filename: string;
  status: string;
  message?: string;
  owned?: OwnedPokemon;
};

/** Send already-decrypted specimen fields from a client-side PK parse. */
export async function uploadParsedOwnedPokemon(
  input: OwnedPokemonInput & { filename?: string },
): Promise<OwnedPokemon> {
  const response = await fetch(`${API}/owned/from-pk`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.detail === "string" ? payload.detail : "Could not save uploaded Pokémon.");
  }
  return payload as OwnedPokemon;
}

export type OwnedPokemonBatchResult = {
  import_id: string;
  saved: number;
  failed: number;
  errors: Array<{ index: number; filename?: string | null; error: string }>;
};

const BATCH_CHUNK = 100;

/** Parse-already-done specimens from a folder dump; sent in chunks. */
export async function uploadParsedOwnedPokemonBatch(
  items: Array<OwnedPokemonInput & { filename?: string }>,
  filename?: string,
): Promise<OwnedPokemonBatchResult> {
  const totals: OwnedPokemonBatchResult = { import_id: "", saved: 0, failed: 0, errors: [] };
  for (let start = 0; start < items.length; start += BATCH_CHUNK) {
    const chunk = items.slice(start, start + BATCH_CHUNK);
    const response = await fetch(`${API}/owned/from-pk-batch`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: chunk, filename: filename || `${items.length} pk files` }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(typeof payload.detail === "string" ? payload.detail : "Could not save uploaded Pokémon.");
    }
    const result = payload as OwnedPokemonBatchResult;
    totals.import_id = result.import_id || totals.import_id;
    totals.saved += result.saved;
    totals.failed += result.failed;
    totals.errors.push(
      ...result.errors.map((entry) => ({
        ...entry,
        index: start + entry.index,
      })),
    );
  }
  return totals;
}
