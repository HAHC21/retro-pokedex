import type { SpeciesRarity } from "../types";
import { fill, getMessages, type Messages } from "./runtime";

const VERSION_KEYS: Record<string, keyof Messages["versions"]> = {
  red: "red",
  blue: "blue",
  yellow: "yellow",
  gold: "gold",
  silver: "silver",
  crystal: "crystal",
  ruby: "ruby",
  sapphire: "sapphire",
  emerald: "emerald",
  firered: "firered",
  leafgreen: "leafgreen",
  colosseum: "colosseum",
  xd: "xd",
  diamond: "diamond",
  pearl: "pearl",
  platinum: "platinum",
  heartgold: "heartgold",
  soulsilver: "soulsilver",
  black: "black",
  white: "white",
  "black-2": "black2",
  "white-2": "white2",
  x: "x",
  y: "y",
  "omega-ruby": "omegaRuby",
  "alpha-sapphire": "alphaSapphire",
  sun: "sun",
  moon: "moon",
  "ultra-sun": "ultraSun",
  "ultra-moon": "ultraMoon",
  "lets-go-pikachu": "letsGoPikachu",
  "lets-go-eevee": "letsGoEevee",
  sword: "sword",
  shield: "shield",
  "legends-arceus": "legendsArceus",
  "brilliant-diamond": "brilliantDiamond",
  "shining-pearl": "shiningPearl",
  scarlet: "scarlet",
  violet: "violet",
  "the-teal-mask-scarlet": "tealMaskScarlet",
  "the-teal-mask-violet": "tealMaskViolet",
  "the-indigo-disk-scarlet": "indigoDiskScarlet",
  "the-indigo-disk-violet": "indigoDiskViolet",
  "the-isle-of-armor-sword": "isleOfArmorSword",
  "the-isle-of-armor-shield": "isleOfArmorShield",
  "the-crown-tundra-sword": "crownTundraSword",
  "the-crown-tundra-shield": "crownTundraShield",
  "legends-za": "legendsZa",
  "mega-dimension": "megaDimension",
};

const STAT_KEYS: Record<string, keyof Messages["stats"]> = {
  hp: "hp",
  attack: "attack",
  defense: "defense",
  "special-attack": "specialAttack",
  "special-defense": "specialDefense",
  speed: "speed",
};

const IV_KEYS: Record<string, keyof Messages["stats"]> = {
  hp: "hpShort",
  attack: "attackShort",
  defense: "defenseShort",
  special_attack: "specialAttackShort",
  special_defense: "specialDefenseShort",
  speed: "speedShort",
};

const METHOD_KEYS: Record<string, keyof Messages["methods"]> = {
  "level-up": "levelUp",
  machine: "machine",
  egg: "egg",
  tutor: "tutor",
  "form-change": "formChange",
  train: "train",
};

const RARITY_LABEL: Record<SpeciesRarity, keyof Messages["rarity"]> = {
  legendary: "legendary",
  mythical: "mythical",
  pseudo: "pseudo",
  fossil: "fossil",
  starter: "starter",
};

const RARITY_NOTE: Record<SpeciesRarity, keyof Messages["rarity"]> = {
  legendary: "legendaryNote",
  mythical: "mythicalNote",
  pseudo: "pseudoNote",
  fossil: "fossilNote",
  starter: "starterNote",
};

export function localizedGame(key: string): string | undefined {
  const games = getMessages().games as Record<string, string>;
  return games[key];
}

export function localizedVersion(name: string): string | undefined {
  const key = VERSION_KEYS[name];
  if (!key) {
    return undefined;
  }
  return getMessages().versions[key];
}

export function localizedType(type: string): string | undefined {
  const types = getMessages().types as Record<string, string>;
  return types[type];
}

export function localizedStat(name: string): string | undefined {
  const key = STAT_KEYS[name];
  if (!key) {
    return undefined;
  }
  return getMessages().stats[key];
}

export function localizedIv(key: string): string | undefined {
  const stat = IV_KEYS[key];
  if (!stat) {
    return undefined;
  }
  return getMessages().stats[stat];
}

export function localizedMethod(method: string): string | undefined {
  const key = METHOD_KEYS[method];
  if (!key) {
    return undefined;
  }
  return getMessages().methods[key];
}

export function localizedRegion(slug: string): string | undefined {
  const regions = getMessages().regions as Record<string, string>;
  return regions[slug];
}

export function localizedRegionGames(slug: string): string | undefined {
  const regions = getMessages().regions as Record<string, string>;
  return regions[`${slug}Games`];
}

export function localizedRarity(rarity: SpeciesRarity): string {
  return getMessages().rarity[RARITY_LABEL[rarity]];
}

export function localizedRarityNote(rarity: SpeciesRarity): string {
  return getMessages().rarity[RARITY_NOTE[rarity]];
}

export function localizedNature(name: string): string {
  const natures = getMessages().natures as Record<string, string>;
  return natures[name.toLowerCase()] || name;
}

export function formListCopy(id: "mega" | "gmax" | "regional"): { title: string; subtitle: string } {
  const forms = getMessages().forms;
  if (id === "mega") {
    return { title: forms.megaTitle, subtitle: forms.megaSub };
  }
  if (id === "gmax") {
    return { title: forms.gmaxTitle, subtitle: forms.gmaxSub };
  }
  return { title: forms.regionalTitle, subtitle: forms.regionalSub };
}

export function notInGame(game: string): string {
  return fill(getMessages().dex.notIn, { game });
}
