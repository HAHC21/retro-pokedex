/** Smogon and Gemini movesets. */

export type MovesetCard = {
  name: string;
  role?: string | null;
  moves: string[];
  notes?: string | null;
  format?: string;
  source: string;
};

export type SmogonMovesetsResponse = {
  game: string;
  pokemon_id?: number;
  species?: string;
  sets: MovesetCard[];
  attribution: string;
  attribution_url: string;
  format: string | null;
  formats_tried?: string[];
};

export type AiMovesetsResponse = {
  game: string;
  pokemon_id?: number;
  available: boolean;
  provider: string | null;
  message: string | null;
  sets: MovesetCard[];
  cached?: boolean;
  updated_at?: string | null;
  refresh_failed?: boolean;
};
