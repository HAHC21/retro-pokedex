import { API, gameByKey, isAvailableInGame, isEventObtainableInGame } from "./catalog";
import { gameLabel } from "./progress";

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

function cacheKey(pokemonId: number, gameKey: string) {
  return `${gameKey}:${pokemonId}:v4`;
}

async function fetchAcquisitionText(pokemonId: number, gameKey: string): Promise<string> {
  const key = cacheKey(pokemonId, gameKey);
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const pending = inflight.get(key);
  if (pending) {
    return pending;
  }
  const task = (async () => {
    try {
      const payload = await (await fetch(`${API}/pokemon/${pokemonId}/acquisition?game=${encodeURIComponent(gameKey)}`)).json();
      const text = typeof payload.text === "string" ? payload.text : "";
      cache.set(key, text);
      return text;
    } catch {
      cache.set(key, "");
      return "";
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, task);
  return task;
}

/** Human-readable how-to-obtain line for the selected save. */
export function acquisitionFallback(
  pokemonId: number,
  gameKey: string,
  obtainable: boolean | undefined,
  apiText: string,
): string {
  if (gameKey === "home") {
    return "Pokémon HOME";
  }
  if (isEventObtainableInGame(pokemonId, gameKey)) {
    return apiText || "Event distribution";
  }
  if (obtainable === false) {
    if (isAvailableInGame(pokemonId, gameKey) && gameByKey(gameKey)) {
      return "Trade from another game";
    }
    return `Not available in ${gameLabel(gameKey)}`;
  }
  if (apiText) {
    return apiText;
  }
  if (obtainable === true) {
    return `Available in ${gameLabel(gameKey)}`;
  }
  return "Checking…";
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

/** Warm acquisition labels for visible checklist rows. */
export async function resolveAcquisitionForIds(
  ids: number[],
  gameKey: string,
  onProgress?: (id: number, text: string) => void,
): Promise<Record<number, string>> {
  const results: Record<number, string> = {};
  if (gameKey === "home") {
    ids.forEach((id) => {
      results[id] = "Pokémon HOME";
      onProgress?.(id, "Pokémon HOME");
    });
    return results;
  }
  await mapPool(ids, 6, async (id) => {
    const text = await fetchAcquisitionText(id, gameKey);
    results[id] = text;
    onProgress?.(id, text);
  });
  return results;
}
