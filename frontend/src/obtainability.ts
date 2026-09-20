import { API, gameByKey, introGenForId, isAvailableInGame, isEventObtainableInGame, versionsForGame } from "./catalog";

const OBTAIN_VERSIONS_KEY = "pokedex-obtain-versions-v1";
const EVOLVES_FROM_KEY = "pokedex-evolves-from-v1";

/** Version names where this species can be obtained (wild, gift, NPC trade, starter, etc.). */
const obtainVersions = new Map<number, string[]>();
/** Parent species id, or null if base form / unknown after fetch. */
const evolvesFrom = new Map<number, number | null>();
const metaInflight = new Map<number, Promise<{ versions: string[]; evolves_from: number | null }>>();
/** Species present in each game's regional Pokédex (from /api/poke/regional). */
const regionalIdsByGame = new Map<string, Set<number>>();

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
  const pending = metaInflight.get(pokemonId);
  if (pending) {
    return pending;
  }
  const task = (async () => {
    try {
      const meta = await (await fetch(`${API}/pokemon/${pokemonId}/obtain`)).json();
      const versions = (meta.versions || []) as string[];
      const parent = (meta.evolves_from ?? null) as number | null;
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

async function mapPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      await worker(items[index]);
    }
  }
  const agents = Array.from({ length: Math.min(limit, Math.max(1, items.length)) }, () => run());
  await Promise.all(agents);
}

/** Warm obtainability for a dex range (and evolution parents). Returns id → obtainable. */
export async function resolveObtainabilityForIds(
  ids: number[],
  gameKey: string,
  onProgress?: (id: number, obtainable: boolean) => void,
): Promise<Record<number, boolean>> {
  const results: Record<number, boolean> = {};
  await mapPool(ids, 6, async (id) => {
    const obtainable = await isObtainableInGame(id, gameKey);
    results[id] = obtainable;
    onProgress?.(id, obtainable);
  });
  return results;
}
