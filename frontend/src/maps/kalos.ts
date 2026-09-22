import type { RegionEdge, RegionMapDef, RegionNode } from "../routeGraph";

/**
 * Kalos hub — pentagon rotated so Route 14 / Laverre is due north
 * (SVG y-down, 0° east, 270° north). West loop is the east loop
 * mirrored across Lumiose.
 *
 *                 Poke Ball Factory
 *                       |
 *                    Laverre
 *                       14
 * Sea Spirit's Den
 *         /
 * Coumarine --12-- Shalour         Dendemille --17-- Anistar
 *      13 \      RC 11 \               / 15            / 18
 *    Power Plant  Geosenge  -- 16            Couriway
 *        5 /  Parfum     10 /  Lost Hotel           \ 19
 * Camphrier --7--- CC -- Cyllage                   Pokemon Village
 *                        8 \
 *                     Ambrette --9-- Glittering Cave
 *               Santalune --22-- VR --21-- Snowbelle
 *                    |
 *              Santalune Forest
 *                    2
 *                Aquacorde              Kiloude
 *                    1                     |
 *                 Vaniville          Friend Safari
 *                                |
 *                          Pokemon League
 */
const LUMIOSE = { x: 190, y: 150 };
const CITY_R = 160;
const ROUTE_R = 80;
const SPUR = 36;
const LOOP = 125;
const MAP_PAD = 48;
const SANTALUNE = 54;
const CAMPHRIER = 126;
const COUMARINE = 198;
const LAVERRE = 270;
const DENDEMILLE = 342;

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function spoke(deg: number, radius: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [round1(LUMIOSE.x + radius * Math.cos(rad)), round1(LUMIOSE.y + radius * Math.sin(rad))];
}

function at(deg: number, radius: number, label: string, kind: 0 | 1 | 2): RegionNode {
  const [x, y] = spoke(deg, radius);
  return [x, y, label, kind];
}

function along(a: RegionNode, b: RegionNode, t: number, label: string, kind: 0 | 1 | 2): RegionNode {
  return [round1(a[0] + (b[0] - a[0]) * t), round1(a[1] + (b[1] - a[1]) * t), label, kind];
}

function shift(node: RegionNode, dx: number, dy: number, label: string, kind: 0 | 1 | 2): RegionNode {
  return [round1(node[0] + dx), round1(node[1] + dy), label, kind];
}

/** Mirror across Lumiose's vertical axis, keeping Y. */
function mirrorX(node: RegionNode, label: string, kind: 0 | 1 | 2): RegionNode {
  return [round1(2 * LUMIOSE.x - node[0]), node[1], label, kind];
}

/** Perpendicular offset from origin; positive is left when traveling a→b. */
function perp(a: RegionNode, b: RegionNode, origin: RegionNode, dist: number, label: string, kind: 0 | 1 | 2): RegionNode {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  return [round1(origin[0] + (dy / len) * dist), round1(origin[1] + (-dx / len) * dist), label, kind];
}

