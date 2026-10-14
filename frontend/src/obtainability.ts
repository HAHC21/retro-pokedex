import { API, gameByKey, introGenForId, isAvailableInGame, isEventObtainableInGame, versionsForGame } from "./catalog";
import type { ObtainIndexResponse, ObtainMetaResponse } from "./schemas/obtainability";

const OBTAIN_VERSIONS_KEY = "pokedex-obtain-versions-v1";
const EVOLVES_FROM_KEY = "pokedex-evolves-from-v1";
const OBTAIN_INDEX_META_KEY = "pokedex-obtain-index-meta-v1";

/** Version names where this species can be obtained (wild, gift, NPC trade, starter, etc.). */
const obtainVersions = new Map<number, string[]>();
/** Parent species id, or null if base form / unknown after fetch. */
const evolvesFrom = new Map<number, number | null>();
const metaInflight = new Map<number, Promise<{ versions: string[]; evolves_from: number | null }>>();
/** Species present in each game's regional Pokédex (from /api/poke/regional). */
const regionalIdsByGame = new Map<string, Set<number>>();

let indexHydrated = false;
let indexInflight: Promise<void> | null = null;

function loadMap(key: string): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function persistMap(key: string, entries: Map<number, unknown>) {
  try {
    const payload: Record<string, unknown> = {};
    entries.forEach((value, id) => {
      payload[String(id)] = value;
    });
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

function hydrateCaches() {
  const versions = loadMap(OBTAIN_VERSIONS_KEY);
  Object.entries(versions).forEach(([id, value]) => {
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      obtainVersions.set(Number(id), value as string[]);
    }
  });
  const parents = loadMap(EVOLVES_FROM_KEY);
  Object.entries(parents).forEach(([id, value]) => {
    if (value === null || typeof value === "number") {
      evolvesFrom.set(Number(id), value);
    }
  });
  try {
    const meta = JSON.parse(localStorage.getItem(OBTAIN_INDEX_META_KEY) || "null") as { count?: number } | null;
    if (meta && Number(meta.count) >= 100 && obtainVersions.size >= 100 && evolvesFrom.size >= 100) {
      indexHydrated = true;
    }
  } catch {
    /* ignore */
  }
}

hydrateCaches();

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist() {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    persistMap(OBTAIN_VERSIONS_KEY, obtainVersions);
    persistMap(EVOLVES_FROM_KEY, evolvesFrom);
  }, 400);
}

