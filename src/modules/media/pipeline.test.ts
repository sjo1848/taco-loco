import { describe, expect, it } from "vitest";
import { processProductImage } from "@/modules/media/pipeline";

const onePixelPng = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"));

describe("media pipeline", () => {
  it("converts an allowed image to webp", async () => {
    const result = await processProductImage(new File([onePixelPng], "pixel.png", { type: "image/png" }));
    expect(result.contentType).toBe("image/webp");
    expect(result.body.length).toBeGreaterThan(0);
  });

  it("rejects unsupported formats", async () => {
    await expect(processProductImage(new File(["not an image"], "file.txt", { type: "text/plain" }))).rejects.toMatchObject({ code: "MEDIA_INVALID" });
  });
});
