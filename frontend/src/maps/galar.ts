import type { RegionEdge, RegionMapDef, RegionNode } from "../routeGraph";

/**
 * Galar numbered routes and cities. Wild Area (center gap) and DLC are later.
 *
 *              Wyndon
 *                10
 *  Ballonlea          Circhester
 *     |                8   9
 *  Glimwood               Mine 2
 *     |                    |
 *  Stow-on-Side—6—Hammerlocke—7     Spikemuth
 *
 *            [ Wild Area ]
 *
 *  Turffield—4—Mine—3—Motostoke
 *      5
 *                   Hulbury
 *
 *                    2
 *               Wedgehurst
 *           Weald—1
 *               Postwick
 */
const NODES: Record<string, RegionNode> = {
  // ——— North: Wyndon ———
  "wyndon": [140, 12, "Wyndon", 1],
  "galar-route-10": [140, 36, "Route 10", 0],

  // ——— Northwest: Ballonlea / Stow-on-Side ———
  "ballonlea": [32, 56, "Ballonlea", 1],
  "glimwood-tangle": [32, 76, "Glimwood Tangle", 2],
  "stow-on-side": [32, 96, "Stow-on-Side", 1],
  "galar-route-6": [80, 116, "Route 6", 0],

  // ——— Northeast: Circhester / Spikemuth ———
  "circhester": [228, 56, "Circhester", 1],
  "galar-route-8": [204, 76, "Route 8", 0],
  "galar-route-9": [252, 76, "Route 9", 0],
  "galar-mine-2": [252, 96, "Galar Mine No. 2", 2],
  "galar-route-7": [184, 100, "Route 7", 0],
  "spikemuth": [252, 116, "Spikemuth", 1],

  // ——— Hammerlocke hub ———
  "hammerlocke": [140, 116, "Hammerlocke", 1],

  // ——— Mid: Turffield / Motostoke / Hulbury (Wild Area sits above) ———
  "hulbury": [240, 168, "Hulbury", 1],
  "galar-route-5": [140, 168, "Route 5", 0],
  "turffield": [32, 184, "Turffield", 1],
  "galar-route-4": [64, 200, "Route 4", 0],
  "galar-mine": [96, 200, "Galar Mine", 2],
  "galar-route-3": [128, 200, "Route 3", 0],
  "motostoke": [168, 200, "Motostoke", 1],

  // ——— South: Postwick / Wedgehurst ———
  "galar-route-2": [168, 248, "Route 2", 0],
  "wedgehurst": [140, 268, "Wedgehurst", 1],
  "slumbering-weald": [72, 292, "Slumbering Weald", 2],
  "galar-route-1": [140, 292, "Route 1", 0],
  "postwick": [140, 316, "Postwick", 1],
};

const EDGES: RegionEdge[] = [
  // North spine
  ["wyndon", "galar-route-10"],
  ["galar-route-10", "hammerlocke"],

  // Hammerlocke west
  ["hammerlocke", "galar-route-6"],
  ["galar-route-6", "stow-on-side"],
  ["stow-on-side", "glimwood-tangle"],
  ["glimwood-tangle", "ballonlea"],

  // Hammerlocke east
  ["hammerlocke", "galar-route-7"],
  ["galar-route-7", "galar-route-8"],
  ["galar-route-8", "circhester"],
  ["circhester", "galar-route-9"],
  ["galar-route-9", "galar-mine-2"],
  ["galar-mine-2", "spikemuth"],

  // Motostoke west to Turffield, then Route 5 to Hulbury
  ["motostoke", "galar-route-3"],
  ["galar-route-3", "galar-mine"],
  ["galar-mine", "galar-route-4"],
  ["galar-route-4", "turffield"],
  ["turffield", "galar-route-5"],
  ["galar-route-5", "hulbury"],

  // South
  ["postwick", "galar-route-1"],
  ["galar-route-1", "wedgehurst"],
  ["galar-route-1", "slumbering-weald"],
  ["wedgehurst", "galar-route-2"],
];

const ALIASES: Record<string, string> = {
  "galar-mine-no-2": "galar-mine-2",
  "route-9-tunnel": "galar-route-9",
  "wedgehurst-station": "wedgehurst",
  "motostoke-outskirts": "motostoke",
  "motostoke-stadium": "motostoke",
  "turf-stadium": "turffield",
  "hulbury-stadium": "hulbury",
  "hammerlocke-stadium": "hammerlocke",
  "energy-plant": "hammerlocke",
  "ballonlea-stadium": "ballonlea",
  "circhester-stadium": "circhester",
  "wyndon-stadium": "wyndon",
  "rose-tower": "wyndon",
  "battle-tower": "wyndon",
};

export const GALAR_MAP: RegionMapDef = {
  id: "galar",
  title: "Galar",
  viewBox: "-20 -12 300 348",
  width: 300,
  height: 348,
  originX: -20,
  originY: -12,
  nodes: NODES,
  edges: EDGES,
  aliases: ALIASES,
};