function markIndexHydrated(count: number) {
  indexHydrated = count > 0;
  try {
    localStorage.setItem(OBTAIN_INDEX_META_KEY, JSON.stringify({ count, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

/** True when the National Dex obtain index has been loaded for this session. */
export function isObtainIndexReady() {
  return indexHydrated;
}

/**
 * One bulk fetch of encounter versions + evolves_from for the whole National Dex
 * (served from the slim Mongo obtain_index). Replaces N× `/pokemon/{id}/obtain` calls.
 */
export async function ensureObtainIndex(limit = 1025): Promise<void> {
  if (indexHydrated && obtainVersions.size >= Math.min(limit, 100)) {
    return;
  }
  if (indexInflight) {
    await indexInflight;
    return;
  }
  indexInflight = (async () => {
    try {
      const response = await fetch(`${API}/obtainability?limit=${limit}`);
      if (!response.ok) {
        throw new Error("Could not load obtainability index.");
      }
      const payload = (await response.json()) as ObtainIndexResponse;
      const count = Math.max(1, Number(payload.count) || limit);
      // Slim payload omits empty version lists and null parents — fill defaults.
      for (let id = 1; id <= count; id += 1) {
        obtainVersions.set(id, []);
        evolvesFrom.set(id, null);
      }
      Object.entries(payload.versions || {}).forEach(([id, versions]) => {
        if (Array.isArray(versions)) {
          obtainVersions.set(Number(id), versions);
        }
      });
      Object.entries(payload.evolves_from || {}).forEach(([id, parent]) => {
        if (typeof parent === "number") {
          evolvesFrom.set(Number(id), parent);
        }
      });
      markIndexHydrated(count);
      schedulePersist();
    } finally {
      indexInflight = null;
    }
  })();
  await indexInflight;
}

/** Record obtain versions from a backend detail/obtain response. */
export function rememberObtainVersions(pokemonId: number, versions: string[]) {
  obtainVersions.set(pokemonId, versions);
  schedulePersist();
}

export function rememberEvolvesFrom(pokemonId: number, parentId: number | null) {
  evolvesFrom.set(pokemonId, parentId);
  schedulePersist();
}

/** Cache regional-dex membership for a save (Paldea, Kalos, etc.). */
export function rememberRegionalDex(gameKey: string, ids: number[]) {
  regionalIdsByGame.set(gameKey, new Set(ids));
}

export function isRegionalDexMember(pokemonId: number, gameKey: string) {
  return regionalIdsByGame.get(gameKey)?.has(pokemonId) ?? false;
}

async function fetchObtainMeta(pokemonId: number): Promise<{ versions: string[]; evolves_from: number | null }> {
  if (obtainVersions.has(pokemonId) && evolvesFrom.has(pokemonId)) {
    return {
      versions: obtainVersions.get(pokemonId) || [],
      evolves_from: evolvesFrom.get(pokemonId) ?? null,
    };
  }
  if (!indexHydrated) {
    try {
      await ensureObtainIndex();
    } catch {
      /* fall through to per-id endpoint */
    }
  }
  if (obtainVersions.has(pokemonId) && evolvesFrom.has(pokemonId)) {
    return {
      versions: obtainVersions.get(pokemonId) || [],
      evolves_from: evolvesFrom.get(pokemonId) ?? null,
    };
  }
  const pending = metaInflight.get(pokemonId);
  if (pending) {
    return pending;
  }
  const task = (async () => {
    try {
      const meta = (await (await fetch(`${API}/pokemon/${pokemonId}/obtain`)).json()) as ObtainMetaResponse;
      const versions = meta.versions || [];
      const parent = meta.evolves_from ?? null;
      obtainVersions.set(pokemonId, versions);
      evolvesFrom.set(pokemonId, parent);
      schedulePersist();
      return { versions, evolves_from: parent };
    } catch {
      obtainVersions.set(pokemonId, []);
      evolvesFrom.set(pokemonId, null);
      schedulePersist();
      return { versions: [], evolves_from: null };
    } finally {
      metaInflight.delete(pokemonId);
    }
  })();
  metaInflight.set(pokemonId, task);
  return task;
}

function hasDirectObtain(versions: string[], gameKey: string): boolean {
  const allowed = versionsForGame(gameKey);
  if (allowed === null) {
    return true;
  }
  if (!allowed.length) {
    return false;
  }
  const set = new Set(allowed);
  return versions.some((name) => set.has(name));
}

/**
 * True when the species can be obtained in the selected save without player-to-player
 * trading or intergame transfer: wild catch, gift/starter/static, in-game NPC trade,
 * official event, regional-dex membership (covers games with incomplete PokéAPI encounters
 * such as Scarlet/Violet), or evolution from an obtainable pre-evolution.
 */
export async function isObtainableInGame(pokemonId: number, gameKey: string): Promise<boolean> {
  const game = gameByKey(gameKey);
  if (!game || game.g === 0) {
    return true;
  }
  if (!isAvailableInGame(pokemonId, gameKey)) {
    return false;
  }
  const maxGen = game.g;

  const visiting = new Set<number>();
  async function walk(id: number): Promise<boolean> {
    if (visiting.has(id)) {
      return false;
    }
    visiting.add(id);
    if (introGenForId(id) > maxGen) {
      return false;
    }
    if (isEventObtainableInGame(id, gameKey)) {
      return true;
    }
    if (isRegionalDexMember(id, gameKey)) {
      return true;
    }
    const meta = await fetchObtainMeta(id);
    if (hasDirectObtain(meta.versions, gameKey)) {
      return true;
    }
    if (meta.evolves_from && (await walk(meta.evolves_from))) {
      return true;
    }
    return false;
  }

  return walk(pokemonId);
}

/** Sync read when caches are warm; undefined means not resolved yet. */
export function isObtainableInGameCached(pokemonId: number, gameKey: string): boolean | undefined {
  const game = gameByKey(gameKey);
  if (!game || game.g === 0) {
    return true;
  }
  if (!isAvailableInGame(pokemonId, gameKey)) {
    return false;
  }
  if (isEventObtainableInGame(pokemonId, gameKey) || isRegionalDexMember(pokemonId, gameKey)) {
    return true;
  }
  if (!obtainVersions.has(pokemonId)) {
    return undefined;
  }
  const maxGen = game.g;

  const visiting = new Set<number>();
  function walk(id: number): boolean | undefined {
    if (visiting.has(id)) {
      return false;
    }
    visiting.add(id);
    if (introGenForId(id) > maxGen) {
      return false;
    }
    if (isEventObtainableInGame(id, gameKey) || isRegionalDexMember(id, gameKey)) {
      return true;
    }
    const versions = obtainVersions.get(id);
    if (!versions) {
      return undefined;
    }
    if (hasDirectObtain(versions, gameKey)) {
      return true;
    }
    if (!evolvesFrom.has(id)) {
      return undefined;
    }
    const parentId = evolvesFrom.get(id) ?? null;
    if (!parentId) {
      return false;
    }
    return walk(parentId);
  }

  return walk(pokemonId);
}

/** If this save is a version pair, the PokéAPI version this species is exclusive to. */
export async function exclusiveVersionForGame(pokemonId: number, gameKey: string): Promise<string | null> {
  const pair = versionsForGame(gameKey);
  if (!pair || pair.length < 2) {
    return null;
  }
  const allowed = new Set(pair);
  const visiting = new Set<number>();
  async function versionsInPair(id: number): Promise<Set<string>> {
    if (visiting.has(id)) {
      return new Set();
    }
    visiting.add(id);
    const meta = await fetchObtainMeta(id);
    const have = new Set(meta.versions.filter((name) => allowed.has(name)));
    if (!meta.evolves_from) {
      return have;
    }
    const parent = await versionsInPair(meta.evolves_from);
    parent.forEach((name) => have.add(name));
    return have;
  }
  const have = await versionsInPair(pokemonId);
  return have.size === 1 ? [...have][0] : null;
}

/** Warm version-exclusivity for visible checklist rows. */
export async function resolveExclusiveVersionsForIds(
  ids: number[],
  gameKey: string,
  onProgress?: (id: number, version: string | null) => void,
): Promise<Record<number, string | null>> {
  const results: Record<number, string | null> = {};
  const pair = versionsForGame(gameKey);
  if (!pair || pair.length < 2) {
    ids.forEach((id) => {
      results[id] = null;
      onProgress?.(id, null);
    });
    return results;
  }
  try {
    await ensureObtainIndex();
  } catch {
    /* per-id fallback */
  }
  for (const id of ids) {
    const version = await exclusiveVersionForGame(id, gameKey);
    results[id] = version;
    onProgress?.(id, version);
  }
  return results;
}

export async function resolveObtainabilityForIds(
  ids: number[],
  gameKey: string,
  onProgress?: (id: number, obtainable: boolean) => void,
): Promise<Record<number, boolean>> {
  try {
    await ensureObtainIndex();
  } catch {
    /* per-id fallback inside isObtainableInGame */
  }
  const results: Record<number, boolean> = {};
  // After the bulk index load, resolution is local/cache-only — no need to throttle.
  for (const id of ids) {
    const obtainable = await isObtainableInGame(id, gameKey);
    results[id] = obtainable;
    onProgress?.(id, obtainable);
  }
  return results;
}
