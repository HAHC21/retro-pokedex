/** Low-detail tiles (empty PC slots) fall below this luminance variance. */
export const EMPTY_VARIANCE_MAX = 90;

export function luminanceVariance(imageData: ImageData): number {
  const pixels = imageData.data;
  const count = pixels.length / 4;
  if (count === 0) {
    return 0;
  }
  let sum = 0;
  const values = new Float64Array(count);
  for (let i = 0; i < count; i += 1) {
    const offset = i * 4;
    const value = (pixels[offset] + pixels[offset + 1] + pixels[offset + 2]) / 3;
    values[i] = value;
    sum += value;
  }
  const mean = sum / count;
  let variance = 0;
  for (let i = 0; i < count; i += 1) {
    const delta = values[i] - mean;
    variance += delta * delta;
  }
  return variance / count;
}

export function isEmptyTile(imageData: ImageData): boolean {
  return luminanceVariance(imageData) < EMPTY_VARIANCE_MAX;
}
