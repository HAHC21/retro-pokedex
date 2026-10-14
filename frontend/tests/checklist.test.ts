import { describe, expect, test } from "vitest";

import { acquisitionFallback } from "../src/acquisition";
import { en } from "../src/i18n/en";

describe("checklist method text", () => {
  test("UC-CHK-02 a method that is still loading says it is checking, and a returned line is shown as written", () => {
    expect(acquisitionFallback(129, "rb", undefined, "")).toBe(en.acquire.checking);
    expect(acquisitionFallback(129, "rb", true, "Fishing with an Old Rod / Fishing with a Super Rod")).toBe(
      "Fishing with an Old Rod / Fishing with a Super Rod",
    );
  });
});
