import type { RegionMapDef, RegionNode } from "../routeGraph";

/**
 * Sinnoh graph from the numbered pixel town-map:
 *
 *   P/Q islands     K·13 Snowpoint              15 League——S     17·R Battle Zone
 *   I·12 Canalave——3 Jubilife——B——4 Oreburgh         |            16——18
 *        |            | 5 Floaroma——D——6 Eterna——F/M——11 Celestic——9 Veilstone
 *        |            |         206/207   | 208              210/215    214
 *   A——1——201——2 Sandgem              7 Hearthome——209——8 Solaceon      |
 *              | 202                        | 212                        J Valor——222——14 Sunny
 *              219·220·221·H               10 Pastoria——————213——————————┘
 */
const SCALE_X = 1.28;
const SCALE_Y = 1.28 * 1.25; // +25% vertical stretch

function n(x: number, y: number, label: string, kind: 0 | 1 | 2): RegionNode {
  return [x * SCALE_X, y * SCALE_Y, label, kind];
}

const NODES: Record<string, RegionNode> = {
  // ——— NW isolated islands (same latitude as Snowpoint) ———
  "fullmoon-island": n(4, -40, "Fullmoon Island", 2),
  "newmoon-island": n(16, -40, "Newmoon Island", 2),

  // ——— SW: Twinleaf EAST to Sandgem on 201 (horizontal), then north to Jubilife ———
  "twinleaf-town": n(20, 78, "Twinleaf Town", 1),
  "sinnoh-route-201": n(36, 78, "Route 201", 0),
  "lake-verity": n(20, 68, "Lake Verity", 2),
  "sandgem-town": n(52, 78, "Sandgem Town", 1),
  "sinnoh-route-202": n(52, 64, "Route 202", 0),
  "jubilife-city": n(52, 50, "Jubilife City", 1),

  // Coast south of Sandgem → Pal Park
  "sinnoh-route-219": n(52, 90, "Route 219", 0),
  "sinnoh-sea-route-220": n(68, 94, "Route 220", 0),
  "sinnoh-route-221": n(86, 94, "Route 221", 0),
  "pal-park": n(102, 94, "Pal Park", 2),

  // West: Canalave + Iron Island
  "sinnoh-route-218": n(34, 50, "Route 218", 0),
  "canalave-city": n(16, 50, "Canalave City", 1),
  "iron-island": n(16, 22, "Iron Island", 2),

  // East: Oreburgh
  "sinnoh-route-203": n(68, 50, "Route 203", 0),
  "oreburgh-gate": n(82, 50, "Oreburgh Gate", 2),
  "oreburgh-city": n(82, 62, "Oreburgh City", 1),
  "oreburgh-mine": n(82, 74, "Oreburgh Mine", 2),

  // North: Floaroma → Eterna Forest → Eterna
  "sinnoh-route-204": n(52, 38, "Route 204", 0),
  "ravaged-path": n(52, 30, "Ravaged Path", 2),
  "floaroma-town": n(52, 22, "Floaroma Town", 1),
  "floaroma-meadow": n(36, 22, "Floaroma Meadow", 2),
  "fuego-ironworks": n(36, 12, "Fuego Ironworks", 2),
  "sinnoh-route-205": n(68, 22, "Route 205", 0),
  "valley-windworks": n(68, 12, "Valley Windworks", 2),
  "eterna-forest": n(84, 22, "Eterna Forest", 2),
  "eterna-city": n(95, 22, "Eterna City", 1),
  "old-chateau": n(84, 12, "Old Chateau", 2),

  // Cycling Road → 207 → Oreburgh / Coronet
  "sinnoh-route-206": n(100, 36, "Route 206", 0),
  "wayward-cave": n(88, 36, "Wayward Cave", 2),
  "sinnoh-route-207": n(100, 50, "Route 207", 0),

  // Mt. Coronet vertical spine (center divide)
  "mt-coronet": n(116, 36, "Mt. Coronet", 2),
  "spear-pillar": n(128, 36, "Spear Pillar", 2),

  // Snowpoint spur: Coronet → up/west jog on 216 → LONG 217 north → Acuity → Snowpoint EAST
  "sinnoh-route-216": n(108, 12, "Route 216", 0),
  "sinnoh-route-217": n(108, -14, "Route 217", 0),
  "lake-acuity": n(108, -40, "Lake Acuity", 2),
  "acuity-lakefront": n(124, -40, "Acuity Lakefront", 2),
  "snowpoint-city": n(146, -40, "Snowpoint City", 1),
  "snowpoint-temple": n(146, -28, "Snowpoint Temple", 2),

  // Coronet east → Hearthome (geometric center)
  "sinnoh-route-208": n(132, 50, "Route 208", 0),
  "hearthome-city": n(148, 50, "Hearthome City", 1),

  // Hearthome east → Solaceon
  "sinnoh-route-209": n(164, 50, "Route 209", 0),
  "lost-tower": n(164, 60, "Lost Tower", 2),
  "solaceon-town": n(164, 70, "Solaceon Town", 1),
  "solaceon-ruins": n(178, 70, "Solaceon Ruins", 2),

  // Hearthome south → Pastoria
  "sinnoh-route-212": n(148, 64, "Route 212", 0),
  "trophy-garden": n(148, 76, "Trophy Garden", 2),
  "pastoria-city": n(148, 88, "Pastoria City", 1),
  "great-marsh": n(132, 88, "Great Marsh", 2),

  // Celestic east of Coronet; 210 ↔ Celestic; 215 hangs off 210 → Veilstone
  "sinnoh-route-211": n(116, 22, "Route 211", 0),
  "celestic-town": n(136, 22, "Celestic Town", 1),
  "sinnoh-route-210": n(158, 22, "Route 210", 0),
  "sinnoh-route-215": n(178, 28, "Route 215", 0),
  "veilstone-city": n(192, 28, "Veilstone City", 1),
  "galactic-hq": n(206, 28, "Galactic HQ", 2),

  // Valor hub: 214 from Veilstone, 213 from Pastoria, long 222 east to Sunyshore
  "sinnoh-route-214": n(192, 56, "Route 214", 0),
  "maniac-tunnel": n(178, 56, "Maniac Tunnel", 2),
  "sendoff-spring": n(210, 56, "Sendoff Spring", 2),
  "turnback-cave": n(225, 56, "Turnback Cave", 2),
  "valor-lakefront": n(192, 72, "Valor Lakefront", 2),
  "lake-valor": n(192, 84, "Lake Valor", 2),
  "sinnoh-route-213": n(170, 88, "Route 213", 0),

  // Long 222 east → Sunyshore; then straight vertical: 223 → VR → League → 224
  "sinnoh-route-222": n(240, 72, "Route 222", 0),
  "sunyshore-city": n(288, 72, "Sunyshore City", 1),
  "sinnoh-sea-route-223": n(288, 48, "Route 223", 0),
  "sinnoh-victory-road": n(288, 28, "Victory Road", 2),
  "sinnoh-pokemon-league": n(288, 8, "Pokemon League", 1),
  "sinnoh-route-224": n(288, -12, "Route 224", 0),
  "seabreak-path": n(288, -28, "Seabreak Path", 2),
  "flower-paradise": n(288, -46, "Flower Paradise", 2),

  // ——— Battle Zone: 229 in SE corner; Resort hangs south off 229 ———
  // Survival —226— 227 — Stark (north)
  //    |              |
  //   225            228
  //    |              |
  //  Fight —230—    229 (corner)
  //                   |
  //                 Resort
  "survival-area": n(220, -40, "Survival Area", 1),
  "sinnoh-sea-route-226": n(240, -40, "Route 226", 0),
  "sinnoh-route-227": n(260, -40, "Route 227", 0),
  "stark-mountain": n(260, -56, "Stark Mountain", 2),
  "sinnoh-route-225": n(220, -26, "Route 225", 0),
  "fight-area": n(220, -12, "Fight Area", 1),
  "sinnoh-route-228": n(260, -26, "Route 228", 0),
  "sinnoh-route-229": n(260, -12, "Route 229", 0),
  "resort-area": n(260, -2, "Resort Area", 1),
  "sinnoh-sea-route-230": n(240, -12, "Route 230", 0),
};

