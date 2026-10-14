/** National Dex catalog, form list, and regional dex. */

export type GenerationBand = {
  id: number;
  roman: string;
  from: number;
  to: number;
  games: string;
};

export type RegionBand = {
  slug: string;
  name: string;
  from: number;
  to: number;
  games: string;
  mascots: number[];
};

export type CatalogResponse = {
  names: Record<string, string>;
  types: Record<string, string[]>;
  legendaries: number[];
  mythicals: number[];
  pseudos: number[];
  fossils: number[];
  starters: number[];
  count: number;
  generations: GenerationBand[];
  regions: RegionBand[];
};

export type FormRow = {
  pokedex_id: number;
  form: string;
  name?: string | null;
  resource_id: number;
  types?: string[];
  capture?: boolean;
  sprite_form?: string | null;
};

export type FormsResponse = {
  forms: FormRow[];
};

export type RegionalEntry = {
  id: number;
  number: number;
};

export type RegionalDexResponse = {
  game: string;
  entries: RegionalEntry[];
  ids: number[];
};
