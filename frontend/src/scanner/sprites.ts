import { SPRITE_BASE } from "../catalog";

/** Official 3D HOME renders. Switch box icons are these models, not the pixel sprites. */
export function homeSpriteUrl(id: number, shiny = false): string {
  return shiny ? `${SPRITE_BASE}/other/home/shiny/${id}.png` : `${SPRITE_BASE}/other/home/${id}.png`;
}

export function officialArtworkUrl(id: number): string {
  return `${SPRITE_BASE}/other/official-artwork/${id}.png`;
}
