import { API, IDX_KEY, TYPES } from "./catalog";
import { rememberEvolvesFrom, rememberObtainVersions } from "./obtainability";
import type { WildEncounter } from "./encounters";
import type { DexIndex, EvolutionStep, MonPayload } from "./types";

export function loadCachedIndex(): DexIndex | null {
  try {
    const cached = localStorage.getItem(IDX_KEY);
    return cached ? (JSON.parse(cached) as DexIndex) : null;
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

export async function fetchNameIndex(): Promise<Record<number, string>> {
  const payload = await (await fetch(`${API}/index`)).json();
  const names: Record<number, string> = {};
  Object.entries(payload.names || {}).forEach(([id, name]) => {
    names[Number(id)] = String(name);
  });
  return names;
}

export async function fetchTypeMembership(typeName: string) {
  const payload = await (await fetch(`${API}/types/${typeName}`)).json();
  return { typeName, ids: (payload.ids || []) as number[] };
}

export { TYPES };

export async function fetchMon(id: number): Promise<MonPayload> {
  const payload = await (await fetch(`${API}/pokemon/${id}`)).json();
  rememberObtainVersions(id, payload.obtain_versions || []);
  rememberEvolvesFrom(id, payload.evolves_from ?? null);
  return {
    data: payload.data,
    species: payload.species,
    evo: (payload.evo || []) as EvolutionStep[],
    enc: [],
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
