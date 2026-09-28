import type { RegionEdge, RegionMapDef, RegionNode } from "../routeGraph";

/**
 * Hoenn from the official region map (west continent, east islands, south sea):
 *
 *  Falls—114—Fallarbor—113                    Fortree—120
 *    |         |  Chimney                      |      |
 *   115     112/Lavaridge                     119    121—Lilycove—124—Mossdeep—125
 *    |         |  111                          |      |      |           |
 *  Rustboro—116—Verdanturf—117—Mauville—118----+     122    126         127
 *    |                           |   |               |      |           |
 *  Woods                        110  123-------------+   Sootopolis    League
 *    |                           |                              |         |
 *   104                    Slateport                           Origin   Ever Grande
 *    |                           |
 * Petalburg—102—Oldale—103      109
 *    |            |              |
 *   105          101            134—133—132—Pacifidlog—131—130—129—128
 *    |            |                                          |
 *   106       Littleroot                                  Sky Pillar
 *    |
 * Dewford—107—108
 */
const NODES: Record<string, RegionNode> = {
  // ——— Northwest: Fallarbor loop ———
  "meteor-falls": [16, 26, "Meteor Falls", 2],
  "hoenn-route-114": [40, 10, "Route 114", 0],
  "fallarbor-town": [64, 10, "Fallarbor Town", 1],
  "hoenn-route-113": [96, 10, "Route 113", 0],
  "hoenn-route-115": [16, 42, "Route 115", 0],

  // ——— Mt. Chimney / Lavaridge / Route 111 ———
  "mt-chimney": [80, 18, "Mt. Chimney", 2],
  "fiery-path": [88, 18, "Fiery Path", 2],
  "jagged-pass": [72, 26, "Jagged Pass", 2],
  "hoenn-route-112": [80, 26, "Route 112", 0],
  "hoenn-route-111": [96, 26, "Route 111", 0],
  "desert-ruins": [112, 26, "Desert Ruins", 2],
  "lavaridge-town": [64, 34, "Lavaridge Town", 1],

  // ——— Central west–east spine ———
  "rustboro-city": [16, 58, "Rustboro City", 1],
  "hoenn-route-116": [40, 58, "Route 116", 0],
  "rusturf-tunnel": [52, 58, "Rusturf Tunnel", 2],
  "verdanturf-town": [64, 58, "Verdanturf Town", 1],
  "hoenn-route-117": [80, 58, "Route 117", 0],
  "mauville-city": [96, 58, "Mauville City", 1],
  "new-mauville": [108, 66, "New Mauville", 2],
  "hoenn-route-118": [120, 58, "Route 118", 0],

  // ——— Petalburg Woods south of Rustboro ———
  "petalburg-woods": [16, 74, "Petalburg Woods", 2],
  "hoenn-route-104": [32, 74, "Route 104", 0],

  // ——— Northeast: Fortree / Lilycove ———
  "fortree-city": [144, 10, "Fortree City", 1],
  "hoenn-route-120": [176, 10, "Route 120", 0],
  "hoenn-route-119": [144, 26, "Route 119", 0],
  "hoenn-safari-zone": [192, 26, "Safari Zone", 2],
  "hoenn-route-121": [176, 42, "Route 121", 0],
  "lilycove-city": [216, 42, "Lilycove City", 1],
  "hoenn-route-123": [148, 58, "Route 123", 0],
  "hoenn-route-122": [176, 58, "Route 122", 0],
  "mt-pyre": [176, 74, "Mt. Pyre", 2],

  // ——— East islands ———
  "shoal-cave": [272, 8, "Shoal Cave", 2],
  "hoenn-route-125": [272, 22, "Route 125", 0],
  "hoenn-pokemon-league": [304, 26, "Pokemon League", 1],
  "mossdeep-city": [272, 42, "Mossdeep City", 1],
  "hoenn-route-124": [244, 42, "Route 124", 0],
  "hoenn-victory-road": [304, 50, "Victory Road", 2],
  "hoenn-route-127": [272, 62, "Route 127", 0],
  "hoenn-route-126": [244, 74, "Route 126", 0],
  "sootopolis-city": [216, 74, "Sootopolis City", 1],
  "ever-grande-city": [304, 74, "Ever Grande City", 1],
  "cave-of-origin": [216, 86, "Cave of Origin", 2],
  "seafloor-cavern": [272, 90, "Seafloor Cavern", 2],
  "hoenn-route-128": [288, 90, "Route 128", 0],

  // ——— Southwest towns ———
  "petalburg-city": [32, 90, "Petalburg City", 1],
  "hoenn-route-102": [48, 90, "Route 102", 0],
  "oldale-town": [64, 90, "Oldale Town", 1],
  "hoenn-route-103": [80, 90, "Route 103", 0],
  "hoenn-route-110": [96, 74, "Route 110", 0],
  "slateport-city": [96, 90, "Slateport City", 1],
  "hoenn-route-101": [64, 106, "Route 101", 0],
  "hoenn-route-105": [16, 106, "Route 105", 0],
  "littleroot-town": [64, 122, "Littleroot Town", 1],

  // ——— Dewford island and south-west sea ———
  "granite-cave": [4, 122, "Granite Cave", 2],
  "hoenn-route-106": [16, 122, "Route 106", 0],
  "abandoned-ship": [64, 122, "Abandoned Ship", 2],
  "dewford-town": [16, 138, "Dewford Town", 1],
  "hoenn-route-107": [48, 138, "Route 107", 0],
  "hoenn-route-108": [72, 138, "Route 108", 0],
  "hoenn-route-109": [96, 122, "Route 109", 0],

  // ——— South sea: Slateport east to Ever Grande ———
  "hoenn-route-134": [120, 106, "Route 134", 0],
  "hoenn-route-133": [148, 106, "Route 133", 0],
  "hoenn-route-132": [176, 106, "Route 132", 0],
  "pacifidlog-town": [204, 106, "Pacifidlog Town", 1],
  "sky-pillar": [232, 90, "Sky Pillar", 2],
  "hoenn-route-131": [232, 106, "Route 131", 0],
  "hoenn-route-130": [256, 106, "Route 130", 0],
  "hoenn-route-129": [272, 106, "Route 129", 0],
};

