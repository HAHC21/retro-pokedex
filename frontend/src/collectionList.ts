import { REGIONS, regionBySlug } from "./catalog";
import type { OwnedIndexRow } from "./collectionApi";
import {
  formDisplayName,
  formIsCapturable,
  formFromStorageKey,
  formFromVarietySlug,
  formSpriteRef,
  formsEqual,
  markKey,
  type SpeciesForm,
} from "./forms";
import { localizedRegion } from "./i18n/labels";
import { fill, getMessages } from "./i18n/runtime";
import type { CatalogForm } from "./pokeapi";
import { ownedMarks } from "./progress";
import type { CollectionFilter, DexIndex, Progress } from "./types";

export type CollectionEntry = {
  key: string;
  id: number;
  form: SpeciesForm | null;
  catalog: CatalogForm | undefined;
  name: string;
  types: string[];
  spriteId: number;
  formName: string | null;
  capturable: boolean;
  caught: boolean;
  shiny: boolean;
  caughtMale: boolean;
  caughtFemale: boolean;
  shinyMale: boolean;
  shinyFemale: boolean;
  games: string[];
  hasSpecimen: boolean;
};

export function collectionStatuses(): Array<[CollectionFilter, string]> {
  const copy = getMessages().collection;
  return [
    ["all", copy.all],
    ["normal", copy.normal],
    ["shiny", copy.shiny],
    ["alternate", copy.alternate],
    ["variants", copy.variants],
  ];
}

/** Region of origin: a regional form counts as that region, otherwise the species debut range. */
export function originRegionSlug(id: number, form: SpeciesForm | null): string | null {
  if (form?.kind === "regional" && form.name && regionBySlug(form.name)) {
    return form.name;
  }
  const region = REGIONS.find((entry) => id >= entry.from && id <= entry.to);
  return region?.slug ?? null;
}

function catalogFor(forms: CatalogForm[], id: number, form: SpeciesForm | null): CatalogForm | undefined {
  if (!form) {
    return undefined;
  }
  return forms.find((entry) => entry.pokedexId === id && formsEqual(entry.form, form));
}

function isCosmetic(catalog: CatalogForm | undefined, form: SpeciesForm | null): boolean {
  if (!form) {
    return false;
  }
  if (catalog) {
    return catalog.spriteForm != null;
  }
  return form.kind === "variant";
}

function isAlternate(catalog: CatalogForm | undefined, form: SpeciesForm | null): boolean {
  if (!form || !formIsCapturable(form)) {
    return false;
  }
  return !isCosmetic(catalog, form);
}

function formFromOwned(row: OwnedIndexRow, forms: CatalogForm[], names: Record<number, string>): SpeciesForm | null {
  if (row.form_slug) {
    const stored = formFromStorageKey(row.form_slug);
    if (stored && formIsCapturable(stored)) {
      return stored;
    }
  }
  const slug = (row.species_slug || "").trim().toLowerCase();
  if (!slug || slug.startsWith("pokemon-")) {
    return null;
  }
  const matches = forms.filter((entry) => entry.pokedexId === row.pokemon_id && formIsCapturable(entry.form));
  for (const entry of matches) {
    if (entry.form.name && slug.endsWith(`-${entry.form.name}`)) {
      return entry.form;
    }
  }
  const species = (names[row.pokemon_id] || "").trim().toLowerCase().replace(/['’]/g, "").replace(/\s+/g, "-");
  if (species) {
    const fromSlug = formFromVarietySlug(slug, species);
    if (fromSlug && formIsCapturable(fromSlug)) {
      return fromSlug;
    }
  }
  return null;
}

function toEntry(
  id: number,
  form: SpeciesForm | null,
  index: DexIndex,
  forms: CatalogForm[],
  marks: ReturnType<typeof ownedMarks>[number] | null,
  hasSpecimen: boolean,
): CollectionEntry {
  const catalog = catalogFor(forms, id, form);
  const species = index.names[id] || "";
  const name = form ? formDisplayName(species, form) : species;
  const sprite = formSpriteRef(id, form, catalog);
  return {
    key: markKey(id, form),
    id,
    form,
    catalog,
    name,
    types: catalog?.types || index.types[id] || [],
    spriteId: sprite.pokemonId,
    formName: sprite.formName,
    capturable: catalog ? catalog.capture : formIsCapturable(form),
    caught: !!marks?.caught,
    shiny: !!marks?.shiny,
    caughtMale: !!marks?.caughtMale,
    caughtFemale: !!marks?.caughtFemale,
    shinyMale: !!marks?.shinyMale,
    shinyFemale: !!marks?.shinyFemale,
    games: marks?.where || [],
    hasSpecimen,
  };
}

export function buildCollectionEntries(
  prog: Progress,
  index: DexIndex,
  forms: CatalogForm[],
  owned: OwnedIndexRow[],
): CollectionEntry[] {
  const marks = ownedMarks(prog);
  const byKey = new Map<string, CollectionEntry>();

  marks.forEach((entry) => {
    if (!index.names[entry.id]) {
      return;
    }
    const next = toEntry(entry.id, entry.form, index, forms, entry, false);
    if (!next.capturable) {
      return;
    }
    byKey.set(next.key, next);
  });

  owned.forEach((row) => {
    const id = row.pokemon_id;
    if (!index.names[id]) {
      return;
    }
    const form = formFromOwned(row, forms, index.names);
    if (form && !formIsCapturable(form)) {
      return;
    }
    const key = markKey(id, form);
    const existing = byKey.get(key);
    const uploaded = row.source_type === "pk";
    if (existing) {
      if (uploaded) {
        existing.hasSpecimen = true;
      }
      return;
    }
    const next = toEntry(id, form, index, forms, null, uploaded);
    if (!next.capturable) {
      return;
    }
    byKey.set(key, next);
  });

  return [...byKey.values()].sort((left, right) => {
    if (left.id !== right.id) {
      return left.id - right.id;
    }
    return left.key.localeCompare(right.key);
  });
}

export function filterCollectionEntries(
  entries: CollectionEntry[],
  filter: CollectionFilter,
  originRegion: string | null,
  q: string,
): CollectionEntry[] {
  const needle = q.trim().toLowerCase();
  const region = regionBySlug(originRegion)?.slug ?? null;
  return entries.filter((entry) => {
    if (filter === "normal" && !entry.caught) {
      return false;
    }
    if (filter === "shiny" && !entry.shiny) {
      return false;
    }
    if (filter === "alternate" && !isAlternate(entry.catalog, entry.form)) {
      return false;
    }
    if (filter === "variants" && !isCosmetic(entry.catalog, entry.form)) {
      return false;
    }
    if (region && originRegionSlug(entry.id, entry.form) !== region) {
      return false;
    }
    if (needle && entry.name.toLowerCase().indexOf(needle) === -1 && String(entry.id).indexOf(needle) === -1) {
      return false;
    }
    return true;
  });
}

export function collectionHeadCopy(shown: number, total: number, originRegion: string | null): { title: string; meta: string } {
  const copy = getMessages().collection;
  const origin = regionBySlug(originRegion);
  const regionName = origin ? localizedRegion(origin.slug) || origin.name : "";
  return {
    title: origin ? `${copy.title} · ${regionName}` : copy.title,
    meta: fill(copy.meta, { shown, total }),
  };
}
