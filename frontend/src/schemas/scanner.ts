/** Wire types for /api/scanner. */

export type ScanQuotaResponse = {
  allowance: number;
  used: number;
  remaining: number;
  new_account: boolean;
  next_available_at: string | null;
  global_limit_reached: boolean;
  global_resets_at: string;
  exempt: boolean;
};

export type BoxSlot = {
  empty: boolean;
  pokemon_id: number | null;
  form: string | null;
  shiny: boolean;
  identified: boolean;
};

export type BoxScanResponse = {
  slots: BoxSlot[];
};
