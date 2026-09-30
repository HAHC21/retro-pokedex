export type Point2D = {
  x: number;
  y: number;
};

export type BoxCropRegion = {
  startXRatio: number;
  startYRatio: number;
  boxWidthRatio: number;
  boxHeightRatio: number;
  /** Stretch to 1920×1080. Switch shots are 16:9; phone HOME shots are not. */
  forceLandscape: boolean;
};

export type BoxSourceId = "home" | "bank" | "sv" | "swsh" | "switch2" | "switch";

export type ConfidenceTier = "HIGH" | "MEDIUM" | "LOW";

export type CandidateMatch = {
  speciesId: number;
  speciesName: string;
  formName: string | null;
  confidenceScore: number;
  isShinyCandidate: boolean;
  hammingDistance: number;
};

export type SlotScanDraft = {
  slotIndex: number;
  cropImageDataUrl: string;
  isEmpty: boolean;
  confidenceTier: ConfidenceTier;
  selectedCandidate: CandidateMatch | null;
  alternateCandidates: CandidateMatch[];
};

export type SpriteHashIndex = Record<string, string>;

export type BoxTile = {
  imageData: ImageData;
  dataUrl: string;
};
