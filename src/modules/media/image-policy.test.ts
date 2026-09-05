import { describe, expect, it } from "vitest";
import { detectAllowedImageMime, isWithinPixelLimit } from "./image-policy";

describe("media image policy", () => {
  it("recognizes allowed image signatures", () => {
    expect(detectAllowedImageMime(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe("image/jpeg");
    expect(
      detectAllowedImageMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe("image/png");
    expect(
      detectAllowedImageMime(
        new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
      ),
    ).toBe("image/webp");
  });

  it("rejects unknown signatures and oversize pixel counts", () => {
    expect(detectAllowedImageMime(new Uint8Array([1, 2, 3, 4]))).toBeNull();
    expect(isWithinPixelLimit(5000, 5000, 25_000_000)).toBe(true);
    expect(isWithinPixelLimit(5001, 5000, 25_000_000)).toBe(false);
    expect(isWithinPixelLimit(0, 5000, 25_000_000)).toBe(false);
  });
});
