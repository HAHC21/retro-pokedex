export const API = "/api/poke";
export const SPRITE_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
export const PROG_KEY = "pokedex-progress-v2";
export const IDX_KEY = "pokedex-index-v3";
export const NATIONAL_TOTAL = 1025;

export const TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
] as const;

export type PokemonType = (typeof TYPES)[number];

export const TYPE_LABELS: Record<PokemonType, string> = {
  normal: "Normal",
  fire: "Fire",
  water: "Water",
  electric: "Electric",
  grass: "Grass",
  ice: "Ice",
  fighting: "Fighting",
  poison: "Poison",
  ground: "Ground",
  flying: "Flying",
  psychic: "Psychic",
  bug: "Bug",
  rock: "Rock",
  ghost: "Ghost",
  dragon: "Dragon",
  dark: "Dark",
  steel: "Steel",
  fairy: "Fairy",
};

export const TYPE_COLORS: Record<PokemonType, [string, string]> = {
  normal: ["#ecece9", "#5c5c52"],
  fire: ["#fdeadf", "#a4441a"],
  water: ["#e2edfb", "#2f5d9e"],
  electric: ["#fff4b0", "#c9a006"],
  grass: ["#e6f4e0", "#3a7529"],
  ice: ["#e1f3f5", "#276b71"],
  fighting: ["#f8e3e1", "#9a382d"],
  poison: ["#f1e6f6", "#763683"],
  ground: ["#f4ecdc", "#856025"],
  flying: ["#eaeefb", "#4b5798"],
  psychic: ["#fce6ee", "#a4365f"],
  bug: ["#eef3d9", "#61741c"],
  rock: ["#f1ebdd", "#786536"],
  ghost: ["#eae7f5", "#564686"],
  dragon: ["#e6e9fa", "#413b98"],
  dark: ["#e8e6e4", "#46403c"],
  steel: ["#e9edf0", "#48606e"],
  fairy: ["#fbe8f1", "#9f3a73"],
};

export const CHART: Record<string, Record<string, number>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

export const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

export type Generation = {
  id: number;
  roman: string;
  region: string;
  from: number;
  to: number;
  games: string;
};

export const GENS: Generation[] = [
  { id: 1, roman: "I", region: "Kanto", from: 1, to: 151, games: "Red · Blue · Yellow" },
  { id: 2, roman: "II", region: "Johto", from: 152, to: 251, games: "Gold · Silver · Crystal" },
  { id: 3, roman: "III", region: "Hoenn", from: 252, to: 386, games: "Ruby · Sapphire · Emerald · FR/LG" },
  { id: 4, roman: "IV", region: "Sinnoh", from: 387, to: 493, games: "Diamond · Pearl · Platinum · HG/SS" },
  { id: 5, roman: "V", region: "Unova", from: 494, to: 649, games: "Black · White · B2/W2" },
  { id: 6, roman: "VI", region: "Kalos", from: 650, to: 721, games: "X · Y · OR/AS" },
  { id: 7, roman: "VII", region: "Alola", from: 722, to: 809, games: "Sun · Moon · US/UM" },
  { id: 8, roman: "VIII", region: "Galar", from: 810, to: 905, games: "Sword · Shield · BD/SP · Legends Arceus" },
  { id: 9, roman: "IX", region: "Paldea", from: 906, to: 1025, games: "Scarlet · Violet" },
];

export type Game = {
  k: string;
  l: string;
  g: number;
};

