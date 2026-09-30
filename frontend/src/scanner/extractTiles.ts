import type { BoxCropRegion, BoxTile } from "./types";

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const COLS = 6;
const ROWS = 5;
const INSET = 0.2;

export function extractBoxTiles(image: HTMLImageElement, preset: BoxCropRegion): BoxTile[] {
  const canvas = document.createElement("canvas");
  if (preset.forceLandscape) {
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
  } else {
    canvas.width = Math.max(1, image.naturalWidth);
    canvas.height = Math.max(1, image.naturalHeight);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return [];
  }
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const gridStartX = canvas.width * preset.startXRatio;
  const gridStartY = canvas.height * preset.startYRatio;
  const gridW = canvas.width * preset.boxWidthRatio;
  const gridH = canvas.height * preset.boxHeightRatio;
  const cellW = gridW / COLS;
  const cellH = gridH / ROWS;
  const tiles: BoxTile[] = [];

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const x = clamp(Math.round(gridStartX + col * cellW + cellW * INSET), 0, canvas.width - 1);
      const y = clamp(Math.round(gridStartY + row * cellH + cellH * INSET), 0, canvas.height - 1);
      const width = Math.max(1, Math.min(Math.round(cellW * (1 - INSET * 2)), canvas.width - x));
      const height = Math.max(1, Math.min(Math.round(cellH * (1 - INSET * 2)), canvas.height - y));
      const imageData = ctx.getImageData(x, y, width, height);
      tiles.push({ imageData, dataUrl: tileDataUrl(imageData) });
    }
  }
  return tiles;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function tileDataUrl(imageData: ImageData): string {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  canvas.getContext("2d")!.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.72);
}
