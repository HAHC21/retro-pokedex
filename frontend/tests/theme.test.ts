import { describe, expect, test } from "vitest";

import { isTheme, isThemePreference, nextPreference, resolveTheme } from "../src/theme/helpers";

describe("appearance", () => {
  test("night mode flips between light and dark", () => {
    expect(nextPreference("light")).toBe("dark");
    expect(nextPreference("dark")).toBe("light");
  });

  test("an explicit choice wins over the system", () => {
    expect(resolveTheme("dark")).toBe("dark");
    expect(resolveTheme("light")).toBe("light");
  });

  test("only light, dark, and system are stored", () => {
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("system")).toBe(false);
    expect(isThemePreference("system")).toBe(true);
    expect(isThemePreference("sepia")).toBe(false);
  });
});
