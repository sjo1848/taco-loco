import { NextResponse } from "next/server";
import { getGoogleSignInConfig } from "@/lib/google-sign-in-config";
import { createGoogleNonce } from "@/lib/google-nonce";
import { issueGoogleAuthChallenge } from "@/modules/auth/google-auth-challenge";

export async function GET() {
  const config = getGoogleSignInConfig();
  if (!config.enabled) return NextResponse.json({ enabled: false, clientId: null });
  const token = createGoogleNonce();
  const nonce = await issueGoogleAuthChallenge();
  const response = NextResponse.json({ enabled: true, clientId: config.clientId, csrfToken: token, nonce });
  response.cookies.set("taco_loco_google_csrf", token, { httpOnly: false, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  response.cookies.set("taco_loco_google_nonce", nonce, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return response;
}
