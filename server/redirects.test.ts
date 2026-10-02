// The "next" page after sign-in comes from the URL, so it must never lead off the site.
import { describe, expect, it } from "vitest";
import { safeNext } from "../src/lib/navigation";

describe("safeNext", () => {
  it("keeps pages on this site", () => {
    expect(safeNext("/requests")).toBe("/requests");
    expect(safeNext("/reset-password?next=%2Ftech&welcome=1")).toBe("/reset-password?next=%2Ftech&welcome=1");
  });

  it("refuses anything that could lead elsewhere", () => {
    for (const evil of [
      null,
      "",
      "https://evil.com",
      "evil.com",
      "//evil.com",
      "/\\evil.com",
      "/\\/evil.com",
      "/\tevil.com",
      "/\n/evil.com",
    ]) {
      expect(safeNext(evil), JSON.stringify(evil)).toBe("/");
    }
  });
});
