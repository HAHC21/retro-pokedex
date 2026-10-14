/** Moves a species can learn in one game. */

export type LearnsetMove = {
  id: number;
  name: string;
  level: number;
  type: string | null;
  damage_class: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  priority: number;
};

export type LearnsetGroup = {
  method: string;
  label: string;
  moves: LearnsetMove[];
};

export type LearnsetResponse = {
  game: string;
  groups: LearnsetGroup[];
  catalog_count: number;
};