const EDGES: Array<[string, string]> = [
  // Twinleaf —201— Sandgem —202— Jubilife
  ["twinleaf-town", "sinnoh-route-201"],
  ["sinnoh-route-201", "lake-verity"],
  ["sinnoh-route-201", "sandgem-town"],
  ["sandgem-town", "sinnoh-route-202"],
  ["sinnoh-route-202", "jubilife-city"],

  // Sandgem coast → Pal Park
  ["sandgem-town", "sinnoh-route-219"],
  ["sinnoh-route-219", "sinnoh-sea-route-220"],
  ["sinnoh-sea-route-220", "sinnoh-route-221"],
  ["sinnoh-route-221", "pal-park"],

  // Canalave
  ["jubilife-city", "sinnoh-route-218"],
  ["sinnoh-route-218", "canalave-city"],
  ["canalave-city", "iron-island"],

  // Oreburgh
  ["jubilife-city", "sinnoh-route-203"],
  ["sinnoh-route-203", "oreburgh-gate"],
  ["oreburgh-gate", "oreburgh-city"],
  ["oreburgh-city", "oreburgh-mine"],

  // Floaroma / Eterna
  ["jubilife-city", "sinnoh-route-204"],
  ["sinnoh-route-204", "ravaged-path"],
  ["ravaged-path", "floaroma-town"],
  ["floaroma-town", "floaroma-meadow"],
  ["floaroma-town", "fuego-ironworks"],
  ["floaroma-town", "sinnoh-route-205"],
  ["sinnoh-route-205", "valley-windworks"],
  ["sinnoh-route-205", "eterna-forest"],
  ["eterna-forest", "eterna-city"],
  ["eterna-forest", "old-chateau"],

  // Cycling Road / Coronet west
  ["eterna-city", "sinnoh-route-206"],
  ["sinnoh-route-206", "wayward-cave"],
  ["sinnoh-route-206", "sinnoh-route-207"],
  ["sinnoh-route-207", "oreburgh-city"],
  ["sinnoh-route-207", "mt-coronet"],
  ["mt-coronet", "spear-pillar"],

  // Coronet ↔ Hearthome / Celestic / Eterna
  ["mt-coronet", "sinnoh-route-208"],
  ["sinnoh-route-208", "hearthome-city"],
  ["eterna-city", "sinnoh-route-211"],
  ["sinnoh-route-211", "mt-coronet"],
  ["sinnoh-route-211", "celestic-town"],

  // 210: Solaceon → Celestic; 215 spur off 210 → Veilstone (not Hearthome)
  ["solaceon-town", "sinnoh-route-210"],
  ["sinnoh-route-210", "celestic-town"],
  ["sinnoh-route-210", "sinnoh-route-215"],
  ["sinnoh-route-215", "veilstone-city"],
  ["veilstone-city", "galactic-hq"],

  // Hearthome east / south
  ["hearthome-city", "sinnoh-route-209"],
  ["sinnoh-route-209", "lost-tower"],
  ["lost-tower", "solaceon-town"],
  ["solaceon-town", "solaceon-ruins"],
  ["hearthome-city", "sinnoh-route-212"],
  ["sinnoh-route-212", "trophy-garden"],
  ["sinnoh-route-212", "pastoria-city"],
  ["pastoria-city", "great-marsh"],

  // Valor hub (213 / 214 / 222)
  ["pastoria-city", "sinnoh-route-213"],
  ["sinnoh-route-213", "valor-lakefront"],
  ["valor-lakefront", "lake-valor"],
  ["veilstone-city", "sinnoh-route-214"],
  ["sinnoh-route-214", "maniac-tunnel"],
  ["sinnoh-route-214", "sendoff-spring"],
  ["sendoff-spring", "turnback-cave"],
  ["sinnoh-route-214", "valor-lakefront"],
  ["valor-lakefront", "sinnoh-route-222"],
  ["sinnoh-route-222", "sunyshore-city"],

  // Snowpoint: long 216/217 north, then Acuity → east to Snowpoint
  ["mt-coronet", "sinnoh-route-216"],
  ["sinnoh-route-216", "sinnoh-route-217"],
  ["sinnoh-route-217", "lake-acuity"],
  ["lake-acuity", "acuity-lakefront"],
  ["acuity-lakefront", "snowpoint-city"],
  ["snowpoint-city", "snowpoint-temple"],

  // League
  ["sunyshore-city", "sinnoh-sea-route-223"],
  ["sinnoh-sea-route-223", "sinnoh-victory-road"],
  ["sinnoh-victory-road", "sinnoh-pokemon-league"],
  ["sinnoh-pokemon-league", "sinnoh-route-224"],
  ["sinnoh-route-224", "seabreak-path"],
  ["seabreak-path", "flower-paradise"],

  // Battle Zone loop (no mainland ferry)
  ["fight-area", "sinnoh-route-225"],
  ["sinnoh-route-225", "survival-area"],
  ["survival-area", "sinnoh-sea-route-226"],
  ["sinnoh-sea-route-226", "sinnoh-route-227"],
  ["sinnoh-route-227", "stark-mountain"],
  ["sinnoh-route-227", "sinnoh-route-228"],
  ["sinnoh-route-228", "sinnoh-route-229"],
  ["sinnoh-route-229", "resort-area"],
  ["sinnoh-route-229", "sinnoh-sea-route-230"],
  ["sinnoh-sea-route-230", "fight-area"],
];