const EDGES: RegionEdge[] = [
  // Fallarbor loop
  ["fallarbor-town", "hoenn-route-113"],
  ["hoenn-route-113", "hoenn-route-111"],
  ["fallarbor-town", "hoenn-route-114"],
  ["hoenn-route-114", "meteor-falls"],
  ["meteor-falls", "hoenn-route-115"],
  ["hoenn-route-115", "rustboro-city"],

  // Chimney / Lavaridge
  ["mauville-city", "hoenn-route-111"],
  ["hoenn-route-111", "desert-ruins"],
  ["hoenn-route-111", "hoenn-route-112"],
  ["hoenn-route-112", "fiery-path"],
  ["hoenn-route-112", "mt-chimney"],
  ["mt-chimney", "jagged-pass"],
  ["jagged-pass", "lavaridge-town"],

  // Rustboro → Mauville
  ["rustboro-city", "hoenn-route-116"],
  ["hoenn-route-116", "rusturf-tunnel"],
  ["rusturf-tunnel", "verdanturf-town"],
  ["verdanturf-town", "hoenn-route-117"],
  ["hoenn-route-117", "mauville-city"],
  ["mauville-city", "new-mauville"],

  // Rustboro → Petalburg → Oldale → Littleroot
  ["rustboro-city", "petalburg-woods"],
  ["petalburg-woods", "hoenn-route-104"],
  ["hoenn-route-104", "petalburg-city"],
  ["petalburg-city", "hoenn-route-102"],
  ["hoenn-route-102", "oldale-town"],
  ["oldale-town", "hoenn-route-103"],
  ["oldale-town", "hoenn-route-101"],
  ["hoenn-route-101", "littleroot-town"],

  // Mauville → Slateport
  ["mauville-city", "hoenn-route-110"],
  ["hoenn-route-110", "slateport-city"],

  // Dewford loop
  ["petalburg-city", "hoenn-route-105"],
  ["hoenn-route-105", "hoenn-route-106"],
  ["hoenn-route-106", "dewford-town"],
  ["dewford-town", "granite-cave"],
  ["dewford-town", "hoenn-route-107"],
  ["hoenn-route-107", "hoenn-route-108"],
  ["hoenn-route-108", "abandoned-ship"],
  ["hoenn-route-108", "hoenn-route-109"],
  ["hoenn-route-109", "slateport-city"],

  // Mauville east → Fortree → Lilycove
  ["mauville-city", "hoenn-route-118"],
  ["hoenn-route-118", "hoenn-route-119"],
  ["hoenn-route-119", "fortree-city"],
  ["fortree-city", "hoenn-route-120"],
  ["hoenn-route-120", "hoenn-route-121"],
  ["hoenn-route-121", "hoenn-safari-zone"],
  ["hoenn-route-121", "lilycove-city"],
  ["hoenn-route-118", "hoenn-route-123"],
  ["hoenn-route-123", "hoenn-route-122"],
  ["hoenn-route-121", "hoenn-route-122"],
  ["hoenn-route-122", "mt-pyre"],

  // East sea
  ["lilycove-city", "hoenn-route-124"],
  ["hoenn-route-124", "mossdeep-city"],
  ["mossdeep-city", "hoenn-route-125"],
  ["hoenn-route-125", "shoal-cave"],
  ["hoenn-route-124", "hoenn-route-126"],
  ["hoenn-route-126", "sootopolis-city"],
  ["sootopolis-city", "cave-of-origin"],
  ["hoenn-route-126", "hoenn-route-127"],
  ["mossdeep-city", "hoenn-route-127"],
  ["hoenn-route-127", "hoenn-route-128"],
  ["hoenn-route-128", "seafloor-cavern"],
  ["hoenn-route-128", "ever-grande-city"],
  ["ever-grande-city", "hoenn-victory-road"],
  ["hoenn-victory-road", "hoenn-pokemon-league"],

  // South sea, west to east
  ["slateport-city", "hoenn-route-134"],
  ["hoenn-route-134", "hoenn-route-133"],
  ["hoenn-route-133", "hoenn-route-132"],
  ["hoenn-route-132", "pacifidlog-town"],
  ["pacifidlog-town", "hoenn-route-131"],
  ["hoenn-route-131", "sky-pillar"],
  ["hoenn-route-131", "hoenn-route-130"],
  ["hoenn-route-130", "hoenn-route-129"],
  ["hoenn-route-129", "hoenn-route-128"],
];

const ALIASES: Record<string, string> = {
  "team-aqua-hideout": "lilycove-city",
  "team-magma-hideout": "mt-chimney",
  "magma-hideout": "mt-chimney",
  "sea-mauville": "abandoned-ship",
  "ss-tidal": "lilycove-city",
  "underwater": "hoenn-route-126",
  "scorched-slab": "hoenn-route-120",
  "mirage-tower": "hoenn-route-111",
  "desert-underpass": "hoenn-route-114",
};

export const HOENN_MAP: RegionMapDef = {
  id: "hoenn",
  title: "Hoenn",
  viewBox: "-16 -16 348 172",
  width: 348,
  height: 172,
  originX: -16,
  originY: -16,
  nodes: NODES,
  edges: EDGES,
  aliases: ALIASES,
};
