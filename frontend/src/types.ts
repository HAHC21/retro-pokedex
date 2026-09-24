import type { WildEncounter } from "./encounters";

export type MarkKey = "caught" | "shiny";

export type MarkEntry = {
  caught?: boolean;
  caughtAt?: number | null;
  caughtMale?: boolean;
  caughtFemale?: boolean;
  shiny?: boolean;
  shinyAt?: number | null;
  shinyMale?: boolean;
  shinyFemale?: boolean;
};

export type Progress = Record<string, Record<string, MarkEntry>>;

export type DexIndex = {
  names: Record<number, string>;
  types: Record<number, string[]>;
};

export type View = "dash" | "dex" | "checklist" | "mon" | "signin" | "login";

export type StatusFilter =
  | "all"
  | "exclusives"
  | "missing"
  | "missing-normal"
  | "missing-shiny"
  | "normal"
  | "shiny";

export type DexScope = "regional" | "national" | "generation";

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
    abilities?: Array<{
      ability: { name: string; url?: string };
      is_hidden?: boolean;
      slot?: number;
      description?: string | null;
    }>;
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
    name?: string;
    names?: Array<{ name: string; language: { name: string } }>;
    varieties: Array<{ is_default: boolean; pokemon: { name: string; url?: string } }>;
    evolution_chain?: { url: string };
    flavor_text_entries?: Array<{
      flavor_text?: string;
      language: { name: string };
      version: { name: string };
    }>;
  };
  evo: EvolutionStep[];
  enc: WildEncounter[];
  overview?: string | null;
};
