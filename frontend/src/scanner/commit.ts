import type { SpeciesForm } from "../forms";
import { entryFor, patchMark } from "../progress";
import type { Progress } from "../types";
import type { SlotScanDraft } from "./types";

/** Merge occupied draft slots into caught (and shiny) marks for one game. */
export function applyDraftToProgress(prog: Progress, game: string, slots: SlotScanDraft[]): Progress {
  const now = Date.now();
  let next = prog;
  slots.forEach((slot) => {
    const candidate = slot.selectedCandidate;
    if (slot.isEmpty || !candidate) {
      return;
    }
    const form = regionalForm(candidate.formName);
    const existing = entryFor(next, game, candidate.speciesId, form);
    next = patchMark(
      next,
      game,
      candidate.speciesId,
      {
        caught: true,
        caughtAt: existing.caughtAt ?? now,
        ...(candidate.isShinyCandidate || existing.shiny
          ? { shiny: true, shinyAt: existing.shinyAt ?? now }
          : {}),
      },
      form,
    );
  });
  return next;
}

function regionalForm(name: string | null): SpeciesForm | null {
  if (name !== "alola" && name !== "galar" && name !== "hisui" && name !== "paldea") {
    return null;
  }
  return { kind: "regional", name };
}
