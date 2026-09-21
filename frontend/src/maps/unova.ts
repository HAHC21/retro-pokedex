import type { RegionMapDef, RegionNode } from "../routeGraph";

/**
 * Unova — central BW rectangle + League spur + Icirrus/Opelucid landmarks:
 *
 *                    League
 *                      |
 *                 Victory Road
 *                      |
 *                   Route 10
 *                      |
 *   Mistralton -- Icirrus -- R8 -- R9 -- Opelucid -- Lacunosa
 *        |       |  |    |    |                      |
 *       Chargestone
 *        |
 *       R6 -- Mistralton Cave
 *        |
 *   Driftveil ---- Nimbasa ---- Black / White Forest --┘
 *        |
 *   Cold Storage
 */
const NODES: Record<string, RegionNode> = {
  // Shared columns: Opelucid/Nimbasa x=100; Icirrus/Driftveil/Virbank x=20; west spine x=-25
  // League spur (straight north from Opelucid)
  "unova-pokemon-league": [100, -50, "Pokemon League", 1],
  "unova-victory-road": [100, -30, "Victory Road", 2],
  "unova-route-23": [200, -30, "Route 23", 0],
  "unova-route-10": [100, -10, "Route 10", 0],

  // Isolated (same y as Dragonspiral, left of everything)
  "anville-town": [-20, -10, "Anville Town", 1],

  // Top row — Icirrus is the top-left corner of the rectangle
  "icirrus-city": [20, 10, "Icirrus City", 1],
  "dragonspiral-tower": [20, -10, "Dragonspiral Tower", 2],
  "twist-mountain": [20, 28, "Twist Mountain", 2],
  "clay-tunnel": [20, 45, "Clay Tunnel", 2],
  "underground-ruins": [35, 45, "Underground Ruins", 2],
  "unova-route-7": [-15, 10, "Route 7", 0],
  "celestial-tower": [-25, 10, "Celestial Tower", 2],
  "unova-route-8": [60, 10, "Route 8", 0],
  "moor-of-icirrus": [60, -10, "Moor of Icirrus", 2],
  "unova-route-9": [80, 10, "Route 9", 0],
  "challengers-cave": [80, 28, "Challenger's Cave", 2],
  "opelucid-city": [100, 10, "Opelucid City", 1],
  "unova-route-11": [120, 10, "Route 11", 0],
  "village-bridge": [140, 10, "Village Bridge", 2],
  "unova-route-12": [160, 10, "Route 12", 0],
  "lacunosa-town": [180, 10, "Lacunosa Town", 1],
  "tubeline-bridge": [70, 10, "Tubeline Bridge", 2],
  "unova-route-13": [180, 30, "Route 13", 0],
  "giant-chasm": [200, 30, "Giant Chasm", 2],
  "unova-route-22": [260, 30, "Route 22", 0],
  "undella-town": [180, 50, "Undella Town", 1],
  "lentimas-town": [160, 50, "Lentimas Town", 1],
  "strange-house": [160, 35, "Strange House", 2],
  "reversal-mountain": [145, 50, "Reversal Mountain", 2],
  "undella-bay": [200, 50, "Undella Bay", 2],
  "abyssal-ruins": [200, 65, "Abyssal Ruins", 2],
  "unova-route-21": [220, 50, "Route 21", 0],
  "seaside-cave": [240, 50, "Seaside Cave", 2],
  "humilau-city": [260, 50, "Humilau City", 1],
  "marine-tube": [260, 65, "Marine Tube", 2],
  "nature-sanctuary": [280, 50, "Nature Sanctuary", 2],
  "unova-route-14": [180, 70, "Route 14", 0],
  "abundant-shrine": [160, 70, "Abundant Shrine", 2],

  // West spine (Mistralton below Celestial / left of Twist)
  "mistralton-city": [-25, 28, "Mistralton City", 1],
  "chargestone-cave": [-25, 50, "Chargestone Cave", 2],
  "unova-route-6": [-25, 70, "Route 6", 0],
  "mistralton-cave": [-25, 80, "Mistralton Cave", 2],

  // Bottom: Driftveil under Icirrus; Nimbasa under Opelucid
  "driftveil-city": [20, 90, "Driftveil City", 1],
  "cold-storage": [20, 100, "Cold Storage", 2],
  "virbank-city": [20, 140, "Virbank City", 1],
  "virbank-complex": [20, 155, "Virbank Complex", 2],
  "unova-route-20": [-30, 140, "Route 20", 0],
  "floccesy-town": [-60, 140, "Floccesy Town", 1],
  "floccesy-ranch": [-60, 125, "Floccesy Ranch", 2],
  "pledge-grove": [-75, 125, "Pledge Grove", 2],
  "unova-route-19": [-60, 165, "Route 19", 0],
  "aspertia-city": [-60, 190, "Aspertia City", 1],
  "driftveil-drawbridge": [60, 90, "Driftveil Drawbridge", 2],
  "unova-route-5": [80, 90, "Route 5", 0],
  "nimbasa-city": [100, 90, "Nimbasa City", 1],
  "unova-route-16": [120, 90, "Route 16", 0],
  "lostlorn-forest": [120, 75, "Lostlorn Forest", 2],
  "marvelous-bridge": [145, 90, "Marvelous Bridge", 2],
  "unova-route-15": [165, 90, "Route 15", 0],
  "black-city": [180, 90, "Black City / White Forest", 1],

  // South of Nimbasa (same x as Nimbasa/Opelucid)
  "unova-route-4": [100, 115, "Route 4", 0],
  "desert-resort": [86, 115, "Desert Resort", 2],
  "relic-castle": [72, 115, "Relic Castle", 2],
  "castelia-city": [100, 140, "Castelia City", 1],
  "castelia-sewers": [100, 155, "Castelia Sewers", 2],
  "relic-passage": [80, 140, "Relic Passage", 2],

  // Isolated islands (west / south of Castelia)
  "liberty-garden": [60, 178, "Liberty Garden", 2],
  "unity-tower": [70, 170, "Unity Tower", 2],

  // East of Castelia (Nacrene shares Black City's x=180)
  "skyarrow-bridge": [125, 140, "Skyarrow Bridge", 2],
  "pinwheel-forest": [150, 140, "Pinwheel Forest", 2],
  "nacrene-city": [180, 140, "Nacrene City", 1],
  "unova-route-3": [205, 140, "Route 3", 0],
  "wellspring-cave": [205, 122, "Wellspring Cave", 2],
  "striaton-city": [230, 140, "Striaton City", 1],
  "dreamyard": [250, 140, "Dreamyard", 2],
  "rumination-field": [265, 140, "Rumination Field", 2],

  // South of Striaton
  "unova-route-2": [230, 160, "Route 2", 0],
  "accumula-town": [230, 180, "Accumula Town", 1],
  "unova-route-1": [230, 200, "Route 1", 0],
  "nuvema-town": [230, 220, "Nuvema Town", 1],

  // West of Nuvema
  "unova-route-17": [205, 220, "Route 17", 0],
  "p2-laboratory": [205, 200, "P2 Laboratory", 2],
  "unova-route-18": [180, 220, "Route 18", 0],
};

