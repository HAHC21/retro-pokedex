import { describe, expect, test } from "vitest";

import { catchableGameKeys } from "../src/catalog";
import {
  clearProgress,
  entryFor,
  loadProgress,
  mergeProgress,
  moveMark,
  saveProgress,
  toggleGenderMark,
  toggleMark,
} from "../src/progress";
import type { MarkKey, Progress } from "../src/types";
import type { SpeciesForm } from "../src/forms";

const alola: SpeciesForm = { kind: "regional", name: "alola" };

type SetCollectionMark = (
  prog: Progress,
  obtainableGames: string[],
  priorGame: string,
  id: number,
  key: MarkKey,
  on: boolean,
  form?: SpeciesForm | null,
) => Progress;

describe("marks follow the save in the header", () => {
  test("UC-X-06 and UC-MRK-01 shiny does not mark caught, and each save is separate", () => {
    let prog = toggleMark({}, "sv", 6, "shiny");
    expect(entryFor(prog, "sv", 6).shiny).toBe(true);
    expect(entryFor(prog, "sv", 6).caught).toBeFalsy();
    expect(entryFor(prog, "swsh", 6).shiny).toBeFalsy();

    prog = toggleMark(prog, "swsh", 6, "caught");
    expect(entryFor(prog, "swsh", 6).caught).toBe(true);
    expect(entryFor(prog, "sv", 6).caught).toBeFalsy();
    expect(entryFor(prog, "sv", 6).shiny).toBe(true);
  });

  test("UC-MRK-02 a form is a separate mark from the base species", () => {
    const prog = toggleMark({}, "sv", 37, "caught", alola);
    expect(entryFor(prog, "sv", 37, alola).caught).toBe(true);
    expect(entryFor(prog, "sv", 37).caught).toBeFalsy();
  });

  test("UC-MRK-03 and UC-MRK-04 gender belongs to the header save and turning the mark off clears only that gender", () => {
    let prog = toggleGenderMark({}, "sv", 6, "caught", "male");
    expect(entryFor(prog, "sv", 6).caught).toBe(true);
    expect(entryFor(prog, "sv", 6).caughtMale).toBe(true);
    expect(entryFor(prog, "swsh", 6).caught).toBeFalsy();

    prog = toggleGenderMark(prog, "swsh", 6, "shiny", "female");
    expect(entryFor(prog, "swsh", 6).shiny).toBe(true);
    expect(entryFor(prog, "swsh", 6).shinyFemale).toBe(true);
    expect(entryFor(prog, "swsh", 6).caught).toBeFalsy();
    expect(entryFor(prog, "sv", 6).caughtMale).toBe(true);

    prog = toggleMark(prog, "sv", 6, "caught");
    expect(entryFor(prog, "sv", 6).caught).toBe(false);
    expect(entryFor(prog, "sv", 6).caughtMale).toBe(false);
    expect(entryFor(prog, "swsh", 6).shinyFemale).toBe(true);
  });

  test("UC-X-09 and UC-X-10 merge keeps a true mark and a gender from either side, then the guest copy is cleared", () => {
    const account: Progress = { sv: { "6": { caught: true, caughtMale: true } } };
    const guest: Progress = {
      sv: { "6": { shiny: true, shinyFemale: true, caughtFemale: true } },
      swsh: { "25": { caught: true } },
    };
    const merged = mergeProgress(account, guest);
    expect(entryFor(merged, "sv", 6).caught).toBe(true);
    expect(entryFor(merged, "sv", 6).caughtMale).toBe(true);
    expect(entryFor(merged, "sv", 6).caughtFemale).toBe(true);
    expect(entryFor(merged, "sv", 6).shiny).toBe(true);
    expect(entryFor(merged, "sv", 6).shinyFemale).toBe(true);
    expect(entryFor(merged, "swsh", 25).caught).toBe(true);

    saveProgress(guest);
    expect(loadProgress()).toEqual(guest);
    clearProgress();
    expect(loadProgress()).toEqual({});
  });

  test("UC-MOV-02 moving a mark merges the destination and leaves the source", () => {
    const prog: Progress = {
      sv: { "6": { caught: true, caughtMale: true } },
      swsh: { "6": { shiny: true, shinyFemale: true }, "25": { caught: true } },
    };
    const moved = moveMark(prog, "sv", "swsh", 6);
    expect(entryFor(moved, "sv", 6).caught).toBeFalsy();
    expect(entryFor(moved, "swsh", 6).caught).toBe(true);
    expect(entryFor(moved, "swsh", 6).caughtMale).toBe(true);
    expect(entryFor(moved, "swsh", 6).shiny).toBe(true);
    expect(entryFor(moved, "swsh", 6).shinyFemale).toBe(true);
    expect(entryFor(moved, "swsh", 25).caught).toBe(true);
    expect(moveMark(prog, "sv", "sv", 6)).toEqual(prog);
  });

  test("UC-X-04 and UC-MOV-03 a trade evolution is markable only where it can be obtained without a trade", () => {
    const alakazam = catchableGameKeys(
      [
        { version: "red", ways: ["trade"] },
        { version: "scarlet", ways: ["wild"] },
        { version: "sword", ways: ["pokedex"] },
      ],
      { tradeEvolution: true },
    );
    expect(alakazam.has("home")).toBe(true);
    expect(alakazam.has("sv")).toBe(true);
    expect(alakazam.has("rb")).toBe(false);
    expect(alakazam.has("swsh")).toBe(false);

    const inTheDex = catchableGameKeys([{ version: "sword", ways: ["pokedex"] }], { tradeEvolution: false });
    expect(inTheDex.has("swsh")).toBe(true);
  });
});

