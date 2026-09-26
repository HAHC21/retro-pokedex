import { localizedRarity, localizedRarityNote } from "./i18n/labels";
import type { SpeciesRarity } from "./types";

export function rarityLabel(rarity: SpeciesRarity | undefined): string {
  return rarity ? localizedRarity(rarity) : "";
}

export function rarityNote(rarity: SpeciesRarity | undefined): string {
  return rarity ? localizedRarityNote(rarity) : "";
}

export function rarityClass(rarity: SpeciesRarity | undefined): string {
  if (rarity === "legendary") {
    return "is-legendary";
  }
  if (rarity === "mythical") {
    return "is-mythical";
  }
  if (rarity === "pseudo") {
    return "is-pseudo";
  }
  if (rarity === "fossil") {
    return "is-fossil";
  }
  if (rarity === "starter") {
    return "is-starter";
  }
  return "";
}

export function boxClass(base: string, marked: boolean, rarity: SpeciesRarity | undefined): string {
  return [base, marked ? "is-marked" : "", rarityClass(rarity)].filter(Boolean).join(" ");
}
