import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  cookies: vi.fn(),
  getGoogleSignInConfig: vi.fn(),
  isSameOrigin: vi.fn(),
  customerAuthRateLimitKey: vi.fn(),
  checkCustomerAuthRateLimit: vi.fn(),
  verifyGoogleIdToken: vi.fn(),
  signInWithGoogle: vi.fn(),
  publicCustomer: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: mocked.cookies }));
vi.mock("@/lib/google-sign-in-config", () => ({ getGoogleSignInConfig: mocked.getGoogleSignInConfig }));
vi.mock("@/lib/request-security", () => ({ isSameOrigin: mocked.isSameOrigin }));
vi.mock("@/lib/customer-auth-rate-limit", () => ({
  customerAuthRateLimitKey: mocked.customerAuthRateLimitKey,
  checkCustomerAuthRateLimit: mocked.checkCustomerAuthRateLimit,
}));
vi.mock("@/modules/auth/google-identity", () => ({ verifyGoogleIdToken: mocked.verifyGoogleIdToken }));
vi.mock("@/modules/auth/customer-service", () => ({
  signInWithGoogle: mocked.signInWithGoogle,
  publicCustomer: mocked.publicCustomer,
}));

import { GET as getConfig } from "./config/route";
import { POST as postGoogleAuth } from "./route";

const cookieValues = { csrf: "c".repeat(64), nonce: "n".repeat(64) };

function authRequest(body: Record<string, string>) {
  return new Request("https://taco.example/api/customer/auth/google", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://taco.example" },
    body: JSON.stringify(body),
  });
}

describe("Google sign-in server challenge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.getGoogleSignInConfig.mockReturnValue({ enabled: true, clientId: "client.apps.googleusercontent.com" });
    mocked.isSameOrigin.mockReturnValue(true);
    mocked.customerAuthRateLimitKey.mockReturnValue("synthetic-test");
    mocked.checkCustomerAuthRateLimit.mockReturnValue({ allowed: true });
    mocked.cookies.mockResolvedValue({ get: (name: string) => ({
      taco_loco_google_csrf: { value: cookieValues.csrf },
      taco_loco_google_nonce: { value: cookieValues.nonce },
    }[name]) });
    mocked.verifyGoogleIdToken.mockResolvedValue({ subject: "synthetic-subject", email: "synthetic@example.test" });
    mocked.signInWithGoogle.mockResolvedValue({ id: "synthetic-customer", email: "synthetic@example.test", displayName: null, avatarUrl: null });
    mocked.publicCustomer.mockImplementation((customer) => ({ id: customer.id, email: customer.email, displayName: customer.displayName, avatarUrl: customer.avatarUrl }));
  });

  it("issues a fresh nonce challenge in an HttpOnly cookie and the GIS response", async () => {
    const response = await getConfig();
    const body = await response.json() as { csrfToken: string; nonce: string };
    const nonceCookie = response.cookies.get("taco_loco_google_nonce");

    expect(response.status).toBe(200);
    expect(body.nonce).toMatch(/^[0-9a-f]{64}$/);
    expect(body.nonce).not.toBe(body.csrfToken);
    expect(nonceCookie?.value).toBe(body.nonce);
    expect(nonceCookie?.httpOnly).toBe(true);
    expect(nonceCookie?.sameSite).toBe("lax");
  });

  it("rejects a client nonce that is not the server-issued cookie challenge", async () => {
    const response = await postGoogleAuth(authRequest({ credential: "x".repeat(120), csrfToken: cookieValues.csrf, nonce: "x".repeat(64) }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ code: "CSRF_REJECTED" });
    expect(mocked.verifyGoogleIdToken).not.toHaveBeenCalled();
    expect(mocked.signInWithGoogle).not.toHaveBeenCalled();
  });

  it("verifies the signed nonce against the issued challenge and expires that cookie on success", async () => {
    const response = await postGoogleAuth(authRequest({ credential: "x".repeat(120), csrfToken: cookieValues.csrf, nonce: cookieValues.nonce }));
    const body = await response.json() as { authenticated: boolean };

    expect(response.status).toBe(200);
    expect(body.authenticated).toBe(true);
    expect(mocked.verifyGoogleIdToken).toHaveBeenCalledWith("x".repeat(120), "client.apps.googleusercontent.com", cookieValues.nonce);
    expect(response.cookies.get("taco_loco_google_nonce")?.maxAge).toBe(0);
  });
});
