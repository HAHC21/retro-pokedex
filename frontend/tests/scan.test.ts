import { describe, expect, test } from "vitest";

import { en } from "../src/i18n/en";
import { applyDraftToProgress } from "../src/scanner/commit";
import { occupiedCount } from "../src/scanner/match";
import { regionForSource } from "../src/scanner/presets";
import type { SlotScanDraft } from "../src/scanner/types";
import { entryFor } from "../src/progress";
import type { Progress } from "../src/types";

function slot(partial: Partial<SlotScanDraft> & Pick<SlotScanDraft, "slotIndex" | "isEmpty">): SlotScanDraft {
  return {
    cropImageDataUrl: "",
    confidenceTier: "HIGH",
    selectedCandidate: null,
    alternateCandidates: [],
    ...partial,
  };
}

const charizard = {
  speciesId: 6,
  speciesName: "Charizard",
  formName: null,
  confidenceScore: 1,
  isShinyCandidate: false,
  hammingDistance: 0,
};

describe("a confirmed box marks only the occupied slots on the header save", () => {
  test("UC-SCN-03 a tall HOME shot uses the phone crop, and Pokémon Bank is marked experimental", () => {
    const phone = regionForSource("home", { naturalWidth: 400, naturalHeight: 800 } as HTMLImageElement);
    const television = regionForSource("home", { naturalWidth: 1920, naturalHeight: 1080 } as HTMLImageElement);
    expect(phone.forceLandscape).toBe(false);
    expect(television.forceLandscape).toBe(true);
    expect(phone.startYRatio).toBeGreaterThan(television.startYRatio);
    expect(en.scanner.disclaimerBank.toLowerCase()).toContain("experimental");
  });

  test("UC-SCN-08 and UC-SCN-09 confirm writes caught and shiny for identified slots and leaves everything else", () => {
    const before: Progress = {
      sv: {
        "6": { caught: true, caughtMale: true },
        "25": { caught: true, caughtFemale: true },
      },
      swsh: { "6": { shiny: true } },
    };
    const slots = [
      slot({
        slotIndex: 0,
        isEmpty: false,
        selectedCandidate: { ...charizard, isShinyCandidate: true },
      }),
      slot({
        slotIndex: 1,
        isEmpty: false,
        selectedCandidate: {
          speciesId: 37,
          speciesName: "Vulpix",
          formName: "alola",
          confidenceScore: 1,
          isShinyCandidate: false,
          hammingDistance: 0,
        },
      }),
      slot({ slotIndex: 2, isEmpty: true }),
      slot({ slotIndex: 3, isEmpty: false, selectedCandidate: null }),
    ];
    expect(occupiedCount(slots)).toBe(2);

    const next = applyDraftToProgress(before, "sv", slots);
    expect(entryFor(next, "sv", 6).caught).toBe(true);
    expect(entryFor(next, "sv", 6).shiny).toBe(true);
    expect(entryFor(next, "sv", 6).caughtMale).toBe(true);
    expect(entryFor(next, "sv", 25).caught).toBe(true);
    expect(entryFor(next, "sv", 25).caughtFemale).toBe(true);
    expect(entryFor(next, "sv", 37, { kind: "regional", name: "alola" }).caught).toBe(true);
    expect(entryFor(next, "sv", 37).caught).toBeFalsy();
    expect(entryFor(next, "swsh", 6)).toEqual(entryFor(before, "swsh", 6));
  });
});