const EDGES: Array<[string, string]> = [
  // League spur
  ["opelucid-city", "unova-route-10"],
  ["unova-route-10", "unova-victory-road"],
  ["unova-victory-road", "unova-pokemon-league"],
  ["unova-victory-road", "unova-route-23"],
  ["unova-route-23", "giant-chasm"],

  // Top row + Icirrus / Route 8–9 landmarks (Icirrus = NW corner)
  ["icirrus-city", "dragonspiral-tower"],
  ["icirrus-city", "twist-mountain"],
  ["twist-mountain", "clay-tunnel"],
  ["clay-tunnel", "underground-ruins"],
  ["icirrus-city", "unova-route-7"],
  ["unova-route-7", "celestial-tower"],
  ["unova-route-7", "mistralton-city"],
  ["icirrus-city", "unova-route-8"],
  ["unova-route-8", "moor-of-icirrus"],
  ["unova-route-8", "tubeline-bridge"],
  ["tubeline-bridge", "unova-route-9"],
  ["unova-route-9", "challengers-cave"],
  ["unova-route-9", "opelucid-city"],
  ["opelucid-city", "unova-route-11"],
  ["unova-route-11", "village-bridge"],
  ["village-bridge", "unova-route-12"],
  ["unova-route-12", "lacunosa-town"],

  // Right column: Lacunosa — R13 — Undella — Black/White
  ["lacunosa-town", "unova-route-13"],
  ["unova-route-13", "giant-chasm"],
  ["unova-route-13", "undella-town"],
  ["undella-town", "lentimas-town"],
  ["lentimas-town", "strange-house"],
  ["lentimas-town", "reversal-mountain"],
  ["undella-town", "undella-bay"],
  ["undella-bay", "abyssal-ruins"],
  ["undella-bay", "unova-route-21"],
  ["unova-route-21", "seaside-cave"],
  ["seaside-cave", "humilau-city"],
  ["humilau-city", "marine-tube"],
  ["humilau-city", "unova-route-22"],
  ["unova-route-22", "giant-chasm"],
  ["undella-town", "unova-route-14"],
  ["unova-route-14", "abundant-shrine"],
  ["unova-route-14", "black-city"],

  // Bottom row: Driftveil — Drawbridge — R5 — Nimbasa — R16 — Marvelous Bridge — R15 — Black/White
  ["driftveil-city", "driftveil-drawbridge"],
  ["driftveil-drawbridge", "unova-route-5"],
  ["unova-route-5", "nimbasa-city"],
  ["nimbasa-city", "unova-route-16"],
  ["unova-route-16", "lostlorn-forest"],
  ["unova-route-16", "marvelous-bridge"],
  ["marvelous-bridge", "unova-route-15"],
  ["unova-route-15", "black-city"],

  // Left column: Mistralton — Chargestone — R6 — Driftveil
  ["mistralton-city", "chargestone-cave"],
  ["chargestone-cave", "unova-route-6"],
  ["unova-route-6", "mistralton-cave"],
  ["unova-route-6", "driftveil-city"],

  // Cold Storage spur (south of Driftveil only)
  ["driftveil-city", "cold-storage"],

  // Virbank — R20 — Floccesy — R19 — Aspertia
  ["virbank-city", "virbank-complex"],
  ["virbank-city", "unova-route-20"],
  ["unova-route-20", "floccesy-town"],
  ["floccesy-town", "floccesy-ranch"],
  ["floccesy-ranch", "pledge-grove"],
  ["floccesy-town", "unova-route-19"],
  ["unova-route-19", "aspertia-city"],

  // South of Nimbasa
  ["nimbasa-city", "unova-route-4"],
  ["unova-route-4", "castelia-city"],
  ["castelia-city", "castelia-sewers"],
  ["castelia-city", "relic-passage"],
  ["unova-route-4", "desert-resort"],
  ["desert-resort", "relic-castle"],

  // East of Castelia
  ["castelia-city", "skyarrow-bridge"],
  ["skyarrow-bridge", "pinwheel-forest"],
  ["pinwheel-forest", "nacrene-city"],
  ["nacrene-city", "unova-route-3"],
  ["unova-route-3", "wellspring-cave"],
  ["unova-route-3", "striaton-city"],
  ["striaton-city", "dreamyard"],
  ["dreamyard", "rumination-field"],

  // South of Striaton
  ["striaton-city", "unova-route-2"],
  ["unova-route-2", "accumula-town"],
  ["accumula-town", "unova-route-1"],
  ["unova-route-1", "nuvema-town"],

  // West of Nuvema
  ["nuvema-town", "unova-route-17"],
  ["unova-route-17", "p2-laboratory"],
  ["unova-route-17", "unova-route-18"],
];

const ALIASES: Record<string, string> = {
  "white-forest": "black-city",
  "challenger-s-cave": "challengers-cave",
  "rocky-mountain-room": "underground-ruins",
  "glacier-room": "underground-ruins",
  "iron-room": "underground-ruins",
};

export const UNOVA_MAP: RegionMapDef = {
  id: "unova",
  title: "Unova",
  viewBox: "-90 -60 380 300",
  width: 380,
  height: 300,
  originX: -90,
  originY: -60,
  nodes: NODES,
  edges: EDGES,
  aliases: ALIASES,
};
