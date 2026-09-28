import type { RegionGraph, RegionMapDef } from "../routeGraph";
import { buildRegionGraph, resolveRegionId } from "../routeGraph";
import { GALAR_MAP } from "./galar";
import { HOENN_MAP } from "./hoenn";
import { JOHTO_MAP } from "./johto";
import { KALOS_MAP } from "./kalos";
import { KANTO_MAP } from "./kanto";
import { SINNOH_MAP } from "./sinnoh";
import { UNOVA_MAP } from "./unova";

export const REGION_MAPS: RegionMapDef[] = [KANTO_MAP, JOHTO_MAP, HOENN_MAP, SINNOH_MAP, UNOVA_MAP, KALOS_MAP, GALAR_MAP];

export function regionHits(def: RegionMapDef, encounters: Array<{ loc: string | null; version_details: Array<{ encounter_details: Array<{ chance?: number }> }> }>): Record<string, number> {
  const hits: Record<string, number> = {};
  encounters.forEach((entry) => {
    const id = resolveRegionId(def, entry.loc);
    if (!id) {
      return;
    }
    let rate = 0;
    entry.version_details.forEach((detail) => {
      detail.encounter_details.forEach((item) => {
        rate = Math.max(rate, item.chance || 0);
      });
    });
    hits[id] = Math.max(hits[id] || 0, rate);
  });
  return hits;
}

export function graphsFromEncounters(
  encounters: Array<{ loc: string | null; version_details: Array<{ encounter_details: Array<{ chance?: number }> }> }>,
): RegionGraph[] {
  return REGION_MAPS.map((def) => buildRegionGraph(def, regionHits(def, encounters))).filter((graph) => graph.has);
}
