import type { WildEncounter } from "./encounters";

export type MarkKey = "caught" | "shiny";

export type MarkEntry = {
  caught?: boolean;
  caughtAt?: number | null;
  shiny?: boolean;
  shinyAt?: number | null;
};

export type Progress = Record<string, Record<string, MarkEntry>>;

export type DexIndex = {
  names: Record<number, string>;
  types: Record<number, string[]>;
};

export type View = "dash" | "dex" | "mon" | "signin" | "login";

export type StatusFilter = "all" | "missing" | "missing-normal" | "missing-shiny" | "normal" | "shiny";

export type DexScope = "regional" | "national";

export type EvolutionStep = {
  id: number;
  name: string;
  cond: string;
};

export type MonPayload = {
  data: {
    id: number;
    name: string;
    height: number;
    weight: number;
    types: Array<{ type: { name: string } }>;
    stats: Array<{ base_stat: number; stat: { name: string } }>;
    game_indices: Array<{ version: { name: string } }>;
    species: { url: string };
    moves?: Array<{
      move: { name: string; url: string };
      version_group_details: Array<{
        level_learned_at: number;
        move_learn_method: { name: string };
        version_group: { name: string };
        order?: number | null;
      }>;
    }>;
  };
  species: {
    varieties: Array<{ is_default: boolean; pokemon: { name: string } }>;
    evolution_chain?: { url: string };
    flavor_text_entries?: Array<{
      language: { name: string };
      version: { name: string };
    }>;
  };
  evo: EvolutionStep[];
  enc: WildEncounter[];
};
