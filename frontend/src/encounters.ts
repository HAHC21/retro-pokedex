import { GENS, versionGen, versionLabel, versionsForGame } from "./catalog";
import { placeLabel, title } from "./format";
import { graphsFromEncounters } from "./maps";
import type { RegionGraph } from "./routeGraph";

export type WildEncounter = {
  location_area: { name: string; url: string };
  loc: string | null;
  region: string | null;
  version_details: Array<{
    version: { name: string };
    encounter_details: Array<{ chance?: number; method?: { name: string } }>;
  }>;
};

export type EncounterSpot = {
  place: string;
  games: string;
  rate: string;
};

export type EncounterRegion = {
  region: string;
  roman: string;
  spots: EncounterSpot[];
};

/** Methods excluded from the wild spawn map (still count for obtainability). */
const NOT_WILD = /gift|only-one|trade|starter|squirt-bottle|wailmer-pail/;
const POKECENTER = /pokecenter|poke-center/;

const areaRegion: Record<string, string | null> = {};
const locRegion: Record<string, string | null> = {};
const areaLoc: Record<string, string> = {};

export type RawEncounter = {
  location_area: { name: string; url: string };
  version_details: Array<{
    version: { name: string };
    encounter_details: Array<{ chance?: number; method?: { name: string } }>;
  }>;
};

/** Wild grass/surf/rod/etc. only — used for spawn maps and tables. */
export function filterWildEncounters(raw: RawEncounter[]): RawEncounter[] {
  return raw
    .filter((entry) => !POKECENTER.test(entry.location_area.name))
    .map((entry) => {
      const versions = (entry.version_details || [])
        .map((detail) => {
          const details = (detail.encounter_details || []).filter((item) => !NOT_WILD.test(item.method?.name || ""));
          return details.length ? { ...detail, encounter_details: details } : null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
      return versions.length ? { ...entry, version_details: versions } : null;
    })
    .filter((entry): entry is RawEncounter => entry !== null);
}

/**
 * Version names where the species can be obtained in-game: wild, gift, starter,
 * static/only-one, or NPC trade. Player-to-player trades never appear in PokéAPI.
 */
export function obtainVersionsFromRaw(raw: RawEncounter[]): string[] {
  const versions = new Set<string>();
  raw.forEach((entry) => {
    if (POKECENTER.test(entry.location_area.name)) {
      return;
    }
    (entry.version_details || []).forEach((detail) => {
      if ((detail.encounter_details || []).length) {
        versions.add(detail.version.name);
      }
    });
  });
  return [...versions];
}

export async function resolveEncounterRegions(encounters: RawEncounter[]): Promise<WildEncounter[]> {
  await Promise.all(
    encounters.map(async (entry) => {
      const areaName = entry.location_area.name;
      if (areaRegion[areaName] !== undefined) {
        return;
      }
      try {
        const area = await (await fetch(entry.location_area.url)).json();
        const locName = area.location.name as string;
        if (locRegion[locName] === undefined) {
          const loc = await (await fetch(area.location.url)).json();
          locRegion[locName] = loc.region ? title(loc.region.name) : null;
        }
        areaRegion[areaName] = locRegion[locName];
        areaLoc[areaName] = locName;
      } catch {
        areaRegion[areaName] = null;
      }
    }),
  );
  return encounters.map((entry) => ({
    ...entry,
    region: areaRegion[entry.location_area.name] ?? null,
    loc: areaLoc[entry.location_area.name] || null,
  }));
}

/** Keep only encounter versions that belong to the active game save. HOME keeps all. */
export function filterEncountersForGame(encounters: WildEncounter[], gameKey: string): WildEncounter[] {
  const allowed = versionsForGame(gameKey);
  if (allowed === null) {
    return encounters;
  }
  if (!allowed.length) {
    return [];
  }
  const set = new Set(allowed);
  return encounters
    .map((entry) => {
      const versions = (entry.version_details || []).filter((detail) => set.has(detail.version.name));
      return versions.length ? { ...entry, version_details: versions } : null;
    })
    .filter((entry): entry is WildEncounter => entry !== null);
}

export function groupEncounters(encounters: WildEncounter[]): EncounterRegion[] {
  const byRegion: Record<string, { region: string; spots: Record<string, { place: string; games: Record<string, true>; gens: Record<number, true>; rate: number }> }> = {};
  encounters.forEach((entry) => {
    const place = placeLabel(entry.location_area.name);
    const key = entry.region || "Other";
    (entry.version_details || []).forEach((detail) => {
      const gen = versionGen(detail.version.name);
      const label = versionLabel(detail.version.name);
      if (gen === undefined || !label) {
        return;
      }
      byRegion[key] = byRegion[key] || { region: key, spots: {} };
      const spot = (byRegion[key].spots[place] = byRegion[key].spots[place] || { place, games: {}, gens: {}, rate: 0 });
      spot.games[label] = true;
      spot.gens[gen] = true;
      (detail.encounter_details || []).forEach((item) => {
        spot.rate = Math.max(spot.rate, item.chance || 0);
      });
    });
  });
  const order = GENS.map((gen) => gen.region).concat(["Other"]);
  return Object.keys(byRegion)
    .sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    })
    .map((key) => {
      const group = byRegion[key];
      const gens: Record<number, true> = {};
      Object.values(group.spots).forEach((spot) => {
        Object.keys(spot.gens).forEach((id) => {
          gens[Number(id)] = true;
        });
      });
      const romans = Object.keys(gens)
        .map(Number)
        .sort((a, b) => a - b)
        .map((id) => GENS.find((gen) => gen.id === id)?.roman)
        .filter(Boolean);
      return {
        region: group.region,
        roman: romans.length ? `Gen ${romans.join(", ")}` : "",
        spots: Object.keys(group.spots)
          .sort()
          .map((place) => ({
            place: group.spots[place].place,
            games: Object.keys(group.spots[place].games).join(" · "),
            rate: group.spots[place].rate ? `${group.spots[place].rate}%` : "—",
          })),
      };
    });
}

export function regionGraphsFromEncounters(encounters: WildEncounter[]): RegionGraph[] {
  return graphsFromEncounters(encounters);
}
