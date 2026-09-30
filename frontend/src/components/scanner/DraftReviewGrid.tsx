import { useMemo, useState } from "react";
import { dexNum } from "../../format";
import type { CandidateMatch, ConfidenceTier, SlotScanDraft } from "../../scanner/types";
import { occupiedCount } from "../../scanner/match";
import type { DexIndex } from "../../types";
import { HomeSprite } from "./HomeSprite";

type DraftReviewModalProps = {
  slots: SlotScanDraft[];
  names: DexIndex["names"];
  copy: {
    reviewBody: string;
    slot: string;
    empty: string;
    markEmpty: string;
    markOccupied: string;
    candidates: string;
    search: string;
    searchPlaceholder: string;
    noCandidates: string;
    unknown: string;
    high: string;
    medium: string;
    low: string;
    crop: string;
    match: string;
    shiny: string;
    confirm: string;
    confirmEmpty: string;
    cancel: string;
    numberFallback: string;
  };
  fill: (template: string, vars: Record<string, string | number>) => string;
  confirmLabel: string;
  onChange: (slots: SlotScanDraft[]) => void;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
};

export function DraftReviewGrid({
  slots,
  names,
  copy,
  fill,
  confirmLabel,
  onChange,
  onConfirm,
  onCancel,
  busy,
}: DraftReviewModalProps) {
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const count = occupiedCount(slots);
  const active = activeSlot == null ? null : slots.find((slot) => slot.slotIndex === activeSlot) ?? null;

  const hits = useMemo(() => searchSpecies(names, query, copy.numberFallback, fill), [copy.numberFallback, fill, names, query]);

  function updateSlot(slotIndex: number, patch: Partial<SlotScanDraft>) {
    onChange(slots.map((slot) => (slot.slotIndex === slotIndex ? { ...slot, ...patch } : slot)));
  }

  function assign(slotIndex: number, candidate: CandidateMatch) {
    updateSlot(slotIndex, {
      isEmpty: false,
      selectedCandidate: candidate,
      confidenceTier: "HIGH",
    });
    setQuery("");
  }

  return (
    <div className="pk-scan-review">
      <p className="pk-scan-lead">{copy.reviewBody}</p>
      <div className="pk-scan-box-wrap">
        <div className="pk-scan-box">
          {slots.map((slot) => (
            <button
              key={slot.slotIndex}
              type="button"
              className={`pk-scan-slot is-${slot.confidenceTier.toLowerCase()}${slot.isEmpty ? " is-empty" : ""}${
                activeSlot === slot.slotIndex ? " is-active" : ""
              }`}
              onClick={() => {
                setActiveSlot(slot.slotIndex);
                setQuery("");
              }}
            >
              <span className="pk-scan-slot-index">{fill(copy.slot, { n: slot.slotIndex + 1 })}</span>
              <span className="pk-scan-slot-pair">
                <img src={slot.cropImageDataUrl} alt={copy.crop} className="pk-scan-crop" />
                <span className="pk-scan-arrow" aria-hidden="true">
                  →
                </span>
                {slot.isEmpty ? (
                  <span className="pk-scan-empty">{copy.empty}</span>
                ) : !slot.selectedCandidate ? (
                  <span className="pk-scan-empty">{copy.unknown}</span>
                ) : (
                  <HomeSprite
                    pokemonId={slot.selectedCandidate.speciesId}
                    formName={slot.selectedCandidate.formName}
                    shiny={slot.selectedCandidate.isShinyCandidate}
                    alt={slot.selectedCandidate.speciesName}
                    className="pk-scan-sprite"
                  />
                )}
              </span>
              <span className="pk-scan-slot-name">
                {slot.isEmpty
                  ? copy.empty
                  : !slot.selectedCandidate
                    ? copy.unknown
                    : slot.selectedCandidate.isShinyCandidate
                      ? `${slot.selectedCandidate.speciesName} · ${copy.shiny}`
                      : slot.selectedCandidate.speciesName}
              </span>
              <span className="pk-scan-slot-tier">{tierLabel(slot.confidenceTier, copy)}</span>
            </button>
          ))}
        </div>
      </div>

      {active ? (
        <div className="pk-scan-drawer">
          <div className="pk-scan-drawer-head">
            <span>{fill(copy.candidates, { n: active.slotIndex + 1 })}</span>
            <div className="pk-scan-drawer-actions">
              <button
                type="button"
                className={`btn btn-ghost pk-nav${active.selectedCandidate?.isShinyCandidate ? " is-on" : ""}`}
                disabled={!active.selectedCandidate}
                onClick={() => {
                  if (!active.selectedCandidate) {
                    return;
                  }
                  updateSlot(active.slotIndex, {
                    isEmpty: false,
                    selectedCandidate: {
                      ...active.selectedCandidate,
                      isShinyCandidate: !active.selectedCandidate.isShinyCandidate,
                    },
                  });
                }}
              >
                {copy.shiny}
              </button>
              <button
                type="button"
                className="btn btn-ghost pk-nav"
                onClick={() =>
                  updateSlot(active.slotIndex, {
                    isEmpty: !active.isEmpty,
                    confidenceTier: active.isEmpty ? "HIGH" : active.confidenceTier,
                  })
                }
              >
                {active.isEmpty ? copy.markOccupied : copy.markEmpty}
              </button>
            </div>
          </div>
          {active.alternateCandidates.length === 0 && !active.selectedCandidate ? (
            <p className="pk-owned-note">{copy.noCandidates}</p>
          ) : (
            <div className="pk-scan-guesses">
              {(active.selectedCandidate ? [active.selectedCandidate, ...active.alternateCandidates] : active.alternateCandidates).map(
                (candidate) => (
                  <button
                    key={`${candidate.speciesId}-${candidate.isShinyCandidate ? "s" : "n"}`}
                    type="button"
                    className="pk-scan-guess"
                    onClick={() => assign(active.slotIndex, candidate)}
                  >
                    <HomeSprite
                      pokemonId={candidate.speciesId}
                      shiny={candidate.isShinyCandidate}
                      alt=""
                      className="pk-scan-sprite"
                    />
                    <span>
                      <strong>{candidate.speciesName}</strong>
                      <span className="pk-scan-guess-meta">
                        {Math.round(candidate.confidenceScore * 100)}%
                        {candidate.isShinyCandidate ? ` · ${copy.shiny}` : ""}
                      </span>
                    </span>
                  </button>
                ),
              )}
            </div>
          )}
          <label className="field pk-field">
            <span>{copy.search}</span>
            <input
              className="input"
              type="search"
              value={query}
              placeholder={copy.searchPlaceholder}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {hits.length > 0 ? (
            <div className="pk-scan-guesses">
              {hits.map((hit) => (
                <button
                  key={hit.id}
                  type="button"
                  className="pk-scan-guess"
                  onClick={() =>
                    assign(active.slotIndex, {
                      speciesId: hit.id,
                      speciesName: hit.name,
                      formName: null,
                      confidenceScore: 1,
                      isShinyCandidate: false,
                      hammingDistance: 0,
                    })
                  }
                >
                  <HomeSprite pokemonId={hit.id} alt="" className="pk-scan-sprite" />
                  <span>
                    <strong>{hit.name}</strong>
                    <span className="pk-scan-guess-meta">{dexNum(hit.id)}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="dialog-actions">
        <button type="button" className="btn pk-nav" disabled={busy} onClick={onCancel}>
          {copy.cancel}
        </button>
        <button type="button" className="btn pk-nav" disabled={busy || count === 0} onClick={onConfirm}>
          {count === 0 ? copy.confirmEmpty : confirmLabel}
        </button>
      </div>
    </div>
  );
}

function tierLabel(tier: ConfidenceTier, copy: DraftReviewModalProps["copy"]): string {
  if (tier === "HIGH") {
    return copy.high;
  }
  if (tier === "MEDIUM") {
    return copy.medium;
  }
  return copy.low;
}

function searchSpecies(
  names: Record<number, string>,
  query: string,
  numberFallback: string,
  fill: (template: string, vars: Record<string, string | number>) => string,
): Array<{ id: number; name: string }> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return [];
  }
  const asNum = Number(trimmed);
  if (Number.isFinite(asNum) && asNum >= 1 && names[Math.floor(asNum)]) {
    const id = Math.floor(asNum);
    return [{ id, name: names[id] || fill(numberFallback, { id }) }];
  }
  if (trimmed.length < 2) {
    return [];
  }
  return Object.entries(names)
    .filter(([, name]) => name.toLowerCase().includes(trimmed))
    .slice(0, 10)
    .map(([id, name]) => ({ id: Number(id), name }));
}
