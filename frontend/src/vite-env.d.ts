/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google Analytics measurement id. Unset locally so gtag never loads. */
  readonly VITE_GA_MEASUREMENT_ID?: string;
  /** Optional release id. When unset, production builds use the changelog version plus a build id. */
  readonly VITE_APP_VERSION?: string;
}

declare const __APP_VERSION__: string;

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
