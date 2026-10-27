import { NextResponse } from "next/server";
import { getGoogleSignInConfig } from "@/lib/google-sign-in-config";

function csrfToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function GET() {
  const config = getGoogleSignInConfig();
  if (!config.enabled) return NextResponse.json({ enabled: false, clientId: null });
  const token = csrfToken();
  const response = NextResponse.json({ enabled: true, clientId: config.clientId, csrfToken: token });
  response.cookies.set("taco_loco_google_csrf", token, { httpOnly: false, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return response;
}
