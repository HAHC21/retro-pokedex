import { describe, expect, test } from "vitest";

import { filterDexIds } from "../src/dexList";
import type { DexIndex, Progress } from "../src/types";

const index: DexIndex = {
  names: { 6: "Charizard", 25: "Pikachu", 129: "Magikarp" },
  types: { 6: ["fire", "flying"], 25: ["electric"], 129: ["water"] },
  rarity: {},
};

const prog: Progress = {
  swsh: { "6": { caught: true } },
  sv: { "25": { shiny: true } },
};

describe("Pokédex filters count a species when any save has the mark", () => {
  test("UC-DEX-04 owned, missing, and search follow the union of every save", () => {
    const ids = [6, 25, 129];
    expect(filterDexIds(ids, index, prog, "normal", "")).toEqual([6]);
    expect(filterDexIds(ids, index, prog, "shiny", "")).toEqual([25]);
    expect(filterDexIds(ids, index, prog, "missing", "")).toEqual([129]);
    expect(filterDexIds(ids, index, prog, "missing-normal", "")).toEqual([25, 129]);
    expect(filterDexIds(ids, index, prog, "missing-shiny", "")).toEqual([6, 129]);
    expect(filterDexIds(ids, index, prog, "all", "char")).toEqual([6]);
    expect(filterDexIds(ids, index, prog, "all", "25")).toEqual([25]);
    expect(filterDexIds(ids, index, prog, "all", "zzz")).toEqual([]);
  });
});
