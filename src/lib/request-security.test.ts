import { describe, expect, it } from "vitest";
import { isSameOrigin } from "@/lib/request-security";

describe("request security", () => {
  it("accepts same-origin and server requests", () => {
    expect(isSameOrigin(new Request("https://taco.test/api/admin", { method: "POST" }))).toBe(true);
    expect(isSameOrigin(new Request("https://taco.test/api/admin", { method: "POST", headers: { origin: "https://taco.test" } }))).toBe(true);
  });
  it("rejects cross-origin mutations", () => {
    expect(isSameOrigin(new Request("https://taco.test/api/admin", { method: "POST", headers: { origin: "https://evil.test" } }))).toBe(false);
    expect(isSameOrigin(new Request("http://localhost:3014/api/orders/intents", { method: "POST", headers: { origin: "http://192.168.1.244:3014", host: "192.168.1.244:3014" } }))).toBe(true);
    expect(isSameOrigin(new Request("http://localhost:3014/api/orders/intents", { method: "POST", headers: { origin: "http://evil.test", host: "192.168.1.244:3014" } }))).toBe(false);
  });
});
