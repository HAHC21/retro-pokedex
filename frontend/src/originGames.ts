import { GameOfOrigin, GameOfOriginData } from "pokemon-resources";

/** PKHeX origin-game id → this app's save slot. Paired versions share a slot. */
const ORIGIN_TO_GAME_KEY: Record<number, string> = {
  [GameOfOrigin.Sapphire]: "rs",
  [GameOfOrigin.Ruby]: "rs",
  [GameOfOrigin.Emerald]: "e",
  [GameOfOrigin.FireRed]: "frlg",
  [GameOfOrigin.LeafGreen]: "frlg",
  [GameOfOrigin.HeartGold]: "hgss",
  [GameOfOrigin.SoulSilver]: "hgss",
  [GameOfOrigin.Diamond]: "dp",
  [GameOfOrigin.Pearl]: "dp",
  [GameOfOrigin.Platinum]: "pt",
  [GameOfOrigin.ColosseumXD]: "home",
  [GameOfOrigin.White]: "bw",
  [GameOfOrigin.Black]: "bw",
  [GameOfOrigin.White2]: "b2w2",
  [GameOfOrigin.Black2]: "b2w2",
  [GameOfOrigin.X]: "xy",
  [GameOfOrigin.Y]: "xy",
  [GameOfOrigin.AlphaSapphire]: "oras",
  [GameOfOrigin.OmegaRuby]: "oras",
  [GameOfOrigin.Sun]: "sm",
  [GameOfOrigin.Moon]: "sm",
  [GameOfOrigin.UltraSun]: "usum",
  [GameOfOrigin.UltraMoon]: "usum",
  [GameOfOrigin.GO]: "home",
  [GameOfOrigin.Red]: "rb",
  [GameOfOrigin.BlueGreen]: "rb",
  [GameOfOrigin.BlueJapan]: "rb",
  [GameOfOrigin.Yellow]: "y",
  [GameOfOrigin.Gold]: "gs",
  [GameOfOrigin.Silver]: "gs",
  [GameOfOrigin.Crystal]: "c",
  [GameOfOrigin.LetsGoPikachu]: "home",
  [GameOfOrigin.LetsGoEevee]: "home",
  [GameOfOrigin.Sword]: "swsh",
  [GameOfOrigin.Shield]: "swsh",
  [GameOfOrigin.LegendsArceus]: "pla",
  [GameOfOrigin.BrilliantDiamond]: "bdsp",
  [GameOfOrigin.ShiningPearl]: "bdsp",
  [GameOfOrigin.Scarlet]: "sv",
  [GameOfOrigin.Violet]: "sv",
};

export function gameKeyFromOrigin(origin: number): string | null {
  return ORIGIN_TO_GAME_KEY[origin] ?? null;
}

export function originGameName(origin: number): string | null {
  if (!origin) {
    return null;
  }
  const data = GameOfOriginData[origin];
  if (data?.name) {
    return data.name;
  }
  const named = GameOfOrigin[origin];
  if (typeof named === "string" && !named.startsWith("INVALID")) {
    return named.replace(/([a-z])([A-Z])/g, "$1 $2");
  }
  return null;
}