const santalune = at(SANTALUNE, CITY_R, "Santalune City", 1);
const camphrier = mirrorX(santalune, "Camphrier Town", 1);
const parfumPalace = shift(camphrier, -LOOP / 2, -LOOP / 2, "Parfum Palace", 2);
const dendemille = at(DENDEMILLE, CITY_R, "Dendemille Town", 1);
const coumarine = mirrorX(dendemille, "Coumarine City", 1);
const seaSpiritsDen = shift(coumarine, -LOOP, -LOOP, "Sea Spirit's Den", 2);
const lumiose: RegionNode = [LUMIOSE.x, LUMIOSE.y, "Lumiose City", 1];
const route13 = at(COUMARINE, ROUTE_R, "Route 13", 0);
const kalosPowerPlant = perp(lumiose, coumarine, route13, SPUR, "Kalos Power Plant", 2);
const laverre = at(LAVERRE, CITY_R, "Laverre City", 1);
const route15 = along(laverre, dendemille, 0.5, "Route 15", 0);
const anistar = shift(dendemille, LOOP, 0, "Anistar City", 1);
const snowbelle: RegionNode = [anistar[0], santalune[1], "Snowbelle City", 1];
const couriway: RegionNode = [
  round1(anistar[0] + LOOP),
  round1((anistar[1] + snowbelle[1]) / 2),
  "Couriway Town",
  1,
];
const route18 = along(anistar, couriway, 0.5, "Route 18", 0);
const terminusCave = along(route18, couriway, 0.5, "Terminus Cave", 2);
const frostCavern = shift(dendemille, 0, -SPUR, "Frost Cavern", 2);
const shalour = mirrorX(anistar, "Shalour City", 1);
const cyllage = mirrorX(snowbelle, "Cyllage City", 1);
const geosenge = mirrorX(couriway, "Geosenge Town", 1);
const route11 = along(shalour, geosenge, 0.5, "Route 11", 0);
const reflectionCave = along(shalour, route11, 0.5, "Reflection Cave", 2);
const route7 = along(cyllage, camphrier, 0.5, "Route 7", 0);
const connectingCave = along(cyllage, route7, 0.5, "Connecting Cave", 2);
const ambrette = shift(cyllage, LOOP, LOOP, "Ambrette Town", 1);
const glitteringCave = shift(ambrette, LOOP, 0, "Glittering Cave", 2);
const route21 = along(snowbelle, santalune, 0.25, "Route 21", 0);
const victoryRoad = along(snowbelle, santalune, 0.5, "Victory Road", 2);
const route22 = along(snowbelle, santalune, 0.75, "Route 22", 0);
const chamberOfEmptiness = perp(snowbelle, santalune, route22, SPUR, "Chamber of Emptiness", 2);
const pokemonLeague = shift(victoryRoad, 0, -SPUR, "Pokemon League", 1);
const pokemonVillage = shift(snowbelle, 0, SPUR, "Pokemon Village", 2);
const santaluneForest = at(SANTALUNE, 2 * CITY_R - ROUTE_R, "Santalune Forest", 2);
const aquacorde = shift(santaluneForest, 0, LOOP, "Aquacorde Town", 1);
const vaniville = shift(aquacorde, 0, LOOP, "Vaniville Town", 1);
const kiloude = shift(lumiose, 0, CITY_R, "Kiloude City", 1);
const friendSafari = shift(kiloude, 0, SPUR, "Friend Safari", 2);

const NODES: Record<string, RegionNode> = {
  "lumiose-city": lumiose,
  "kalos-route-4": at(SANTALUNE, ROUTE_R, "Route 4", 0),
  "santalune-city": santalune,
  "santalune-forest": santaluneForest,
  "kalos-route-2": along(santaluneForest, aquacorde, 0.5, "Route 2", 0),
  "aquacorde-town": aquacorde,
  "kalos-route-1": along(aquacorde, vaniville, 0.5, "Route 1", 0),
  "vaniville-town": vaniville,
  "kalos-route-5": at(CAMPHRIER, ROUTE_R, "Route 5", 0),
  "camphrier-town": camphrier,
  "kalos-route-6": along(camphrier, parfumPalace, 0.5, "Route 6", 0),
  "parfum-palace": parfumPalace,
  "kalos-route-13": route13,
  "kalos-power-plant": kalosPowerPlant,
  "coumarine-city": coumarine,
  "sea-spirits-den": seaSpiritsDen,
  "kalos-route-12": along(coumarine, shalour, 0.5, "Route 12", 0),
  "shalour-city": shalour,
  "reflection-cave": reflectionCave,
  "kalos-route-11": route11,
  "geosenge-town": geosenge,
  "kalos-route-10": along(geosenge, cyllage, 0.5, "Route 10", 0),
  "cyllage-city": cyllage,
  "connecting-cave": connectingCave,
  "kalos-route-7": route7,
  "kalos-route-8": along(cyllage, ambrette, 0.5, "Route 8", 0),
  "ambrette-town": ambrette,
  "kalos-route-9": along(ambrette, glitteringCave, 0.5, "Route 9", 0),
  "glittering-cave": glitteringCave,
  "kalos-route-14": at(LAVERRE, ROUTE_R, "Route 14", 0),
  "laverre-city": laverre,
  "kalos-route-16": at(DENDEMILLE, ROUTE_R, "Route 16", 0),
  "dendemille-town": dendemille,
  "frost-cavern": frostCavern,
  "kalos-route-15": route15,
  "lost-hotel": perp(laverre, dendemille, route15, -SPUR, "Lost Hotel", 2),
  "poke-ball-factory": [laverre[0], round1(laverre[1] - SPUR), "Poke Ball Factory", 2],
  "kalos-route-17": along(dendemille, anistar, 0.5, "Route 17", 0),
  "anistar-city": anistar,
  "kalos-route-18": route18,
  "terminus-cave": terminusCave,
  "couriway-town": couriway,
  "kalos-route-19": along(couriway, snowbelle, 0.5, "Route 19", 0),
  "snowbelle-city": snowbelle,
  "kalos-route-21": route21,
  "kalos-victory-road": victoryRoad,
  "kalos-route-22": route22,
  "chamber-of-emptiness": chamberOfEmptiness,
  "kalos-pokemon-league": pokemonLeague,
  "pokemon-village": pokemonVillage,
  "kiloude-city": kiloude,
  "friend-safari": friendSafari,
};

