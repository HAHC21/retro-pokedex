import { describe, expect, test } from "vitest";

import { buildAppPath, parseAppPath } from "../src/paths";

describe("the address is the page", () => {
  test("UC-X-18 refresh restores the page and does not carry search or status filters", () => {
    const pages = [
      "/sv",
      "/sv/dex/gen/9",
      "/sv/dex/region/kanto",
      "/sv/dex/forms/mega",
      "/sv/checklist/gen/1",
      "/sv/collection",
      "/sv/scan",
      "/sv/pokemon/6",
      "/sv/pokemon/6/moves",
      "/sv/pokemon/6/regional/alola",
      "/signin",
      "/changelog",
    ];
    for (const page of pages) {
      const parsed = parseAppPath(page, "?q=charizard&status=shiny&scope=regional");
      expect(parsed.q).toBe("");
      expect(parsed.status).toBe("all");
      const again = parseAppPath(buildAppPath(parsed));
      expect(again.view).toBe(parsed.view);
      expect(again.game).toBe(parsed.game);
      expect(again.id).toBe(parsed.id);
      expect(again.form).toEqual(parsed.form);
      expect(again.section).toBe(parsed.section);
      expect(again.region).toBe(parsed.region);
      expect(again.formList).toBe(parsed.formList);
      expect(again.gen).toBe(parsed.gen);
    }

    const filtered = parseAppPath("/sv/dex/gen/9", "?q=charizard&status=missing&scope=regional");
    expect(filtered.q).toBe("");
    expect(filtered.status).toBe("all");
    expect(filtered.scope).toBe("national");

    const shared = buildAppPath({
      view: "dex",
      game: "sv",
      gen: 9,
      q: "charizard",
      status: "shiny",
      scope: "national",
    });
    expect(shared).toBe("/sv/dex/gen/9");
    expect(shared).not.toContain("charizard");
    expect(shared).not.toContain("shiny");
  });

  test("UC-X-19 an unknown path opens the dashboard, a bad number opens the Pokédex, and a missing form opens the base species", () => {
    expect(parseAppPath("/sv/not-a-page").view).toBe("dash");
    expect(parseAppPath("/sv/not-a-page").game).toBe("sv");
    expect(parseAppPath("/not-a-page").view).toBe("dash");

    for (const id of ["0", "1026", "9999", "nope"]) {
      const parsed = parseAppPath(`/sv/pokemon/${id}`);
      expect(parsed.view).toBe("dex");
      expect(parsed.game).toBe("sv");
      expect(parsed.id).toBeNull();
    }

    const realMega = parseAppPath("/sv/pokemon/6/mega/x");
    expect(realMega.view).toBe("mon");
    expect(realMega.id).toBe(6);
    expect(realMega.form).toEqual({ kind: "mega", name: "x" });

    const missingForm = parseAppPath("/sv/pokemon/6/mega/not-a-real-mega");
    expect(missingForm.view).toBe("mon");
    expect(missingForm.id).toBe(6);
    expect(missingForm.form).toBeNull();
  });
});
