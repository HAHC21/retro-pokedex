import { gameByKey, genById, idsInRegion, idsIntroducedInGen, introducedIdsForGame, nationalIdsForGame, regionBySlug } from "./catalog";
import { localizedRegion } from "./i18n/labels";
import { fill, getMessages } from "./i18n/runtime";
import { gameLabel, unionSets } from "./progress";
import type { RegionalDex } from "./pokeapi";
import type { DexIndex, DexScope, Progress, StatusFilter } from "./types";

export function dexStatuses(): Array<[StatusFilter, string]> {
  const copy = getMessages().dex;
  return [
    ["all", copy.all],
    ["missing", copy.missing],
    ["missing-normal", copy.missingNormal],
    ["missing-shiny", copy.missingShiny],
    ["normal", copy.ownedNormal],
    ["shiny", copy.ownedShiny],
  ];
}

export function checklistStatuses(): Array<[StatusFilter, string]> {
  const copy = getMessages().dex;
  return [["all", copy.all], ["exclusives", copy.exclusives], ...dexStatuses().slice(1)];
}

/** Homepage region list: a known region slug, independent of generation. */
export function isRegionBrowseMode(region: string | null): boolean {
  return regionBySlug(region) != null;
}

export function regionBrowseLabel(region: string | null): string {
  const origin = regionBySlug(region);
  if (!origin) {
    return "";
  }
  return (localizedRegion(origin.slug) || origin.name).toUpperCase();
}

export function activeDexScope(scope: DexScope, _game: string): DexScope {
  return scope;
}

export function dexCandidateIds(
  scope: DexScope,
  game: string,
  regional: RegionalDex | null,
  gen = 1,
  region: string | null = null,
): number[] {
  const origin = regionBySlug(region);
  if (origin) {
    return idsInRegion(origin.slug);
  }
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

export function dexScopeButtons(
  game: string,
  _gen: number,
  _scope: DexScope,
  region: string | null = null,
): Array<[DexScope, string]> {
  const copy = getMessages().dex;
  if (isRegionBrowseMode(region)) {
    return [["generation", regionBrowseLabel(region)]];
  }
  const scopes: Array<[DexScope, string]> = [
    ["regional", copy.scopeRegional],
    ["national", copy.scopeNational],
  ];
  const meta = gameByKey(game);
  if (meta && meta.g > 0) {
    scopes.push(["generation", fill(copy.scopeGen, { roman: genById(meta.g).roman })]);
  }
  return scopes;
}

export function dexHeadCopy(
  scope: DexScope,
  game: string,
  shown: number,
  total: number,
  kind: "dex" | "checklist",
  _gen = 1,
  region: string | null = null,
): { title: string; meta: string } {
  const copy = getMessages().dex;
  const active = activeDexScope(scope, game);
  const meta = gameByKey(game);
  const nativeGen = meta && meta.g > 0 ? genById(meta.g) : null;
  const origin = regionBySlug(region);
  const labelFor = gameLabel(game);
  if (origin) {
    const label = (localizedRegion(origin.slug) || origin.name).toUpperCase();
    const regionName = localizedRegion(origin.slug) || origin.name;
    return {
      title: kind === "checklist" ? fill(copy.regionChecklist, { region: label }) : label,
      meta: fill(copy.regionMeta, { region: regionName, shown, total }),
    };
  }
  if (active === "regional") {
    return {
      title: kind === "checklist" ? fill(copy.regionalChecklist, { game: labelFor }) : fill(copy.regionalDex, { game: labelFor }),
      meta: fill(copy.regionalMeta, { shown, total: total || "…" }),
    };
  }
  if (active === "generation" && nativeGen) {
    return {
      title:
        kind === "checklist"
          ? fill(copy.genChecklist, { roman: nativeGen.roman, game: labelFor })
          : fill(copy.genDex, { roman: nativeGen.roman, game: labelFor }),
      meta: fill(copy.genMeta, { roman: nativeGen.roman, shown, total }),
    };
  }
  return {
    title: kind === "checklist" ? fill(copy.nationalChecklist, { game: labelFor }) : fill(copy.nationalDex, { game: labelFor }),
    meta: fill(copy.nationalMeta, { shown, total }),
  };
}
