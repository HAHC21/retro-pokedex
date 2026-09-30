import type { BoxCropRegion, BoxSourceId } from "./types";

/** Fixed crops for each screenshot source. Ratios are of the full frame. */
const LANDSCAPE: Record<Exclude<BoxSourceId, "home"> | "home-tv", BoxCropRegion> = {
  sv: {
    startXRatio: 0.285,
    startYRatio: 0.182,
    boxWidthRatio: 0.65,
    boxHeightRatio: 0.68,
    forceLandscape: true,
  },
  swsh: {
    startXRatio: 0.3,
    startYRatio: 0.16,
    boxWidthRatio: 0.62,
    boxHeightRatio: 0.72,
    forceLandscape: true,
  },
  switch: {
    startXRatio: 0.3,
    startYRatio: 0.17,
    boxWidthRatio: 0.64,
    boxHeightRatio: 0.7,
    forceLandscape: true,
  },
  switch2: {
    startXRatio: 0.26,
    startYRatio: 0.15,
    boxWidthRatio: 0.68,
    boxHeightRatio: 0.74,
    forceLandscape: true,
  },
  bank: {
    startXRatio: 0.06,
    startYRatio: 0.08,
    boxWidthRatio: 0.88,
    boxHeightRatio: 0.72,
    forceLandscape: false,
  },
  "home-tv": {
    startXRatio: 0.038,
    startYRatio: 0.175,
    boxWidthRatio: 0.434,
    boxHeightRatio: 0.538,
    forceLandscape: true,
  },
};

const HOME_PHONE: BoxCropRegion = {
  startXRatio: 0.08,
  startYRatio: 0.22,
  boxWidthRatio: 0.84,
  boxHeightRatio: 0.58,
  forceLandscape: false,
};

export const BOX_SOURCE_IDS: BoxSourceId[] = ["home", "bank", "sv", "swsh", "switch2", "switch"];

export function regionForSource(source: BoxSourceId, image: HTMLImageElement): BoxCropRegion {
  if (source === "home" && image.naturalHeight > image.naturalWidth) {
    return HOME_PHONE;
  }
  if (source === "home") {
    return LANDSCAPE["home-tv"];
  }
  return LANDSCAPE[source];
}
