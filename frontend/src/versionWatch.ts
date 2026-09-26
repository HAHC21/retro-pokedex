import { apiUrl } from "./apiBase";
import { FRONTEND_VERSION } from "./version";

const POLL_MS = 60_000;
const RELOAD_GUARD = "pk-version-reload";
const BACKEND_SEEN = "pk-backend-version";

/** Captured before the router strips `_v`, so a stale document cannot reload forever. */
const landedOnReload = new URL(window.location.href).searchParams.get("_v");

export type VersionSnapshot = {
  runningFrontend: string;
  remoteFrontend: string | null;
  seenBackend: string | null;
  remoteBackend: string | null;
};

export type VersionPlan = {
  reloadToken: string | null;
  rememberBackend: string | null;
  clearReloadGuard: boolean;
};

/** Decide whether the running tab should load the latest frontend and API. */
export function planVersionCheck(snapshot: VersionSnapshot): VersionPlan {
  const frontendStale =
    snapshot.remoteFrontend !== null && snapshot.remoteFrontend !== snapshot.runningFrontend;
  const backendStale =
    snapshot.remoteBackend !== null &&
    snapshot.seenBackend !== null &&
    snapshot.seenBackend !== snapshot.remoteBackend;

  if (!frontendStale && !backendStale) {
    return {
      reloadToken: null,
      rememberBackend: snapshot.remoteBackend,
      clearReloadGuard: true,
    };
  }

  return {
    reloadToken: `fe:${snapshot.remoteFrontend ?? ""}|be:${snapshot.remoteBackend ?? ""}`,
    rememberBackend: null,
    clearReloadGuard: false,
  };
}

function storageGet(store: Storage, key: string): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(store: Storage, key: string, value: string): void {
  try {
    store.setItem(key, value);
  } catch {
    /* Private mode and blocked storage should not break the app. */
  }
}

function storageRemove(store: Storage, key: string): void {
  try {
    store.removeItem(key);
  } catch {
    /* Ignore storage failures. */
  }
}

function versionFrom(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("version" in body)) {
    return null;
  }
  const version = (body as { version: unknown }).version;
  if (typeof version !== "string") {
    return null;
  }
  const trimmed = version.trim();
  return trimmed || null;
}

async function readVersion(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    return versionFrom(await response.json());
  } catch {
    return null;
  }
}

function cacheBust(url: string): string {
  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}t=${Date.now()}`;
}

function stripReloadParam(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("_v")) {
    return;
  }
  url.searchParams.delete("_v");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function reloadFor(token: string): void {
  storageSet(sessionStorage, RELOAD_GUARD, token);
  const url = new URL(window.location.href);
  url.searchParams.set("_v", token);
  window.location.replace(url.toString());
}

export async function checkVersions(): Promise<void> {
  const [remoteFrontend, remoteBackend] = await Promise.all([
    readVersion(cacheBust("/version.json")),
    readVersion(cacheBust(apiUrl("/api/version"))),
  ]);
  const plan = planVersionCheck({
    runningFrontend: FRONTEND_VERSION,
    remoteFrontend,
    seenBackend: storageGet(localStorage, BACKEND_SEEN),
    remoteBackend,
  });

  if (!plan.reloadToken) {
    if (plan.rememberBackend && plan.rememberBackend !== storageGet(localStorage, BACKEND_SEEN)) {
      storageSet(localStorage, BACKEND_SEEN, plan.rememberBackend);
    }
    if (plan.clearReloadGuard) {
      storageRemove(sessionStorage, RELOAD_GUARD);
    }
    stripReloadParam();
    return;
  }

  const alreadyReloaded =
    storageGet(sessionStorage, RELOAD_GUARD) === plan.reloadToken || landedOnReload === plan.reloadToken;
  if (alreadyReloaded) {
    if (remoteBackend) {
      storageSet(localStorage, BACKEND_SEEN, remoteBackend);
    }
    return;
  }

  reloadFor(plan.reloadToken);
}

let started = false;
let checking = false;

export function startVersionWatch(): void {
  if (started) {
    return;
  }
  started = true;

  const run = () => {
    if (document.visibilityState === "hidden" || checking) {
      return;
    }
    checking = true;
    void checkVersions().finally(() => {
      checking = false;
    });
  };

  document.addEventListener("visibilitychange", run);
  window.addEventListener("focus", run);
  window.addEventListener("pageshow", run);
  window.setInterval(run, POLL_MS);
  run();
}
