import { gameByKey, genById, idsIntroducedInGen, introducedIdsForGame, nationalIdsForGame } from "./catalog";
import { gameLabel, unionSets } from "./progress";
import type { RegionalDex } from "./pokeapi";
import type { DexIndex, DexScope, Progress, StatusFilter } from "./types";

export const DEX_STATUSES: Array<[StatusFilter, string]> = [
  ["all", "All"],
  ["missing", "Missing"],
  ["missing-normal", "Missing Normal"],
  ["missing-shiny", "Missing Shiny"],
  ["normal", "Owned Normal"],
  ["shiny", "Owned Shiny"],
];

export const CHECKLIST_STATUSES: Array<[StatusFilter, string]> = [
  ["all", "All"],
  ["exclusives", "Exclusives"],
  ...DEX_STATUSES.slice(1),
];

/** Homepage region browse: Global Collection + generation scope. */
export function isRegionBrowseMode(game: string, scope: DexScope): boolean {
  return game === "home" && scope === "generation";
}

export function regionBrowseLabel(genId: number): string {
  const gen = genById(genId);
  return `GEN ${gen.roman} · ${gen.region.toUpperCase()}`;
}

export function activeDexScope(scope: DexScope, _game: string): DexScope {
  return scope;
}

export function dexCandidateIds(
  scope: DexScope,
  game: string,
  regional: RegionalDex | null,
  gen = 1,
): number[] {
  const active = activeDexScope(scope, game);
  if (active === "regional") {
    return regional?.ids || [];
  }
  if (active === "generation") {
    if (game === "home") {
      return idsIntroducedInGen(gen);
    }
    return introducedIdsForGame(game);
  }
  return nationalIdsForGame(game);
}

export function filterDexIds(
  ids: number[],
  index: DexIndex,
  prog: Progress,
  status: StatusFilter,
  q: string,
): number[] {
  const needle = q.trim().toLowerCase();
  const { caught: uCaught, shiny: uShiny, any: uAny } = unionSets(prog);
  const next: number[] = [];
  ids.forEach((id) => {
    const name = index.names[id];
    if (!name) {
      return;
    }
    if (status === "missing" && uAny[id]) {
      return;
    }
    if (status === "missing-normal" && uCaught[id]) {
      return;
    }
    if (status === "missing-shiny" && uShiny[id]) {
      return;
    }
    if (status === "normal" && !uCaught[id]) {
      return;
    }
    if (status === "shiny" && !uShiny[id]) {
      return;
    }
    if (needle && name.toLowerCase().indexOf(needle) === -1 && String(id).indexOf(needle) === -1) {
      return;
    }
    next.push(id);
  });
  return next;
}

export function dexScopeButtons(game: string, gen: number, scope: DexScope): Array<[DexScope, string]> {
  if (isRegionBrowseMode(game, scope)) {
    return [["generation", regionBrowseLabel(gen)]];
  }
  const scopes: Array<[DexScope, string]> = [
    ["regional", "Regional"],
    ["national", "National"],
  ];
  const meta = gameByKey(game);
  if (meta && meta.g > 0) {
    scopes.push(["generation", `GEN ${genById(meta.g).roman}`]);
  }
  return scopes;
}

export function dexHeadCopy(
  scope: DexScope,
  game: string,
  shown: number,
  total: number,
  kind: "dex" | "checklist",
  gen = 1,
): { title: string; meta: string } {
  const active = activeDexScope(scope, game);
  const meta = gameByKey(game);
  const nativeGen = meta && meta.g > 0 ? genById(meta.g) : null;
  if (isRegionBrowseMode(game, active)) {
    const label = regionBrowseLabel(gen);
    const region = genById(gen);
    return {
      title: kind === "checklist" ? `${label} Checklist` : label,
      meta: `New in ${region.region} · ${shown} of ${total} shown`,
    };
  }
  if (active === "regional") {
    return {
      title: kind === "checklist" ? `Regional Checklist · ${gameLabel(game)}` : `Regional Dex · ${gameLabel(game)}`,
      meta: `Regional · ${shown} of ${total || "…"} shown`,
    };
  }
  if (active === "generation" && nativeGen) {
    return {
      title: kind === "checklist" ? `GEN ${nativeGen.roman} Checklist · ${gameLabel(game)}` : `GEN ${nativeGen.roman} · ${gameLabel(game)}`,
      meta: `New in GEN ${nativeGen.roman} · ${shown} of ${total} shown`,
    };
  }
  return {
    title: kind === "checklist" ? `National Checklist · ${gameLabel(game)}` : `National Dex · ${gameLabel(game)}`,
    meta: `National · ${shown} of ${total} shown`,
  };
}