const ALIASES: Record<string, string> = {
  "sinnoh-route-220": "sinnoh-sea-route-220",
  "sinnoh-route-223": "sinnoh-sea-route-223",
  "sinnoh-route-226": "sinnoh-sea-route-226",
  "sinnoh-route-230": "sinnoh-sea-route-230",
  "verity-lakefront": "lake-verity",
  "verity-cavern": "lake-verity",
  "valor-cavern": "lake-valor",
  "acuity-cavern": "lake-acuity",
  "spring-path": "sendoff-spring",
  "ruin-maniac-cave": "maniac-tunnel",
  "tg-eterna-bldg": "eterna-city",
  "sinnoh-hall-of-origin-1": "spear-pillar",
  "sinnoh-hall-of-origin-2": "spear-pillar",
  "fullmoon-isl": "fullmoon-island",
  "newmoon-isl": "newmoon-island",
  "battle-park": "fight-area",
  "battle-tower": "fight-area",
  "battle-frontier": "fight-area",
  "ramanunas-park": "pal-park",
  "ramanuas-park": "pal-park",
  "amity-square": "hearthome-city",
};

export const SINNOH_MAP: RegionMapDef = {
  id: "sinnoh",
  title: "Sinnoh",
  viewBox: `${-5 * SCALE_X} ${-66 * SCALE_Y} ${314 * SCALE_X} ${172 * SCALE_Y}`,
  width: 314 * SCALE_X,
  height: 172 * SCALE_Y,
  originX: -5 * SCALE_X,
  originY: -66 * SCALE_Y,
  nodes: NODES,
  edges: EDGES,
  aliases: ALIASES,
};
