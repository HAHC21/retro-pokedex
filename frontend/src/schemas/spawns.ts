/** Wild encounter list. */

export type WildEncounter = {
  location_area: { name: string; url: string };
  loc: string | null;
  region: string | null;
  version_details: Array<{
    version: { name: string; url?: string };
    encounter_details: Array<{ chance?: number; method?: { name: string; url?: string } }>;
  }>;
};

export type SpawnsResponse = {
  enc: WildEncounter[];
};
