import { describe, expect, test } from "vitest";

import { buildCollectionEntries, filterCollectionEntries, originRegionSlug } from "../src/collectionList";
import type { OwnedIndexRow } from "../src/collectionApi";
import type { SpeciesForm } from "../src/forms";
import type { CatalogForm } from "../src/pokeapi";
import type { DexIndex, Progress } from "../src/types";

const alola: SpeciesForm = { kind: "regional", name: "alola" };
const blue: SpeciesForm = { kind: "variant", name: "blue" };
const eternal: SpeciesForm = { kind: "variant", name: "eternal" };
const mega: SpeciesForm = { kind: "mega", name: "x" };

const index: DexIndex = {
  names: { 6: "Charizard", 25: "Pikachu", 37: "Vulpix", 670: "Floette" },
  types: {},
  rarity: {},
};

function catalog(id: number, form: SpeciesForm, spriteForm: string | null, resourceId = id): CatalogForm {
  return {
    pokedexId: id,
    form,
    resourceId,
    types: [],
    capture: form.kind !== "mega" && form.kind !== "gmax",
    spriteForm,
  };
}

const forms: CatalogForm[] = [
  catalog(37, alola, null, 10103),
  catalog(670, blue, "blue"),
  catalog(670, eternal, null, 6705),
  catalog(6, mega, null, 10034),
];

describe("My Collection", () => {
  test("UC-COL-02 Alolan Vulpix originates in Alola and a plain Vulpix originates in Kanto", () => {
    expect(originRegionSlug(37, alola)).toBe("alola");
    expect(originRegionSlug(37, null)).toBe("kanto");
  });

  test("UC-COL-01 marks from every save are listed, an uploaded specimen is listed with its ball while unmarked, and a Mega is left off", () => {
    const prog: Progress = {
      sv: { "6": { caught: true } },
      swsh: { "670:variant-blue": { shiny: true } },
      home: { "6:mega-x": { caught: true } },
    };
    const owned: OwnedIndexRow[] = [{ pokemon_id: 25, source_type: "pk", species_slug: "pikachu" }];
    const entries = buildCollectionEntries(prog, index, forms, owned);
    const keys = entries.map((entry) => entry.key);
    expect(keys).toContain("6");
    expect(keys).toContain("670:variant-blue");
    expect(keys).toContain("25");
    expect(keys).not.toContain("6:mega-x");

    const pikachu = entries.find((entry) => entry.id === 25);
    expect(pikachu?.hasSpecimen).toBe(true);
    expect(pikachu?.caught).toBe(false);
    expect(pikachu?.shiny).toBe(false);
    const charizard = entries.find((entry) => entry.key === "6");
    expect(charizard?.caught).toBe(true);
    expect(charizard?.hasSpecimen).toBe(false);
  });

  test("UC-COL-03 filters keep their own set: Normal, Shiny, Alternate Forms, Variants, origin, and search", () => {
    const prog: Progress = {
      sv: {
        "6": { caught: true },
        "37:regional-alola": { caught: true, shiny: true },
        "670:variant-blue": { shiny: true },
        "670:variant-eternal": { caught: true },
      },
    };
    const entries = buildCollectionEntries(prog, index, forms, []);
    const names = (filter: Parameters<typeof filterCollectionEntries>[1], origin: string | null = null, q = "") =>
      filterCollectionEntries(entries, filter, origin, q).map((entry) => entry.key);

    expect(names("normal")).toEqual(expect.arrayContaining(["6", "37:regional-alola", "670:variant-eternal"]));
    expect(names("normal")).not.toContain("670:variant-blue");
    expect(names("shiny")).toEqual(["37:regional-alola", "670:variant-blue"]);
    expect(names("alternate")).toEqual(expect.arrayContaining(["37:regional-alola", "670:variant-eternal"]));
    expect(names("alternate")).not.toContain("670:variant-blue");
    expect(names("variants")).toEqual(["670:variant-blue"]);
    expect(names("all", "alola")).toEqual(["37:regional-alola"]);
    expect(names("all", null, "vulpix")).toEqual(["37:regional-alola"]);
  });
});
