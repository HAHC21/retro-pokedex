import { idFromUrl, title } from "./format";
import { fill, getMessages } from "./i18n/runtime";

export type FormKind = "mega" | "regional" | "gmax" | "variant";

export type FormList = "mega" | "gmax" | "regional";

export const FORM_LISTS: Array<{ id: FormList; title: string; subtitle: string }> = [
  { id: "mega", title: "Mega Evolutions", subtitle: "Temporary battle forms" },
  { id: "gmax", title: "Gigantamax", subtitle: "Max Raid forms" },
  { id: "regional", title: "Regional Forms", subtitle: "Alola, Galar, Hisui, and Paldea" },
];

export type SpeciesForm = {
  kind: FormKind;
  name: string | null;
};

export type SpeciesFormEntry = {
  key: string;
  route: SpeciesForm;
  spriteId: number;
  spriteForm: string | null;
};

const FORM_KINDS = new Set<string>(["mega", "regional", "gmax", "variant"]);

const REGIONAL_NAMES = new Set(["alola", "galar", "hisui", "paldea"]);

/** Keep in step with backend UNTRACKED_SLUGS. These are not separate catches. */
const UNTRACKED_SLUGS = new Set([
  "castform-sunny",
  "castform-rainy",
  "castform-snowy",
  "cherrim-sunshine",
  "darmanitan-zen",
  "darmanitan-galar-zen",
  "meloetta-pirouette",
  "aegislash-blade",
  "xerneas-active",
  "wishiwashi-school",
  "mimikyu-busted",
  "mimikyu-totem-disguised",
  "mimikyu-totem-busted",
  "zygarde-complete",
  "zygarde-10-power-construct",
  "zygarde-50-power-construct",
  "greninja-ash",
  "greninja-battle-bond",
  "necrozma-ultra",
  "cramorant-gulping",
  "cramorant-gorging",
  "eiscue-noice",
  "morpeko-hangry",
  "zacian-crowned",
  "zamazenta-crowned",
  "palafin-hero",
  "terapagos-terastal",
  "terapagos-stellar",
  "minior-red",
  "minior-orange",
  "minior-yellow",
  "minior-green",
  "minior-blue",
  "minior-indigo",
  "minior-violet",
  "arceus-unknown",
  "koraidon-limited-build",
  "koraidon-sprinting-build",
  "koraidon-swimming-build",
  "koraidon-gliding-build",
  "miraidon-low-power-mode",
  "miraidon-drive-mode",
  "miraidon-aquatic-mode",
  "miraidon-glide-mode",
  "eternatus-eternamax",
  "pikachu-rock-star",
  "pikachu-belle",
  "pikachu-pop-star",
  "pikachu-phd",
  "pikachu-libre",
  "pikachu-cosplay",
  "pikachu-original-cap",
  "pikachu-hoenn-cap",
  "pikachu-sinnoh-cap",
  "pikachu-unova-cap",
  "pikachu-kalos-cap",
  "pikachu-alola-cap",
  "pikachu-partner-cap",
  "pikachu-world-cap",
  "pikachu-starter",
  "eevee-starter",
  "kyogre-primal",
  "groudon-primal",
]);

const SKIP_TOKENS = new Set(["totem", "primal", "eternamax", "starter", "cap"]);

export function isFormKind(value: string | undefined): value is FormKind {
  return !!value && FORM_KINDS.has(value);
}

function isUntrackedSlug(slug: string): boolean {
  if (UNTRACKED_SLUGS.has(slug)) {
    return true;
  }
  return slug.split("-").some((token) => SKIP_TOKENS.has(token));
}

/** Variety or form slug (`floette-yellow`, `rotom-heat`) → path form. Untracked slugs return null. */
export function formFromVarietySlug(pokemonSlug: string, speciesSlug: string): SpeciesForm | null {
  const slug = pokemonSlug.toLowerCase();
  const species = speciesSlug.toLowerCase();
  const prefix = `${species}-`;
  if (!species || !slug.startsWith(prefix)) {
    return null;
  }
  const suffix = slug.slice(prefix.length);
  if (!suffix) {
    return null;
  }
  if (suffix === "gmax") {
    return { kind: "gmax", name: null };
  }
  if (suffix.split("-").includes("gmax")) {
    return null;
  }
  if (suffix === "mega") {
    return { kind: "mega", name: null };
  }
  if (suffix.startsWith("mega-")) {
    const name = suffix.slice("mega-".length);
    return name ? { kind: "mega", name } : { kind: "mega", name: null };
  }
  if (suffix.split("-").includes("mega")) {
    return null;
  }
  if (REGIONAL_NAMES.has(suffix)) {
    return { kind: "regional", name: suffix };
  }
  if (suffix.split("-").some((part) => REGIONAL_NAMES.has(part))) {
    return null;
  }
  if (isUntrackedSlug(slug)) {
    return null;
  }
  return { kind: "variant", name: suffix };
}

export function isFormList(value: string | undefined): value is FormList {
  return value === "mega" || value === "gmax" || value === "regional";
}

export function formFromStorageKey(key: string): SpeciesForm | null {
  if (key === "gigantamax") {
    return { kind: "gmax", name: null };
  }
  if (key === "mega") {
    return { kind: "mega", name: null };
  }
  if (key.startsWith("mega-")) {
    const name = key.slice("mega-".length);
    return name ? { kind: "mega", name } : null;
  }
  if (key.startsWith("regional-")) {
    const name = key.slice("regional-".length);
    return REGIONAL_NAMES.has(name) ? { kind: "regional", name } : null;
  }
  if (key.startsWith("variant-")) {
    const name = key.slice("variant-".length);
    return name ? { kind: "variant", name } : null;
  }
  return null;
}

