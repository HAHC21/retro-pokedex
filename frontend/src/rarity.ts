import type { SpeciesRarity } from "./types";

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
  return "";
}

export function boxClass(base: string, marked: boolean, rarity: SpeciesRarity | undefined): string {
  return [base, marked ? "is-marked" : "", rarityClass(rarity)].filter(Boolean).join(" ");
}
