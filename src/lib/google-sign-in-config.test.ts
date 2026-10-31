import { afterEach, describe, expect, it, vi } from "vitest";
import { getGoogleSignInConfig, isGoogleSignInClientConfig, readGoogleSignInClientConfig } from "./google-sign-in-config";

describe("Google Sign-In configuration", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is disabled when no client ID and explicit enable flag exist", () => {
    vi.stubEnv("GOOGLE_SIGN_IN_ENABLED", "false");
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    expect(getGoogleSignInConfig()).toEqual({ enabled: false, clientId: null });
  });

  it("requires both the explicit flag and a Google web client ID", () => {
    vi.stubEnv("GOOGLE_SIGN_IN_ENABLED", "true");
    vi.stubEnv("GOOGLE_CLIENT_ID", "taco-loco.apps.googleusercontent.com");
    expect(getGoogleSignInConfig()).toEqual({ enabled: true, clientId: "taco-loco.apps.googleusercontent.com" });
  });

  it("rejects non-ok or malformed client configuration responses", async () => {
    expect(isGoogleSignInClientConfig({ error: "upstream failure" })).toBe(false);
    expect(isGoogleSignInClientConfig({ enabled: true, clientId: "client.apps.googleusercontent.com", csrfToken: "", nonce: "nonce" })).toBe(false);
    expect(isGoogleSignInClientConfig({ enabled: false, clientId: "stale-client.apps.googleusercontent.com" })).toBe(false);
    await expect(readGoogleSignInClientConfig(new Response(JSON.stringify({ error: "upstream failure" }), { status: 500 }))).rejects.toThrow("GOOGLE_CONFIG_UNAVAILABLE");
    await expect(readGoogleSignInClientConfig(new Response(JSON.stringify({ enabled: true, clientId: null }), { status: 200 }))).rejects.toThrow("GOOGLE_CONFIG_INVALID");
  });

  it("accepts an explicitly disabled configuration", async () => {
    await expect(readGoogleSignInClientConfig(new Response(JSON.stringify({ enabled: false, clientId: null }), { status: 200 }))).resolves.toEqual({ enabled: false, clientId: null });
  });
});
