import { describe, expect, it } from "vitest";
import { shouldCheckTrackingCursor } from "./[token]/route";

describe("tracking cursor route guard", () => {
  it("queries D1 only for safe cursors", () => {
    expect(shouldCheckTrackingCursor(BigInt(34))).toBe(true);
    expect(shouldCheckTrackingCursor(BigInt(Number.MAX_SAFE_INTEGER))).toBe(true);
    expect(shouldCheckTrackingCursor(BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1))).toBe(false);
  });
});
