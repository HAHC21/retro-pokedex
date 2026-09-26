import { localizedIv } from "./i18n/labels";
import type { NatureInfo, NatureStat } from "./natures";
import type { StatBlock } from "./collectionApi";

export const IV_KEYS: Array<keyof StatBlock> = [
  "hp",
  "attack",
  "defense",
  "special_attack",
  "special_defense",
  "speed",
];

export const IV_LABELS: Record<keyof StatBlock, string> = {
  hp: "HP",
  attack: "Atk",
  defense: "Def",
  special_attack: "SpA",
  special_defense: "SpD",
  speed: "Spe",
};

export function ivLabel(key: keyof StatBlock): string {
  return localizedIv(key) || IV_LABELS[key];
}

export const IV_NATURE_STAT: Record<keyof StatBlock, NatureStat | null> = {
  hp: null,
  attack: "attack",
  defense: "defense",
  special_attack: "special-attack",
  special_defense: "special-defense",
  speed: "speed",
};

export function emptyIvs(): StatBlock {
  return {
    hp: null,
    attack: null,
    defense: null,
    special_attack: null,
    special_defense: null,
    speed: null,
  };
}

const POKEAPI_STAT: Record<string, keyof StatBlock> = {
  hp: "hp",
  attack: "attack",
  defense: "defense",
  "special-attack": "special_attack",
  "special-defense": "special_defense",
  speed: "speed",
};

export function baseStatsFromPokeApi(stats: Array<{ base_stat: number; stat: { name: string } }>): StatBlock {
  const block = emptyIvs();
  stats.forEach((entry) => {
    const key = POKEAPI_STAT[entry.stat.name];
    if (key) {
      block[key] = entry.base_stat;
    }
  });
  return block;
}

function natureFactor(nature: NatureInfo | undefined, key: keyof StatBlock): number {
  const mapped = IV_NATURE_STAT[key];
  if (!mapped || !nature) {
    return 1;
  }
  if (nature.plus === mapped) {
    return 1.1;
  }
  if (nature.minus === mapped) {
    return 0.9;
  }
  return 1;
}

/** Gen 3+ in-game stats from base / IV / EV / level / nature. Shedinja HP stays 1. */
export function calculateStats(
  base: StatBlock,
  ivs: StatBlock | null,
  evs: StatBlock | null,
  level: number,
  nature?: NatureInfo,
): StatBlock | null {
  if (!Number.isFinite(level) || level < 1) {
    return null;
  }
  const iv = (key: keyof StatBlock) => Number(ivs?.[key] ?? 0);
  const ev = (key: keyof StatBlock) => Number(evs?.[key] ?? 0);
  const baseOf = (key: keyof StatBlock) => Number(base[key] ?? 0);
  const hpBase = baseOf("hp");
  const hp = hpBase <= 1 ? 1 : Math.floor(((2 * hpBase + iv("hp") + Math.floor(ev("hp") / 4)) * level) / 100) + level + 10;
  const other = (key: keyof StatBlock) => {
    const inner = Math.floor(((2 * baseOf(key) + iv(key) + Math.floor(ev(key) / 4)) * level) / 100) + 5;
    return Math.floor(inner * natureFactor(nature, key));
  };
  return {
    hp,
    attack: other("attack"),
    defense: other("defense"),
    special_attack: other("special_attack"),
    special_defense: other("special_defense"),
    speed: other("speed"),
  };
}
