import { beforeEach, describe, expect, test, vi } from "vitest";

import { planVersionCheck } from "../src/versionWatch";

describe("an open tab reloads once for a new version", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  test("UC-AUTO-01 a changed version asks for one reload and the same pair does not ask again", async () => {
    const stale = planVersionCheck({
      runningFrontend: "0.0.0-test",
      remoteFrontend: "9.9.9",
      seenBackend: "1",
      remoteBackend: "1",
    });
    expect(stale.reloadToken).toBeTruthy();

    const same = planVersionCheck({
      runningFrontend: "0.0.0-test",
      remoteFrontend: "0.0.0-test",
      seenBackend: "1",
      remoteBackend: "1",
    });
    expect(same.reloadToken).toBeNull();

    const replace = vi.fn();
    const href = "http://localhost/";
    vi.stubGlobal("location", { href, origin: "http://localhost", pathname: "/", search: "", hash: "", replace });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const version = url.includes("/api/version") ? "1" : "9.9.9";
        return { ok: true, json: async () => ({ version }) };
      }),
    );

    const { checkVersions } = await import("../src/versionWatch");
    await checkVersions();
    await checkVersions();
    expect(replace).toHaveBeenCalledTimes(1);
  });
});
