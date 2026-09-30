import { calculateDHash, hammingDistance } from "./dhash";
import { isEmptyTile } from "./entropy";
import type { CandidateMatch, ConfidenceTier, SlotScanDraft, SpriteHashIndex } from "./types";

const HIGH_MAX = 4;
const MEDIUM_MAX = 8;
const NO_MATCH_MIN = 20;
const TOP_K = 3;

export function matchTiles(
  tiles: Array<{ imageData: ImageData; dataUrl: string }>,
  hashes: SpriteHashIndex,
  names: Record<number, string>,
): SlotScanDraft[] {
  const entries = Object.entries(hashes);
  return tiles.map((tile, slotIndex) => {
    if (isEmptyTile(tile.imageData) || entries.length === 0) {
      return emptyDraft(slotIndex, tile.dataUrl, entries.length === 0 ? "LOW" : "HIGH");
    }
    const hash = calculateDHash(tile.imageData);
    const ranked = rankCandidates(hash, entries, names);
    const best = ranked[0];
    if (!best || best.hammingDistance >= NO_MATCH_MIN) {
      return {
        ...emptyDraft(slotIndex, tile.dataUrl, "LOW"),
        alternateCandidates: ranked,
      };
    }
    const tier = confidenceTier(best.hammingDistance);
    return {
      slotIndex,
      cropImageDataUrl: tile.dataUrl,
      isEmpty: false,
      confidenceTier: tier,
      selectedCandidate: best,
      alternateCandidates: ranked.slice(1),
    };
  });
}

function rankCandidates(
  hash: string,
  entries: Array<[string, string]>,
  names: Record<number, string>,
): CandidateMatch[] {
  const scored: CandidateMatch[] = [];
  entries.forEach(([key, refHash]) => {
    const parsed = parseHashKey(key);
    if (!parsed) {
      return;
    }
    const speciesName = names[parsed.speciesId];
    if (!speciesName) {
      return;
    }
    const distance = hammingDistance(hash, refHash);
    scored.push({
      speciesId: parsed.speciesId,
      speciesName,
      formName: null,
      isShinyCandidate: parsed.shiny,
      hammingDistance: distance,
      confidenceScore: confidenceFromDistance(distance),
    });
  });
  scored.sort((left, right) => left.hammingDistance - right.hammingDistance || left.speciesId - right.speciesId);
  return uniqueSpecies(scored).slice(0, TOP_K);
}

function uniqueSpecies(candidates: CandidateMatch[]): CandidateMatch[] {
  const seen = new Set<number>();
  const next: CandidateMatch[] = [];
  candidates.forEach((candidate) => {
    if (seen.has(candidate.speciesId)) {
      return;
    }
    seen.add(candidate.speciesId);
    next.push(candidate);
  });
  return next;
}

function parseHashKey(key: string): { speciesId: number; shiny: boolean } | null {
  const match = /^(\d+)_(normal|shiny)$/.exec(key);
  if (!match) {
    return null;
  }
  return { speciesId: Number(match[1]), shiny: match[2] === "shiny" };
}

function confidenceFromDistance(distance: number): number {
  return Math.max(0, Math.min(1, 1 - distance / 16));
}

function confidenceTier(distance: number): ConfidenceTier {
  if (distance <= HIGH_MAX) {
    return "HIGH";
  }
  if (distance <= MEDIUM_MAX) {
    return "MEDIUM";
  }
  return "LOW";
}

function emptyDraft(slotIndex: number, cropImageDataUrl: string, confidenceTier: ConfidenceTier): SlotScanDraft {
  return {
    slotIndex,
    cropImageDataUrl,
    isEmpty: true,
    confidenceTier,
    selectedCandidate: null,
    alternateCandidates: [],
  };
}

export function occupiedCount(slots: SlotScanDraft[]): number {
  return slots.filter((slot) => !slot.isEmpty && slot.selectedCandidate).length;
}
