/** Species page. */

export type NamedRef = {
  name: string;
  url?: string;
};

export type PokemonData = {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: Array<{ type: NamedRef }>;
  abilities?: Array<{
    ability: NamedRef;
    is_hidden?: boolean;
    slot?: number;
    description?: string | null;
  }>;
  stats: Array<{ base_stat: number; stat: NamedRef }>;
  game_indices: Array<{ version: NamedRef }>;
  species: { url: string };
  forms?: NamedRef[];
  moves?: Array<{
    move: NamedRef;
    version_group_details: Array<{
      level_learned_at: number;
      move_learn_method: NamedRef;
      version_group: NamedRef;
      order?: number | null;
    }>;
  }>;
};

export type SpeciesPayload = {
  name?: string;
  names?: Array<{ name: string; language: NamedRef }>;
  varieties: Array<{ is_default: boolean; pokemon: NamedRef }>;
  evolution_chain?: { url: string };
  flavor_text_entries?: Array<{
    flavor_text?: string;
    language: NamedRef;
    version: NamedRef;
  }>;
};

export type EvolutionStep = {
  id: number;
  name: string;
  cond: string;
};

export type OverviewText = {
  en?: string;
  es?: string;
};

export type GameAvailability = {
  version: string;
  ways: string[];
};

export type PokemonDetailResponse = {
  data: PokemonData;
  species: SpeciesPayload;
  evo: EvolutionStep[];
  obtain_versions?: string[];
  evolves_from?: number | null;
  overview?: OverviewText | string | null;
  capture?: boolean;
  games?: GameAvailability[];
};
