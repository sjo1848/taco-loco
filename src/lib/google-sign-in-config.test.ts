import { afterEach, describe, expect, it, vi } from "vitest";
import { getGoogleSignInConfig } from "./google-sign-in-config";

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
});
