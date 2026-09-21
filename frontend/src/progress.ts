import { GAMES, PROG_KEY } from "./catalog";
import type { MarkEntry, MarkKey, Progress } from "./types";

export function loadProgress(): Progress {
  try {
    const raw = JSON.parse(localStorage.getItem(PROG_KEY) || "{}") as Record<string, unknown>;
    const clean: Progress = {};
    Object.keys(raw).forEach((key) => {
      const value = raw[key];
      if (value && typeof value === "object" && !("caught" in value) && !("shiny" in value)) {
        clean[key] = value as Record<string, MarkEntry>;
      }
    });
    return clean;
  } catch {
    return {};
  }
}

export function saveProgress(prog: Progress) {
  try {
    localStorage.setItem(PROG_KEY, JSON.stringify(prog));
  } catch {
    /* ignore quota */
  }
}

export function clearProgress() {
  try {
    localStorage.removeItem(PROG_KEY);
  } catch {
    /* ignore */
  }
}

export function entryFor(prog: Progress, game: string, id: number): MarkEntry {
  return prog[game]?.[String(id)] || {};
}

export function unionFor(prog: Progress, id: number) {
  let caught = false;
  let shiny = false;
  const where: string[] = [];
  Object.keys(prog).forEach((key) => {
    const entry = prog[key]?.[String(id)];
    if (entry && (entry.caught || entry.shiny)) {
      caught = caught || !!entry.caught;
      shiny = shiny || !!entry.shiny;
      where.push(key);
    }
  });
  const order = new Map(GAMES.map((game, index) => [game.k, index]));
  where.sort((left, right) => (order.get(left) ?? 999) - (order.get(right) ?? 999));
  return { caught, shiny, where };
}

export function patchMark(prog: Progress, game: string, id: number, patch: MarkEntry): Progress {
  return {
    ...prog,
    [game]: {
      ...(prog[game] || {}),
      [String(id)]: { ...(prog[game]?.[String(id)] || {}), ...patch },
    },
  };
}

export function toggleMark(prog: Progress, game: string, id: number, key: MarkKey): Progress {
  const next = !entryFor(prog, game, id)[key];
  return patchMark(prog, game, id, {
    [key]: next,
    [`${key}At`]: next ? Date.now() : null,
  });
}

export function unionSets(prog: Progress) {
  const caught: Record<number, true> = {};
  const shiny: Record<number, true> = {};
  const any: Record<number, true> = {};
  Object.values(prog).forEach((game) => {
    Object.entries(game).forEach(([id, entry]) => {
      const num = Number(id);
      if (entry.caught) {
        caught[num] = true;
        any[num] = true;
      }
      if (entry.shiny) {
        shiny[num] = true;
        any[num] = true;
      }
    });
  });
  return { caught, shiny, any };
}

export function gameLabel(key: string) {
  return GAMES.find((game) => game.k === key)?.l ?? key;
}

/** Union two progress maps: true wins; newer timestamp wins when both set. */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const out: Progress = {};
  const games = new Set([...Object.keys(a), ...Object.keys(b)]);
  games.forEach((game) => {
    const left = a[game] || {};
    const right = b[game] || {};
    const ids = new Set([...Object.keys(left), ...Object.keys(right)]);
    const bucket: Record<string, MarkEntry> = {};
    ids.forEach((id) => {
      const merged = mergeMarkEntry(left[id] || {}, right[id] || {});
      if (merged.caught || merged.shiny) {
        bucket[id] = merged;
      }
    });
    if (Object.keys(bucket).length) {
      out[game] = bucket;
    }
  });
  return out;
}

function mergeMarkEntry(left: MarkEntry, right: MarkEntry): MarkEntry {
  const caught = !!(left.caught || right.caught);
  const shiny = !!(left.shiny || right.shiny);
  const next: MarkEntry = {};
  if (caught) {
    next.caught = true;
    next.caughtAt = newerStamp(left.caughtAt, right.caughtAt);
  }
  if (shiny) {
    next.shiny = true;
    next.shinyAt = newerStamp(left.shinyAt, right.shinyAt);
  }
  return next;
}

function newerStamp(a?: number | null, b?: number | null): number | null {
  const left = typeof a === "number" && a > 0 ? a : 0;
  const right = typeof b === "number" && b > 0 ? b : 0;
  const value = Math.max(left, right);
  return value > 0 ? value : null;
}

export function isProgressEmpty(prog: Progress): boolean {
  return !Object.values(prog).some((game) => Object.keys(game || {}).length > 0);
}
