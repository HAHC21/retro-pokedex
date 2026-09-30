export type { BoxCropRegion, BoxSourceId, CandidateMatch, SlotScanDraft } from "./types";
export { BOX_SOURCE_IDS, regionForSource } from "./presets";
export { homeSpriteUrl } from "./sprites";
export { loadImageFile } from "./loadImage";
export { extractBoxTiles } from "./extractTiles";
export { analyzeBoxScreenshot, draftsFromGemini, fetchScanQuota } from "./geminiScan";
export type { ScanQuota } from "./geminiScan";
export { occupiedCount } from "./match";
export { applyDraftToProgress } from "./commit";
