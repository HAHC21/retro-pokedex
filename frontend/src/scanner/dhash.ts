const HASH_WIDTH = 9;
const HASH_HEIGHT = 8;

export function calculateDHash(imageData: ImageData): string {
  const source = document.createElement("canvas");
  source.width = imageData.width;
  source.height = imageData.height;
  source.getContext("2d")!.putImageData(imageData, 0, 0);
  return hashCanvas(source);
}

export function calculateDHashFromSource(source: CanvasImageSource, width: number, height: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return "0".repeat(16);
  }
  ctx.drawImage(source, 0, 0, width, height);
  return hashCanvas(canvas);
}

export function hammingDistance(hash1: string, hash2: string): number {
  let xor = BigInt(`0x${hash1}`) ^ BigInt(`0x${hash2}`);
  let distance = 0;
  while (xor > 0n) {
    distance += Number(xor & 1n);
    xor >>= 1n;
  }
  return distance;
}

function hashCanvas(source: HTMLCanvasElement): string {
  const canvas = document.createElement("canvas");
  canvas.width = HASH_WIDTH;
  canvas.height = HASH_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return "0".repeat(16);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(source, 0, 0, HASH_WIDTH, HASH_HEIGHT);
  const pixels = ctx.getImageData(0, 0, HASH_WIDTH, HASH_HEIGHT).data;
  let bits = "";
  for (let row = 0; row < HASH_HEIGHT; row += 1) {
    for (let col = 0; col < HASH_HEIGHT; col += 1) {
      const left = grey(pixels, row * HASH_WIDTH + col);
      const right = grey(pixels, row * HASH_WIDTH + col + 1);
      bits += left > right ? "1" : "0";
    }
  }
  return BigInt(`0b${bits}`).toString(16).padStart(16, "0");
}

function grey(pixels: Uint8ClampedArray, index: number): number {
  const offset = index * 4;
  return (pixels[offset] + pixels[offset + 1] + pixels[offset + 2]) / 3;
}
