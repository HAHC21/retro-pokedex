/** Where a species can be obtained. */

export type ObtainMetaResponse = {
  versions: string[];
  evolves_from: number | null;
};

export type ObtainIndexResponse = {
  count: number;
  versions: Record<string, string[]>;
  evolves_from: Record<string, number | null>;
};
