import { GAMES, PROG_KEY } from "./catalog";
import { localizedGame } from "./i18n/labels";
import { markKey, type SpeciesForm } from "./forms";
import type { MarkEntry, MarkKey, Progress } from "./types";

export type GenderChoice = "male" | "female";

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

export function entryFor(prog: Progress, game: string, id: number, form: SpeciesForm | null = null): MarkEntry {
  return prog[game]?.[markKey(id, form)] || {};
}

export function unionFor(prog: Progress, id: number, form: SpeciesForm | null = null) {
  const key = markKey(id, form);
  let caught = false;
  let shiny = false;
  let caughtMale = false;
  let caughtFemale = false;
  let shinyMale = false;
  let shinyFemale = false;
  const where: string[] = [];
  Object.keys(prog).forEach((gameKey) => {
    const entry = prog[gameKey]?.[key];
    if (entry && (entry.caught || entry.shiny)) {
      caught = caught || !!entry.caught;
      shiny = shiny || !!entry.shiny;
      caughtMale = caughtMale || !!entry.caughtMale;
      caughtFemale = caughtFemale || !!entry.caughtFemale;
      shinyMale = shinyMale || !!entry.shinyMale;
      shinyFemale = shinyFemale || !!entry.shinyFemale;
      where.push(gameKey);
    }
  });
  const order = new Map(GAMES.map((game, index) => [game.k, index]));
  where.sort((left, right) => (order.get(left) ?? 999) - (order.get(right) ?? 999));
  return { caught, shiny, caughtMale, caughtFemale, shinyMale, shinyFemale, where };
}

export function patchMark(
  prog: Progress,
  game: string,
  id: number,
  patch: MarkEntry,
  form: SpeciesForm | null = null,
): Progress {
  const key = markKey(id, form);
  return {
    ...prog,
    [game]: {
      ...(prog[game] || {}),
      [key]: { ...(prog[game]?.[key] || {}), ...patch },
    },
  };
}

export function toggleMark(
  prog: Progress,
  game: string,
  id: number,
  key: MarkKey,
  form: SpeciesForm | null = null,
): Progress {
  const next = !entryFor(prog, game, id, form)[key];
  const cleared: MarkEntry =
    key === "caught"
      ? { caughtMale: false, caughtFemale: false }
      : { shinyMale: false, shinyFemale: false };
  return patchMark(
    prog,
    game,
    id,
    {
      [key]: next,
      [`${key}At`]: next ? Date.now() : null,
      ...(next ? {} : cleared),
    },
    form,
  );
}

const GENDER_FIELD: Record<MarkKey, Record<GenderChoice, keyof MarkEntry>> = {
  caught: { male: "caughtMale", female: "caughtFemale" },
  shiny: { male: "shinyMale", female: "shinyFemale" },
};

/** Move one form's mark from one game to another. Flags already stored on the destination stay. */
export function moveMark(
  prog: Progress,
  fromGame: string,
  toGame: string,
  id: number,
  form: SpeciesForm | null = null,
): Progress {
  if (!fromGame || !toGame || fromGame === toGame) {
    return prog;
  }
  const key = markKey(id, form);
  const source = prog[fromGame]?.[key];
  if (!source || (!source.caught && !source.shiny)) {
    return prog;
  }
  const merged = mergeMarkEntry(source, prog[toGame]?.[key] || {});
  const next: Progress = { ...prog };
  const fromBucket = { ...(prog[fromGame] || {}) };
  delete fromBucket[key];
  if (Object.keys(fromBucket).length) {
    next[fromGame] = fromBucket;
  } else {
    delete next[fromGame];
  }
  next[toGame] = { ...(prog[toGame] || {}), [key]: merged };
  return next;
}

export function toggleGenderMark(
  prog: Progress,
  game: string,
  id: number,
  key: MarkKey,
  gender: GenderChoice,
  form: SpeciesForm | null = null,
): Progress {
  const entry = entryFor(prog, game, id, form);
  if (!entry[key]) {
    return prog;
  }
  const field = GENDER_FIELD[key][gender];
  return patchMark(prog, game, id, { [field]: !entry[field] }, form);
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
  return localizedGame(key) || GAMES.find((game) => game.k === key)?.l || key;
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
    if (left.caughtMale || right.caughtMale) {
      next.caughtMale = true;
    }
    if (left.caughtFemale || right.caughtFemale) {
      next.caughtFemale = true;
    }
  }
  if (shiny) {
    next.shiny = true;
    next.shinyAt = newerStamp(left.shinyAt, right.shinyAt);
    if (left.shinyMale || right.shinyMale) {
      next.shinyMale = true;
    }
    if (left.shinyFemale || right.shinyFemale) {
      next.shinyFemale = true;
    }
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
