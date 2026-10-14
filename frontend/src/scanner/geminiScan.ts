import { apiUrl } from "../apiBase";
import type { BoxScanResponse, BoxSlot, ScanQuotaResponse } from "../schemas/scanner";
import type { BoxSourceId, BoxTile, SlotScanDraft } from "./types";

export type GeminiSlot = BoxSlot;
export type ScanQuota = ScanQuotaResponse;

const FORM_LABEL: Record<string, string> = {
  alola: "Alola",
  galar: "Galar",
  hisui: "Hisui",
  paldea: "Paldea",
};

export async function fetchScanQuota(): Promise<ScanQuota | null> {
  const response = await fetch(apiUrl("/api/scanner/quota"), { credentials: "include" });
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error("quota");
  }
  return (await response.json()) as ScanQuotaResponse;
}

export async function analyzeBoxScreenshot(file: File, source: BoxSourceId): Promise<GeminiSlot[]> {
  const body = new FormData();
  body.set("source", source);
  body.set("image", file);
  const response = await fetch(apiUrl("/api/scanner/box"), {
    method: "POST",
    credentials: "include",
    body,
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null;
    const detail = payload?.detail;
    if (detail && typeof detail === "object" && "code" in detail && detail.code === "global_budget") {
      throw new Error("global_budget");
    }
    if (response.status === 429 || (detail && typeof detail === "object" && "code" in detail && detail.code === "scan_limit")) {
      throw new Error("scan_limit");
    }
    throw new Error(typeof detail === "string" ? detail : "");
  }
  const payload = (await response.json()) as BoxScanResponse;
  return Array.isArray(payload.slots) ? payload.slots : [];
}

export function draftsFromGemini(
  slots: GeminiSlot[],
  tiles: BoxTile[],
  names: Record<number, string>,
): SlotScanDraft[] {
  return Array.from({ length: 30 }, (_, slotIndex) => {
    const slot = slots[slotIndex];
    const cropImageDataUrl = tiles[slotIndex]?.dataUrl ?? "";
    if (!slot || slot.empty) {
      return {
        slotIndex,
        cropImageDataUrl,
        isEmpty: true,
        confidenceTier: "HIGH",
        selectedCandidate: null,
        alternateCandidates: [],
      };
    }
    if (!slot.identified || slot.pokemon_id == null) {
      return {
        slotIndex,
        cropImageDataUrl,
        isEmpty: false,
        confidenceTier: "LOW",
        selectedCandidate: null,
        alternateCandidates: [],
      };
    }
    const formName = slot.form;
    const baseName = names[slot.pokemon_id] || `#${slot.pokemon_id}`;
    const formLabel = formName ? FORM_LABEL[formName] : "";
    return {
      slotIndex,
      cropImageDataUrl,
      isEmpty: false,
      confidenceTier: "HIGH",
      selectedCandidate: {
        speciesId: slot.pokemon_id,
        speciesName: formLabel ? `${baseName} (${formLabel})` : baseName,
        formName,
        confidenceScore: 1,
        isShinyCandidate: slot.shiny,
        hammingDistance: 0,
      },
      alternateCandidates: [],
    };
  });
}
