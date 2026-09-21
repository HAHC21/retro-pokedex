import { Moves, type Move } from "pokemon-resources";

function moveList(): Move[] {
  return Array.isArray(Moves) ? Moves : Object.values(Moves as unknown as Record<string, Move>);
}

export function findMove(id?: number | null, name?: string | null): Move | undefined {
  const catalog = Moves as unknown as Record<string | number, Move>;
  if (id) {
    const keyed = catalog[id] ?? catalog[String(id)];
    if (keyed && keyed.id === id) {
      return keyed;
    }
    const match = moveList().find((entry) => entry?.id === id);
    if (match) {
      return match;
    }
  }
  if (!name) {
    return undefined;
  }
  const needle = name.toLowerCase();
  return moveList().find((entry) => entry?.name?.toLowerCase() === needle);
}