describe("My Collection writes one mark across saves", () => {
  test("UC-COL-05 turning Normal off clears every save and only that mark's genders", async () => {
    const progress = await import("../src/progress");
    const setCollectionMark = (progress as { setCollectionMark?: SetCollectionMark }).setCollectionMark;
    expect(setCollectionMark, "My Collection must clear a mark on every save, not only the header save").toEqual(
      expect.any(Function),
    );
    if (!setCollectionMark) {
      return;
    }
    const prog: Progress = {
      sv: { "6": { caught: true, caughtMale: true, shiny: true, shinyMale: true } },
      swsh: { "6": { caught: true, caughtFemale: true } },
    };
    const cleared = setCollectionMark(prog, ["sv", "swsh"], "sv", 6, "caught", false, null);
    expect(entryFor(cleared, "sv", 6).caught).toBe(false);
    expect(entryFor(cleared, "sv", 6).caughtMale).toBeFalsy();
    expect(entryFor(cleared, "swsh", 6).caught).toBe(false);
    expect(entryFor(cleared, "swsh", 6).caughtFemale).toBeFalsy();
    expect(entryFor(cleared, "sv", 6).shiny).toBe(true);
    expect(entryFor(cleared, "sv", 6).shinyMale).toBe(true);
  });

  test("UC-COL-06 turning a mark on writes only the save selected before My Collection, when it can be obtained there", async () => {
    const progress = await import("../src/progress");
    const setCollectionMark = (progress as { setCollectionMark?: SetCollectionMark }).setCollectionMark;
    expect(setCollectionMark).toEqual(expect.any(Function));
    if (!setCollectionMark) {
      return;
    }
    const recorded = setCollectionMark({}, ["swsh"], "swsh", 6, "shiny", true, null);
    expect(entryFor(recorded, "swsh", 6).shiny).toBe(true);
    expect(entryFor(recorded, "swsh", 6).caught).toBeFalsy();
    expect(entryFor(recorded, "sv", 6).shiny).toBeFalsy();

    const refused = setCollectionMark({}, ["swsh"], "rb", 6, "caught", true, null);
    expect(entryFor(refused, "rb", 6).caught).toBeFalsy();
    expect(entryFor(refused, "swsh", 6).caught).toBeFalsy();
  });
});
