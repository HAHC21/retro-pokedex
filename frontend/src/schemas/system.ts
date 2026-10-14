/** Wire types for /api/health and /api/version. */

export type HealthResponse = {
  status: string;
};

export type VersionResponse = {
  version: string;
};
