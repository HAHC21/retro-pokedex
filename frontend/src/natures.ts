import { getMessages } from "./i18n/runtime";
import { localizedIv, localizedNature } from "./i18n/labels";

/** Canonical battle natures and their raised / lowered stats. */
export type NatureStat = "attack" | "defense" | "special-attack" | "special-defense" | "speed";

export type NatureInfo = {
  name: string;
  plus: NatureStat | null;
  minus: NatureStat | null;
};

export const NATURE_STAT_LABELS: Record<NatureStat, string> = {
  attack: "Atk",
  defense: "Def",
  "special-attack": "SpA",
  "special-defense": "SpD",
  speed: "Spe",
};

export const NATURES: NatureInfo[] = [
  { name: "Hardy", plus: null, minus: null },
  { name: "Lonely", plus: "attack", minus: "defense" },
  { name: "Brave", plus: "attack", minus: "speed" },
  { name: "Adamant", plus: "attack", minus: "special-attack" },
  { name: "Naughty", plus: "attack", minus: "special-defense" },
  { name: "Bold", plus: "defense", minus: "attack" },
  { name: "Docile", plus: null, minus: null },
  { name: "Relaxed", plus: "defense", minus: "speed" },
  { name: "Impish", plus: "defense", minus: "special-attack" },
  { name: "Lax", plus: "defense", minus: "special-defense" },
  { name: "Timid", plus: "speed", minus: "attack" },
  { name: "Hasty", plus: "speed", minus: "defense" },
  { name: "Serious", plus: null, minus: null },
  { name: "Jolly", plus: "speed", minus: "special-attack" },
  { name: "Naive", plus: "speed", minus: "special-defense" },
  { name: "Modest", plus: "special-attack", minus: "attack" },
  { name: "Mild", plus: "special-attack", minus: "defense" },
  { name: "Quiet", plus: "special-attack", minus: "speed" },
  { name: "Bashful", plus: null, minus: null },
  { name: "Rash", plus: "special-attack", minus: "special-defense" },
  { name: "Calm", plus: "special-defense", minus: "attack" },
  { name: "Gentle", plus: "special-defense", minus: "defense" },
  { name: "Sassy", plus: "special-defense", minus: "speed" },
  { name: "Careful", plus: "special-defense", minus: "special-attack" },
  { name: "Quirky", plus: null, minus: null },
];

export function natureName(name: string): string {
  return localizedNature(name);
}

export function natureModifierLabel(nature: NatureInfo): string {
  if (!nature.plus || !nature.minus) {
    return getMessages().natures.neutral;
  }
  const plus = nature.plus === "special-attack" ? "special_attack" : nature.plus === "special-defense" ? "special_defense" : nature.plus;
  const minus = nature.minus === "special-attack" ? "special_attack" : nature.minus === "special-defense" ? "special_defense" : nature.minus;
  return `+${localizedIv(plus) || NATURE_STAT_LABELS[nature.plus]} / −${localizedIv(minus) || NATURE_STAT_LABELS[nature.minus]}`;
}
