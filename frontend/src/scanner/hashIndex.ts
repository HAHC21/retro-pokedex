import { calculateDHashFromSource } from "./dhash";
import { loadCorsImage } from "./loadImage";
import { homeSpriteUrl, officialArtworkUrl } from "./sprites";
import type { SpriteHashIndex } from "./types";

const CACHE_KEY = "pk-sprite-dhashes-home-v2";
const CONCURRENCY = 16;

type CachePayload = {
  hashes: SpriteHashIndex;
};

let memory: SpriteHashIndex | null = null;
let inflight: Promise<SpriteHashIndex> | null = null;

export async function loadSpriteHashIndex(
  ids: number[],
  onProgress?: (done: number, total: number) => void,
): Promise<SpriteHashIndex> {
  if (memory && hasMost(memory, ids)) {
    onProgress?.(ids.length, ids.length);
    return memory;
  }
  if (inflight) {
    return inflight;
  }
  inflight = buildIndex(ids, onProgress)
    .then((index) => {
      memory = index;
      inflight = null;
      return index;
    })
    .catch((error) => {
      inflight = null;
      throw error;
    });
  return inflight;
}

async function buildIndex(
  ids: number[],
  onProgress?: (done: number, total: number) => void,
): Promise<SpriteHashIndex> {
  const hashes: SpriteHashIndex = { ...readCache() };
  const missing = ids.filter((id) => !hashes[hashKey(id, false)]);
  const total = ids.length;
  let done = total - missing.length;
  onProgress?.(done, total);
  if (missing.length === 0) {
    return hashes;
  }

  for (let i = 0; i < missing.length; i += CONCURRENCY) {
    const batch = missing.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (id) => {
        const normal = await hashSprite(id);
        if (normal) {
          hashes[hashKey(id, false)] = normal;
        }
      }),
    );
    done = Math.min(total, done + batch.length);
    onProgress?.(done, total);
    await yieldUi();
  }
  writeCache(hashes);
  return hashes;
}

function hashPreparedSprite(img: HTMLImageElement): string {
  const width = img.naturalWidth || 128;
  const height = img.naturalHeight || 128;
  const source = document.createElement("canvas");
  source.width = width;
  source.height = height;
  const sourceCtx = source.getContext("2d");
  if (!sourceCtx) {
    return "0".repeat(16);
  }
  sourceCtx.drawImage(img, 0, 0, width, height);
  const pixels = sourceCtx.getImageData(0, 0, width, height).data;
  const bounds = opaqueBounds(pixels, width, height);
  const prepared = document.createElement("canvas");
  prepared.width = 96;
  prepared.height = 96;
  const ctx = prepared.getContext("2d");
  if (!ctx) {
    return "0".repeat(16);
  }
  ctx.fillStyle = "#f9faf2";
  ctx.fillRect(0, 0, 96, 96);
  const pad = 10;
  ctx.drawImage(
    source,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    pad,
    pad,
    96 - pad * 2,
    96 - pad * 2,
  );
  return calculateDHashFromSource(prepared, 96, 96);
}

function opaqueBounds(pixels: Uint8ClampedArray, width: number, height: number) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] <= 24) {
        continue;
      }
      found = true;
      if (x < minX) {
        minX = x;
      }
      if (y < minY) {
        minY = y;
      }
      if (x > maxX) {
        maxX = x;
      }
      if (y > maxY) {
        maxY = y;
      }
    }
  }
  if (!found) {
    return { x: 0, y: 0, width, height };
  }
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}
function hashKey(id: number, shiny: boolean): string {
  return `${id}_${shiny ? "shiny" : "normal"}`;
}

async function hashSprite(id: number): Promise<string | null> {
  const urls = [homeSpriteUrl(id), officialArtworkUrl(id)];
  for (const url of urls) {
    try {
      const img = await loadCorsImage(url);
      return hashPreparedSprite(img);
    } catch {
      /* try the next render */
    }
  }
  return null;
}

function hasMost(index: SpriteHashIndex, ids: number[]): boolean {
  if (ids.length === 0) {
    return false;
  }
  let found = 0;
  ids.forEach((id) => {
    if (index[hashKey(id, false)]) {
      found += 1;
    }
  });
  return found / ids.length >= 0.9;
}

function readCache(): SpriteHashIndex {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return {};
    }
    const payload = JSON.parse(raw) as CachePayload;
    return payload.hashes && typeof payload.hashes === "object" ? payload.hashes : {};
  } catch {
    return {};
  }
}

function writeCache(hashes: SpriteHashIndex) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ hashes }));
  } catch {
    /* quota */
  }
}

function yieldUi(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

export { hashKey };
