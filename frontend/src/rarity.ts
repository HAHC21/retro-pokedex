import type { SpeciesRarity } from "./types";

const RARITY_LABELS: Record<SpeciesRarity, string> = {
  legendary: "Legendary",
  mythical: "Mythical",
  pseudo: "Pseudo",
  fossil: "Fossil",
  starter: "Starter",
};

const RARITY_NOTES: Record<SpeciesRarity, string> = {
  legendary:
    "Legendary Pokémon are extremely rare and often very powerful. The legends and myths of the Pokémon world center on them, and some are regarded as deities.",
  mythical:
    "Mythical Pokémon are rare species received through special means. Most of them have only been available from event distributions.",
  pseudo:
    "These Pokémon are powerful, with very high base stats. They level slowly and evolve late, so they take a long time to raise.",
  fossil:
    "Fossil Pokémon are prehistoric species brought back to life from fossils. A fossil is the only way to obtain one.",
  starter: "A starter is one of the Pokémon offered at the beginning of a main-series game, or a later stage of that line.",
};

export function rarityLabel(rarity: SpeciesRarity | undefined): string {
  return rarity ? RARITY_LABELS[rarity] : "";
}

export function rarityNote(rarity: SpeciesRarity | undefined): string {
  return rarity ? RARITY_NOTES[rarity] : "";
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