export function formListOf(form: SpeciesForm): FormList | null {
  if (form.kind === "mega" || form.kind === "gmax" || form.kind === "regional") {
    return form.kind;
  }
  return null;
}

export function formPath(form: SpeciesForm | null | undefined): string {
  if (!form) {
    return "";
  }
  return form.name ? `/${form.kind}/${form.name}` : `/${form.kind}`;
}

/** Mega and Gigantamax are temporary. Base, regional, and variant forms can be caught. */
export function formIsCapturable(form: SpeciesForm | null | undefined): boolean {
  if (!form) {
    return true;
  }
  return form.kind !== "mega" && form.kind !== "gmax";
}

/** Looks that share the base Pokémon, such as Floette's flower colors. */
export function isCosmeticForm(entry: SpeciesFormEntry): boolean {
  return entry.spriteForm != null;
}

export function formStorageKey(form: SpeciesForm | null | undefined): string {
  if (!form) {
    return "base";
  }
  if (form.kind === "gmax") {
    return "gigantamax";
  }
  if (form.kind === "mega") {
    return form.name ? `mega-${form.name}` : "mega";
  }
  if (form.kind === "regional" && form.name) {
    return `regional-${form.name}`;
  }
  if (form.kind === "variant" && form.name) {
    return `variant-${form.name}`;
  }
  return "base";
}

export function markKey(id: number, form: SpeciesForm | null | undefined): string {
  const stored = formStorageKey(form);
  return stored === "base" ? String(id) : `${id}:${stored}`;
}

export function parseMarkKey(raw: string): { id: number; form: SpeciesForm | null } | null {
  const splitAt = raw.indexOf(":");
  const idText = splitAt === -1 ? raw : raw.slice(0, splitAt);
  const id = Number(idText);
  if (!Number.isInteger(id) || id < 1) {
    return null;
  }
  if (splitAt === -1) {
    return { id, form: null };
  }
  return { id, form: formFromStorageKey(raw.slice(splitAt + 1)) };
}

export function formsEqual(a: SpeciesForm | null | undefined, b: SpeciesForm | null | undefined): boolean {
  if (!a || !b) {
    return !a && !b;
  }
  return a.kind === b.kind && a.name === b.name;
}

/** Sprite for a catalog form: own-id varieties use resourceId; cosmetic variants keep the species sprite. */
export function formSpriteRef(
  pokedexId: number,
  form: SpeciesForm | null,
  catalog: { resourceId: number; spriteForm: string | null } | undefined,
): { pokemonId: number; formName: string | null } {
  if (form?.kind === "variant" && form.name) {
    if (catalog && !catalog.spriteForm && catalog.resourceId !== pokedexId) {
      return { pokemonId: catalog.resourceId, formName: null };
    }
    return { pokemonId: pokedexId, formName: catalog?.spriteForm || form.name };
  }
  if (catalog) {
    return {
      pokemonId: catalog.spriteForm ? pokedexId : catalog.resourceId,
      formName: catalog.spriteForm,
    };
  }
  return { pokemonId: pokedexId, formName: form?.kind === "variant" ? form.name : null };
}

export function formDisplayName(speciesName: string, form: SpeciesForm): string {
  const copy = getMessages().forms;
  if (form.kind === "gmax") {
    return fill(copy.gigantamax, { species: speciesName });
  }
  if (form.kind === "mega") {
    return form.name ? fill(copy.megaNamed, { species: speciesName, name: form.name.toUpperCase() }) : fill(copy.mega, { species: speciesName });
  }
  if (form.kind === "variant") {
    const label = form.name ? title(form.name) : copy.variantFallback;
    return fill(copy.variant, { label, species: speciesName });
  }
  const adjective = form.name ? copy[form.name as "alola" | "galar" | "hisui" | "paldea"] || form.name : copy.regionalFallback;
  return fill(copy.regional, { adjective, species: speciesName });
}

type VarietyRef = { is_default: boolean; pokemon: { name: string; url?: string } };
type FormRef = { name: string; url?: string };

/** Own-id varieties plus shared pokemon-form rows, skipping the default appearance. */
export function speciesFormEntries(
  speciesSlug: string,
  speciesId: number,
  varieties: VarietyRef[] | undefined,
  formRefs: FormRef[] | undefined,
): SpeciesFormEntry[] {
  const entries: SpeciesFormEntry[] = [];
  const seen = new Set<string>();

  for (const item of varieties || []) {
    if (item.is_default) {
      continue;
    }
    const route = formFromVarietySlug(item.pokemon.name, speciesSlug);
    if (!route) {
      continue;
    }
    const resourceId = idFromUrl(item.pokemon.url || "");
    if (resourceId <= 0) {
      continue;
    }
    const key = formStorageKey(route);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    entries.push({
      key,
      route,
      spriteId: resourceId,
      spriteForm: null,
    });
  }

  for (const ref of formRefs || []) {
    if (idFromUrl(ref.url || "") === speciesId) {
      continue;
    }
    const route = formFromVarietySlug(ref.name, speciesSlug);
    if (!route || route.kind !== "variant" || !route.name) {
      continue;
    }
    const key = formStorageKey(route);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    entries.push({
      key,
      route,
      spriteId: speciesId,
      spriteForm: route.name,
    });
  }

  return entries;
}
