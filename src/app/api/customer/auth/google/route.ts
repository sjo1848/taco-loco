import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/request-security";
import { getGoogleSignInConfig } from "@/lib/google-sign-in-config";
import { isCustomerIdentityInfrastructureError, publicCustomer, signInWithGoogle } from "@/modules/auth/customer-service";
import { verifyGoogleIdToken } from "@/modules/auth/google-identity";
import { consumeGoogleAuthChallenge } from "@/modules/auth/google-auth-challenge";
import { checkCustomerAuthRateLimit, customerAuthRateLimitKey } from "@/lib/customer-auth-rate-limit";

const inputSchema = z.object({ credential: z.string().min(100), csrfToken: z.string().min(32).max(128), nonce: z.string().min(16).max(128) });

export async function POST(request: Request) {
  let googleIdentityVerified = false;
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ code: "CSRF_REJECTED" }, { status: 403 });
    const limit = checkCustomerAuthRateLimit(customerAuthRateLimitKey(request));
    if (!limit.allowed) return NextResponse.json({ code: "AUTH_RATE_LIMITED" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
    const config = getGoogleSignInConfig();
    if (!config.enabled || !config.clientId) return NextResponse.json({ code: "GOOGLE_SIGN_IN_DISABLED" }, { status: 404 });
    const input = inputSchema.parse(await request.json());
    const requestCookies = await cookies();
    const cookieToken = requestCookies.get("taco_loco_google_csrf")?.value;
    const cookieNonce = requestCookies.get("taco_loco_google_nonce")?.value;
    if (!cookieToken || cookieToken !== input.csrfToken || !cookieNonce || cookieNonce !== input.nonce) return NextResponse.json({ code: "CSRF_REJECTED" }, { status: 403 });
    const profile = await verifyGoogleIdToken(input.credential, config.clientId, input.nonce);
    googleIdentityVerified = true;
    if (!await consumeGoogleAuthChallenge(input.nonce)) return NextResponse.json({ code: "CSRF_REJECTED" }, { status: 403 });
    const customer = await signInWithGoogle(profile);
    const response = NextResponse.json({ authenticated: true, customer: publicCustomer(customer) });
    response.cookies.set("taco_loco_google_nonce", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    if (googleIdentityVerified && (!(error instanceof Error) || error.message !== "CUSTOMER_DISABLED")) {
      const response = NextResponse.json({ code: "AUTH_PROVIDER_UNAVAILABLE" }, { status: 503 });
      response.cookies.set("taco_loco_google_nonce", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
      response.cookies.set("taco_loco_google_csrf", "", { httpOnly: false, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
      return response;
    }
    if (isCustomerIdentityInfrastructureError(error)) {
      const response = NextResponse.json({ code: "AUTH_PROVIDER_UNAVAILABLE" }, { status: 503 });
      response.cookies.set("taco_loco_google_nonce", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
      response.cookies.set("taco_loco_google_csrf", "", { httpOnly: false, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
      return response;
    }
    const code = error instanceof z.ZodError ? "INVALID_INPUT" : error instanceof Error && error.message === "GOOGLE_EMAIL_UNVERIFIED" ? "GOOGLE_EMAIL_UNVERIFIED" : "GOOGLE_AUTH_FAILED";
    return NextResponse.json({ code }, { status: 401 });
  }
}
