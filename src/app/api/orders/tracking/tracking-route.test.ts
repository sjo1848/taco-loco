import { describe, expect, it } from "vitest";
import { shouldCheckTrackingCursor } from "./[token]/route";

describe("tracking cursor route guard", () => {
  it("queries D1 only for safe cursors", () => {
    expect(shouldCheckTrackingCursor("A".repeat(43))).toBe(true);
    expect(shouldCheckTrackingCursor("unsafe-sequence-34")).toBe(false);
  });
});
