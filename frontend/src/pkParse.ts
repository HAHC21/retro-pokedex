import { bytesToPKMInterface, classFromFormat, type PKM, type PKMDate } from "pokemon-files";
import { Balls, getLocationString } from "pokemon-resources";
import type { OwnedMove, OwnedPokemonInput, StatBlock } from "./collectionApi";
import { findMove } from "./moveCatalog";
import { gameKeyFromOrigin, originGameName } from "./originGames";

export type ParsedPkSpecimen = OwnedPokemonInput & {
  raw_format: string;
  forme_num: number;
};

const GENDER: Record<number, string> = {
  0: "male",
  1: "female",
  2: "genderless",
};

const TIME_OF_DAY: Record<number, string> = {
  1: "Morning",
  2: "Day",
  3: "Night",
};

function extensionOf(filename: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(filename.trim());
  return (match?.[1] || "").toUpperCase();
}

export function isPkFilename(name: string): boolean {
  return /\.(pk[1-9]|pb7)$/i.test(name.trim());
}

function slugify(value: string | null | undefined): string | null {
  const cleaned = (value || "").trim();
  if (!cleaned) {
    return null;
  }
  return cleaned.toLowerCase().replace(/['’]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function readStats(block: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number } | undefined): StatBlock | null {
  if (!block) {
    return null;
  }
  return {
    hp: block.hp,
    attack: block.atk,
    defense: block.def,
    special_attack: block.spa,
    special_defense: block.spd,
    speed: block.spe,
  };
}

function abilityNameOf(mon: PKM): string | null {
  if ("abilityName" in mon && typeof mon.abilityName === "string") {
    return mon.abilityName;
  }
  if ("ability" in mon && typeof mon.ability === "string") {
    return mon.ability;
  }
  return null;
}

function natureNameOf(mon: PKM): string | null {
  if ("natureName" in mon && typeof mon.natureName === "string") {
    return mon.natureName;
  }
  return null;
}

function abilitySlotOf(mon: PKM): number | null {
  if (!("abilityNum" in mon) || typeof mon.abilityNum !== "number") {
    return null;
  }
  if (mon.abilityNum === 4) {
    return 3;
  }
  if (mon.abilityNum === 1 || mon.abilityNum === 2) {
    return mon.abilityNum;
  }
  return null;
}

function heldItemOf(mon: PKM): string | null {
  if ("heldItemName" in mon && typeof mon.heldItemName === "string") {
    const name = mon.heldItemName.trim();
    if (!name || name.toLowerCase() === "none") {
      return null;
    }
    return slugify(name);
  }
  return null;
}

function looksValid(mon: PKM): boolean {
  return Number.isFinite(mon.dexNum) && mon.dexNum >= 1 && mon.dexNum <= 1025;
}

function loadMon(buffer: ArrayBuffer, format: string): PKM {
  try {
    const decrypted = bytesToPKMInterface(buffer, format);
    if (looksValid(decrypted)) {
      return decrypted;
    }
  } catch {
    /* try encrypted path below */
  }

  const Cls = classFromFormat(format);
  if (!Cls) {
    throw new Error(`Unsupported Pokémon file type (.${format.toLowerCase()}).`);
  }
  try {
    // PKHeX box/party dumps are sometimes still encrypted; second arg requests decrypt+unshuffle.
    const encrypted = new (Cls as unknown as new (bytes: ArrayBuffer, encrypted?: boolean) => PKM)(
      buffer.slice(0),
      true,
    );
    if (looksValid(encrypted)) {
      return encrypted;
    }
  } catch {
    /* fall through */
  }

  throw new Error("Could not decrypt or parse this Pokémon file.");
}

function genderOf(mon: PKM): string | null {
  const value = typeof mon.gender === "number" ? mon.gender : Number(mon.gender);
  return GENDER[value] || null;
}

function numberField(mon: PKM, key: string): number | null {
  if (!(key in mon)) {
    return null;
  }
  const value = (mon as unknown as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Gen 3–5 pack OT gender in bit 7 of the met-level byte (e.g. 158 → 30). */
function metLevelOf(mon: PKM): number | null {
  const raw = numberField(mon, "metLevel");
  if (raw == null) {
    return null;
  }
  const level = raw > 100 ? raw & 0x7f : raw;
  if (level < 0 || level > 100) {
    return null;
  }
  return level;
}

function boolField(mon: PKM, key: string): boolean {
  if (!(key in mon)) {
    return false;
  }
  return Boolean((mon as unknown as Record<string, unknown>)[key]);
}

function dateField(mon: PKM, key: string): string | null {
  if (!(key in mon)) {
    return null;
  }
  const value = (mon as unknown as Record<string, unknown>)[key] as PKMDate | undefined;
  if (!value || typeof value.year !== "number") {
    return null;
  }
  const year = value.year < 100 ? 2000 + value.year : value.year;
  if (year < 1996 || value.month < 1 || value.month > 12 || value.day < 1 || value.day > 31) {
    return null;
  }
  return `${year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
}

function ballNameOf(mon: PKM): string | null {
  const index = numberField(mon, "ball") ?? numberField(mon, "ballHGSS") ?? numberField(mon, "ballDPPt");
  if (index == null || index <= 0) {
    return null;
  }
  const name = Balls[index];
  if (!name || name.toLowerCase() === "invalid") {
    return null;
  }
  return `${name} Ball`;
}

function locationOf(mon: PKM, origin: number, format: string, egg: boolean): string | null {
  const keys = egg
    ? ["eggLocationIndex", "eggLocationIndexPtHGSS", "eggLocationIndexDP"]
    : ["metLocationIndex", "metLocationIndexPtHGSS", "metLocationIndexDP"];
  let index: number | null = null;
  for (const key of keys) {
    const value = numberField(mon, key);
    if (value != null && value > 0) {
      index = value;
      break;
    }
  }
  if (index == null) {
    return null;
  }
  try {
    const raw = getLocationString(origin, index, format, egg).trim();
    if (!raw || raw === "None" || raw === "———" || raw === String(index)) {
      return `Location ${index}`;
    }
    const label = raw.replace(/^(in|on|at|from)\s+/i, "").replace(/^the\s+/i, "");
    const time = TIME_OF_DAY[numberField(mon, "metTimeOfDay") ?? 0];
    return !egg && time ? `${label} · ${time}` : label;
  } catch {
    return `Location ${index}`;
  }
}

function numberList(mon: PKM, key: string): number[] {
  if (!(key in mon)) {
    return [];
  }
  const value = (mon as unknown as Record<string, unknown>)[key];
  return Array.isArray(value) ? value.filter((entry): entry is number => typeof entry === "number") : [];
}

function movesOf(mon: PKM): OwnedMove[] {
  const ids = numberList(mon, "moves");
  const pps = numberList(mon, "movePP");
  const ups = numberList(mon, "movePPUps");
  const moves: OwnedMove[] = [];
  ids.forEach((id, slot) => {
    if (!id) {
      return;
    }
    const catalog = findMove(id);
    moves.push({
      slot,
      move_id: id,
      name: catalog?.name || `Move ${id}`,
      pp: pps[slot] ?? catalog?.pp ?? null,
      pp_ups: ups[slot] ?? 0,
    });
  });
  return moves;
}

function calculatedStatsOf(mon: PKM): StatBlock | null {
  const getter = (mon as PKM & { getStats?: () => { hp: number; atk: number; def: number; spa: number; spd: number; spe: number } }).getStats;
  if (typeof getter !== "function") {
    return null;
  }
  try {
    return readStats(getter.call(mon));
  } catch {
    return null;
  }
}

function toPayload(mon: PKM, format: string, fallbackGameKey: string): ParsedPkSpecimen {
  const nickname = (mon.nickname || "").trim();
  const speciesFallback = `pokemon-${mon.dexNum}`;
  const origin = numberField(mon, "gameOfOrigin") ?? 0;
  const originName = originGameName(origin);
  const fromFile = gameKeyFromOrigin(origin);
  return {
    pokemon_id: mon.dexNum,
    game_key: fromFile || fallbackGameKey || null,
    species_slug: speciesFallback,
    nickname: nickname || null,
    level: typeof mon.getLevel === "function" ? mon.getLevel() : null,
    gender: genderOf(mon),
    shiny: typeof mon.isShiny === "function" ? mon.isShiny() : false,
    ability_name: slugify(abilityNameOf(mon)),
    ability_slot: abilitySlotOf(mon),
    nature: natureNameOf(mon),
    held_item: heldItemOf(mon),
    ball: ballNameOf(mon),
    met_game: originName,
    met_location: locationOf(mon, origin, format, false),
    met_level: metLevelOf(mon),
    met_date: dateField(mon, "metDate"),
    fateful_encounter: boolField(mon, "isFatefulEncounter"),
    egg_location: locationOf(mon, origin, format, true),
    moves: movesOf(mon),
    ivs: "ivs" in mon ? readStats(mon.ivs as { hp: number; atk: number; def: number; spa: number; spd: number; spe: number }) : null,
    evs: "evs" in mon ? readStats(mon.evs as { hp: number; atk: number; def: number; spa: number; spd: number; spe: number }) : null,
    stats: calculatedStatsOf(mon),
    source_type: "pk",
    raw_format: format.toLowerCase(),
    forme_num: "formeNum" in mon && typeof mon.formeNum === "number" ? mon.formeNum : 0,
    ot_name: "trainerName" in mon && typeof mon.trainerName === "string" ? mon.trainerName.trim() || null : null,
  };
}

/** Decrypt/parse a .pk* file in the browser and map it to owned-Pokémon write fields. */
export async function parsePkFile(file: File, fallbackGameKey: string): Promise<ParsedPkSpecimen> {
  const buffer = await file.arrayBuffer();
  return parsePkBytes(buffer, file.name, fallbackGameKey);
}

export function parsePkBytes(buffer: ArrayBuffer, filename: string, fallbackGameKey: string): ParsedPkSpecimen {
  const format = extensionOf(filename);
  if (!format) {
    throw new Error("Choose a .pk* or .pb7 Pokémon file.");
  }
  if (!buffer.byteLength) {
    throw new Error("That file is empty.");
  }
  const mon = loadMon(buffer, format);
  return toPayload(mon, format, fallbackGameKey);
}