const EDGES: RegionEdge[] = [
  ["lumiose-city", "kalos-route-4", "straight"],
  ["kalos-route-4", "santalune-city", "straight"],
  ["santalune-city", "santalune-forest", "straight"],
  ["santalune-forest", "kalos-route-2", "straight"],
  ["kalos-route-2", "aquacorde-town", "straight"],
  ["aquacorde-town", "kalos-route-1", "straight"],
  ["kalos-route-1", "vaniville-town", "straight"],
  ["lumiose-city", "kalos-route-5", "straight"],
  ["kalos-route-5", "camphrier-town", "straight"],
  ["camphrier-town", "kalos-route-6", "straight"],
  ["kalos-route-6", "parfum-palace", "straight"],
  ["lumiose-city", "kalos-route-13", "straight"],
  ["kalos-route-13", "coumarine-city", "straight"],
  ["kalos-route-13", "kalos-power-plant", "straight"],
  ["coumarine-city", "sea-spirits-den", "straight"],
  ["lumiose-city", "kalos-route-14", "straight"],
  ["kalos-route-14", "laverre-city", "straight"],
  ["lumiose-city", "kalos-route-16", "straight"],
  ["kalos-route-16", "dendemille-town", "straight"],
  ["dendemille-town", "frost-cavern", "straight"],
  ["laverre-city", "kalos-route-15", "straight"],
  ["kalos-route-15", "dendemille-town", "straight"],
  ["kalos-route-15", "lost-hotel", "straight"],
  ["laverre-city", "poke-ball-factory", "straight"],
  ["dendemille-town", "kalos-route-17", "straight"],
  ["kalos-route-17", "anistar-city", "straight"],
  ["anistar-city", "kalos-route-18", "straight"],
  ["kalos-route-18", "terminus-cave", "straight"],
  ["terminus-cave", "couriway-town", "straight"],
  ["couriway-town", "kalos-route-19", "straight"],
  ["kalos-route-19", "snowbelle-city", "straight"],
  ["snowbelle-city", "kalos-route-21", "straight"],
  ["kalos-route-21", "kalos-victory-road", "straight"],
  ["kalos-victory-road", "kalos-route-22", "straight"],
  ["kalos-route-22", "santalune-city", "straight"],
  ["kalos-route-22", "chamber-of-emptiness", "straight"],
  ["kalos-victory-road", "kalos-pokemon-league", "straight"],
  ["snowbelle-city", "pokemon-village", "straight"],
  ["coumarine-city", "kalos-route-12", "straight"],
  ["kalos-route-12", "shalour-city", "straight"],
  ["shalour-city", "reflection-cave", "straight"],
  ["reflection-cave", "kalos-route-11", "straight"],
  ["kalos-route-11", "geosenge-town", "straight"],
  ["geosenge-town", "kalos-route-10", "straight"],
  ["kalos-route-10", "cyllage-city", "straight"],
  ["cyllage-city", "connecting-cave", "straight"],
  ["connecting-cave", "kalos-route-7", "straight"],
  ["kalos-route-7", "camphrier-town", "straight"],
  ["cyllage-city", "kalos-route-8", "straight"],
  ["kalos-route-8", "ambrette-town", "straight"],
  ["ambrette-town", "kalos-route-9", "straight"],
  ["kalos-route-9", "glittering-cave", "straight"],
  ["lumiose-city", "kiloude-city", "straight"],
  ["kiloude-city", "friend-safari", "straight"],
];

const ALIASES: Record<string, string> = {
  "pokeball-factory": "poke-ball-factory",
  "victory-road": "kalos-victory-road",
  "pokemon-league": "kalos-pokemon-league",
  "power-plant": "kalos-power-plant",
};

function canvasOf(nodes: Record<string, RegionNode>) {
  const pts = Object.values(nodes);
  const xs = pts.map((node) => node[0]);
  const ys = pts.map((node) => node[1]);
  const originX = round1(Math.min(...xs) - MAP_PAD);
  const originY = round1(Math.min(...ys) - MAP_PAD);
  const width = round1(Math.max(...xs) + MAP_PAD - originX);
  const height = round1(Math.max(...ys) + MAP_PAD - originY);
  return {
    viewBox: `${originX} ${originY} ${width} ${height}`,
    width,
    height,
    originX,
    originY,
  };
}

export const KALOS_MAP: RegionMapDef = {
  id: "kalos",
  title: "Kalos",
  ...canvasOf(NODES),
  nodes: NODES,
  edges: EDGES,
  aliases: ALIASES,
};
