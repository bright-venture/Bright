import { describe, expect, it } from "vitest";
import { computeUrgency } from "@contracts/services";

describe("computeUrgency", () => {
  it("keeps a dripping, stoppable leak at normal", () => {
    const r = computeUrgency("plumbing", {
      problem: "leak",
      location: "kitchen",
      flow: "drops",
      canStop: "yes",
      sourceVisible: "yes",
    });
    expect(r.level).toBe("normal");
  });

  it("marks a large leak that cannot be stopped as urgent", () => {
    const r = computeUrgency("plumbing", {
      problem: "leak",
      location: "bathroom",
      flow: "large",
      canStop: "no",
      sourceVisible: "yes",
    });
    expect(r.level).toBe("urgent");
  });

  it("flags burning smell as critical regardless of score", () => {
    const r = computeUrgency("electrical", {
      problem: "burning",
      scope: "single",
      exposed: "no",
    });
    expect(r.level).toBe("critical");
    expect(r.criticalFlags).toContain("problem=burning");
  });

  it("ignores answers that are not part of the category", () => {
    const r = computeUrgency("ac", { service: "cleaning", injected: "critical" });
    expect(r.level).toBe("normal");
  });
});