export const GAMES: Game[] = [
  { k: "rb", l: "Red / Blue", g: 1 },
  { k: "y", l: "Yellow", g: 1 },
  { k: "gs", l: "Gold / Silver", g: 2 },
  { k: "c", l: "Crystal", g: 2 },
  { k: "rs", l: "Ruby / Sapphire", g: 3 },
  { k: "e", l: "Emerald", g: 3 },
  { k: "frlg", l: "FireRed / LeafGreen", g: 3 },
  { k: "dp", l: "Diamond / Pearl", g: 4 },
  { k: "pt", l: "Platinum", g: 4 },
  { k: "hgss", l: "HeartGold / SoulSilver", g: 4 },
  { k: "bw", l: "Black / White", g: 5 },
  { k: "b2w2", l: "Black 2 / White 2", g: 5 },
  { k: "xy", l: "X / Y", g: 6 },
  { k: "oras", l: "Omega Ruby / Alpha Sapphire", g: 6 },
  { k: "sm", l: "Sun / Moon", g: 7 },
  { k: "usum", l: "Ultra Sun / Ultra Moon", g: 7 },
  { k: "swsh", l: "Sword / Shield", g: 8 },
  { k: "bdsp", l: "Brilliant Diamond / Shining Pearl", g: 8 },
  { k: "pla", l: "Legends: Arceus", g: 8 },
  { k: "sv", l: "Scarlet / Violet", g: 9 },
  { k: "home", l: "HOME (global collection)", g: 0 },
];

export const VERSIONS: Record<string, [number, string]> = {
  red: [1, "Red"],
  blue: [1, "Blue"],
  yellow: [1, "Yellow"],
  gold: [2, "Gold"],
  silver: [2, "Silver"],
  crystal: [2, "Crystal"],
  ruby: [3, "Ruby"],
  sapphire: [3, "Sapphire"],
  emerald: [3, "Emerald"],
  firered: [3, "FireRed"],
  leafgreen: [3, "LeafGreen"],
  colosseum: [3, "Colosseum"],
  xd: [3, "XD: Gale of Darkness"],
  diamond: [4, "Diamond"],
  pearl: [4, "Pearl"],
  platinum: [4, "Platinum"],
  heartgold: [4, "HeartGold"],
  soulsilver: [4, "SoulSilver"],
  black: [5, "Black"],
  white: [5, "White"],
  "black-2": [5, "Black 2"],
  "white-2": [5, "White 2"],
  x: [6, "X"],
  y: [6, "Y"],
  "omega-ruby": [6, "Omega Ruby"],
  "alpha-sapphire": [6, "Alpha Sapphire"],
  sun: [7, "Sun"],
  moon: [7, "Moon"],
  "ultra-sun": [7, "Ultra Sun"],
  "ultra-moon": [7, "Ultra Moon"],
  "lets-go-pikachu": [7, "Let's Go, Pikachu!"],
  "lets-go-eevee": [7, "Let's Go, Eevee!"],
  sword: [8, "Sword"],
  shield: [8, "Shield"],
  "legends-arceus": [8, "Legends: Arceus"],
  "brilliant-diamond": [8, "Brilliant Diamond"],
  "shining-pearl": [8, "Shining Pearl"],
  scarlet: [9, "Scarlet"],
  violet: [9, "Violet"],
};

/** Active-game key → PokéAPI version names that belong to that save slot. */
export const GAME_VERSIONS: Record<string, string[]> = {
  rb: ["red", "blue"],
  y: ["yellow"],
  gs: ["gold", "silver"],
  c: ["crystal"],
  rs: ["ruby", "sapphire"],
  e: ["emerald"],
  frlg: ["firered", "leafgreen"],
  dp: ["diamond", "pearl"],
  pt: ["platinum"],
  hgss: ["heartgold", "soulsilver"],
  bw: ["black", "white"],
  b2w2: ["black-2", "white-2"],
  xy: ["x", "y"],
  oras: ["omega-ruby", "alpha-sapphire"],
  sm: ["sun", "moon"],
  usum: ["ultra-sun", "ultra-moon"],
  swsh: ["sword", "shield"],
  bdsp: ["brilliant-diamond", "shining-pearl"],
  pla: ["legends-arceus"],
  sv: ["scarlet", "violet"],
  home: [],
};

/**
 * Official event distributions that PokéAPI does not model as encounters
 * (e.g. Diancie / Hoopa / Volcanion serial codes for X·Y).
 * Ids are National Dex numbers; HOME does not need this list.
 */
