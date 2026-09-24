export type FormKind = "mega" | "regional" | "gmax";

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

const FORM_KINDS = new Set<string>(["mega", "regional", "gmax"]);

const REGIONAL_NAMES = new Set(["alola", "galar", "hisui", "paldea"]);

const REGIONAL_ADJECTIVE: Record<string, string> = {
  alola: "Alolan",
  galar: "Galarian",
  hisui: "Hisuian",
  paldea: "Paldean",
};

export function isFormKind(value: string | undefined): value is FormKind {
  return !!value && FORM_KINDS.has(value);
}

/** Variety slug (`charizard-mega-x`) → path form. Unrelated varieties return null. */
export function formFromVarietySlug(pokemonSlug: string, speciesSlug: string): SpeciesForm | null {
  const slug = pokemonSlug.toLowerCase();
  const species = speciesSlug.toLowerCase();
  const prefix = `${species}-`;
  if (!species || !slug.startsWith(prefix)) {
    return null;
  }
  const suffix = slug.slice(prefix.length);
  if (suffix === "gmax") {
    return { kind: "gmax", name: null };
  }
  if (suffix === "mega") {
    return { kind: "mega", name: null };
  }
  if (suffix.startsWith("mega-")) {
    const name = suffix.slice("mega-".length);
    return name ? { kind: "mega", name } : { kind: "mega", name: null };
  }
  if (REGIONAL_NAMES.has(suffix)) {
    return { kind: "regional", name: suffix };
  }
  return null;
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
  return null;
}

export function formListOf(form: SpeciesForm): FormList {
  return form.kind;
}

export function formPath(form: SpeciesForm | null | undefined): string {
  if (!form) {
    return "";
  }
  return form.name ? `/${form.kind}/${form.name}` : `/${form.kind}`;
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
  return "base";
}

export function markKey(id: number, form: SpeciesForm | null | undefined): string {
  const stored = formStorageKey(form);
  return stored === "base" ? String(id) : `${id}:${stored}`;
}
export function formsEqual(a: SpeciesForm | null | undefined, b: SpeciesForm | null | undefined): boolean {
  if (!a || !b) {
    return !a && !b;
  }
  return a.kind === b.kind && a.name === b.name;
}

export function formDisplayName(speciesName: string, form: SpeciesForm): string {
  if (form.kind === "gmax") {
    return `Gigantamax ${speciesName}`;
  }
  if (form.kind === "mega") {
    return form.name ? `Mega ${speciesName} ${form.name.toUpperCase()}` : `Mega ${speciesName}`;
  }
  const adjective = form.name ? REGIONAL_ADJECTIVE[form.name] || form.name : "Regional";
  return `${adjective} ${speciesName}`;
}
