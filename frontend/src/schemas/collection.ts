/** Wire types for /api/collection. */

export type MarkEntryWrite = {
  caught: boolean;
  caughtAt: number | null;
  caughtMale: boolean;
  caughtFemale: boolean;
  shiny: boolean;
  shinyAt: number | null;
  shinyMale: boolean;
  shinyFemale: boolean;
};

export type MarkEntryResponse = {
  game: string;
  pokemon_id: number;
  mark: Record<string, unknown> | null;
};

export type ProgressResponse = {
  progress: Record<string, Record<string, MarkEntryWrite>>;
};

export type ProgressWrite = {
  progress: ProgressResponse["progress"];
  mode: "merge" | "replace";
};

export type StatBlock = {
  hp?: number | null;
  attack?: number | null;
  defense?: number | null;
  special_attack?: number | null;
  special_defense?: number | null;
  speed?: number | null;
};

export type OwnedMove = {
  slot: number;
  move_id?: number | null;
  name?: string | null;
  pp?: number | null;
  pp_ups?: number | null;
};

export type OwnedPokemonWrite = {
  pokemon_id: number;
  game_key?: string | null;
  nickname?: string | null;
  level?: number | null;
  gender?: string | null;
  shiny?: boolean;
  ability_name?: string | null;
  ability_slot?: number | null;
  nature?: string | null;
  held_item?: string | null;
  species_slug?: string | null;
  source_type?: string | null;
  raw_format?: string | null;
  filename?: string | null;
  ot_name?: string | null;
  ball?: string | null;
  met_game?: string | null;
  met_location?: string | null;
  met_level?: number | null;
  met_date?: string | null;
  fateful_encounter?: boolean;
  egg_location?: string | null;
  moves?: OwnedMove[];
  ivs?: StatBlock | null;
  evs?: StatBlock | null;
  stats?: StatBlock | null;
};

export type OwnedPokemonResponse = OwnedPokemonWrite & {
  owned_id: string;
  pokemon_id: number;
  game_key: string | null;
  nickname: string | null;
  level: number | null;
  gender: string | null;
  shiny: boolean;
  ability_name: string | null;
  ability_slot: number | null;
  nature: string | null;
  held_item: string | null;
  species_slug: string | null;
  source_type: string;
  raw_format: string | null;
  ot_name: string | null;
  ball: string | null;
  met_game: string | null;
  met_location: string | null;
  met_level: number | null;
  met_date: string | null;
  fateful_encounter: boolean;
  egg_location: string | null;
  moves: OwnedMove[];
  ivs: StatBlock | null;
  evs: StatBlock | null;
  stats: StatBlock | null;
  created_at: string;
  updated_at: string;
};

export type OwnedPokemonListResponse = {
  items: OwnedPokemonResponse[];
  collected_abilities: string[];
  collected_natures: string[];
};

export type OwnedIndexItem = {
  pokemon_id: number;
  species_slug?: string | null;
  form_slug?: string | null;
  source_type: string;
};

export type OwnedIndexResponse = {
  items: OwnedIndexItem[];
};

export type OwnedPokemonBatchWrite = {
  items: OwnedPokemonWrite[];
  filename?: string | null;
};

export type OwnedPokemonBatchResponse = {
  import_id: string;
  saved: number;
  failed: number;
  errors: Array<{ index: number; filename?: string | null; error: string }>;
};