export const EVENT_OBTAINABLE_BY_GAME: Record<string, readonly number[]> = {
  rb: [151],
  y: [151],
  gs: [251],
  c: [251],
  rs: [385, 386],
  e: [385, 386],
  frlg: [151, 385, 386],
  dp: [489, 490, 491, 492, 493],
  pt: [489, 490, 491, 492, 493],
  hgss: [251, 489, 490, 491, 492, 493],
  bw: [494, 647, 648, 649],
  b2w2: [494, 647, 648, 649],
  xy: [719, 720, 721],
  oras: [719, 720, 721],
  sm: [801, 802, 807],
  usum: [801, 802, 807, 808, 809],
  swsh: [808, 809, 893],
  bdsp: [489, 490, 491, 492, 493],
  pla: [],
  sv: [1025],
};

const eventObtainableSets: Record<string, Set<number>> = Object.fromEntries(
  Object.entries(EVENT_OBTAINABLE_BY_GAME).map(([key, ids]) => [key, new Set(ids)]),
);

/** True when the species was distributed to this save via an official event. */
export function isEventObtainableInGame(pokemonId: number, gameKey: string) {
  return eventObtainableSets[gameKey]?.has(pokemonId) ?? false;
}

export function versionsForGame(gameKey: string): string[] | null {
  if (gameKey === "home") {
    return null;
  }
  return GAME_VERSIONS[gameKey] || [];
}

export function versionLabel(name: string) {
  return VERSIONS[name]?.[1];
}

export function versionGen(name: string) {
  return VERSIONS[name]?.[0];
}

export function gameByKey(key: string) {
  return GAMES.find((game) => game.k === key);
}

export function genById(id: number) {
  return GENS.find((gen) => gen.id === id) ?? GENS[0];
}

/** Regions/generations that belong in the selected save (HOME → all). */
export function gensForGame(gameKey: string) {
  const game = gameByKey(gameKey);
  if (!game || game.g === 0) {
    return GENS;
  }
  return GENS.filter((gen) => gen.id <= game.g);
}

/** Keep the active gen inside the selected game's allowed regions. */
export function clampGenForGame(genId: number, gameKey: string) {
  const allowed = gensForGame(gameKey);
  if (allowed.some((gen) => gen.id === genId)) {
    return genId;
  }
  return allowed[allowed.length - 1]?.id ?? 1;
}

/** National-dex generation this Pokémon was introduced in. */
export function introGenForId(pokemonId: number) {
  return GENS.find((gen) => pokemonId >= gen.from && pokemonId <= gen.to)?.id ?? 1;
}

/**
 * Coarse generation gate: species introduced by this game's generation.
 * Prefer `isObtainableInGame` for Mark Caught (excludes transfer-only / player-trade).
 */
export function isAvailableInGame(pokemonId: number, gameKey: string) {
  const game = gameByKey(gameKey);
  if (!game || game.g === 0) {
    return true;
  }
  return introGenForId(pokemonId) <= game.g;
}

export function gameTotal(game: Game) {
  if (game.g === 0) {
    return NATIONAL_TOTAL;
  }
  const gen = genById(game.g);
  return gen.to - gen.from + 1;
}

export function gamesByGeneration(indices: Array<{ version: { name: string } }>) {
  return groupVersionNames(indices.map((item) => item.version.name));
}

/**
 * Games this species appears in. Prefer PokéAPI flavor-text versions (reliable for
 * where the mon is featured); game_indices often only reflect later National Dex
 * data dumps (e.g. Enamorus lists SV but not Legends: Arceus).
 */
export function gamesForSpecies(
  indices: Array<{ version: { name: string } }>,
  flavorEntries?: Array<{ language: { name: string }; version: { name: string } }>,
) {
  const fromFlavor = [
    ...new Set(
      (flavorEntries || [])
        .filter((entry) => entry.language?.name === "en" && entry.version?.name)
        .map((entry) => entry.version.name),
    ),
  ];
  const names = fromFlavor.length ? fromFlavor : indices.map((item) => item.version.name);
  return groupVersionNames(names);
}

function groupVersionNames(names: string[]) {
  return GENS.map((gen) => {
    const games = [...new Set(names)]
      .filter((name) => versionGen(name) === gen.id)
      .map((name) => versionLabel(name))
      .filter((label): label is string => Boolean(label));
    return { gen: `Gen ${gen.roman}`, games, count: games.length };
  }).filter((row) => row.count > 0);
}
