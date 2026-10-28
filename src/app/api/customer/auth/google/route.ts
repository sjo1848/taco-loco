import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/request-security";
import { getGoogleSignInConfig } from "@/lib/google-sign-in-config";
import { publicCustomer, signInWithGoogle } from "@/modules/auth/customer-service";
import { verifyGoogleIdToken } from "@/modules/auth/google-identity";
import { checkCustomerAuthRateLimit, customerAuthRateLimitKey } from "@/lib/customer-auth-rate-limit";

const inputSchema = z.object({ credential: z.string().min(100), csrfToken: z.string().min(32).max(128), nonce: z.string().min(16).max(128) });

export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ code: "CSRF_REJECTED" }, { status: 403 });
    const limit = checkCustomerAuthRateLimit(customerAuthRateLimitKey(request));
    if (!limit.allowed) return NextResponse.json({ code: "AUTH_RATE_LIMITED" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
    const config = getGoogleSignInConfig();
    if (!config.enabled || !config.clientId) return NextResponse.json({ code: "GOOGLE_SIGN_IN_DISABLED" }, { status: 404 });
    const input = inputSchema.parse(await request.json());
    const cookieToken = (await cookies()).get("taco_loco_google_csrf")?.value;
    if (!cookieToken || cookieToken !== input.csrfToken) return NextResponse.json({ code: "CSRF_REJECTED" }, { status: 403 });
    const profile = await verifyGoogleIdToken(input.credential, config.clientId, input.nonce);
    const customer = await signInWithGoogle(profile);
    return NextResponse.json({ authenticated: true, customer: publicCustomer(customer) });
  } catch (error) {
    const code = error instanceof z.ZodError ? "INVALID_INPUT" : error instanceof Error && error.message === "GOOGLE_EMAIL_UNVERIFIED" ? "GOOGLE_EMAIL_UNVERIFIED" : "GOOGLE_AUTH_FAILED";
    return NextResponse.json({ code }, { status: 401 });
  }
}
