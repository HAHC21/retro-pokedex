/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google Analytics measurement id. Unset locally so gtag never loads. */
  readonly VITE_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
