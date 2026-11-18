import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { hashSessionToken } from "@/modules/auth/crypto";
import type { AuthLoginDiagnostic } from "@/modules/auth/login-diagnostics";

export const SESSION_COOKIE = "taco_loco_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
type StageDiagnostic = { run<T>(stage: string, operation: () => T | Promise<T>): Promise<T> };

export async function createSession(userId: string, diagnostic?: AuthLoginDiagnostic) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const insert = () => db.session.create({ data: { tokenHash: hashSessionToken(token), userId, expiresAt } });
  if (diagnostic) await diagnostic.run("d1.session_create", insert);
  else await insert();
  const getCookieStore = () => cookies();
  const cookieStore = diagnostic ? await diagnostic.run("runtime.cookies_context", getCookieStore) : await getCookieStore();
  const setCookie = () => cookieStore.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
  if (diagnostic) await diagnostic.run("http.session_cookie_set", setCookie);
  else setCookie();
  return expiresAt;
}

export async function getCurrentAdmin(diagnostic?: StageDiagnostic) {
  const cookieStore = diagnostic ? await diagnostic.run("auth.cookies_context", cookies) : await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const lookup = () => db.session.findUnique({ where: { tokenHash: hashSessionToken(token) }, include: { user: true } });
  const session = diagnostic ? await diagnostic.run("d1.admin_session_lookup", lookup) : await lookup();
  if (!session || session.expiresAt <= new Date() || !session.user.active) return null;
  return session.user;
}

/** A hash is retained by SSE so a revoked session can be checked without keeping its cookie token. */
export async function getActiveAdminSessionHash() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = hashSessionToken(token);
  return await isAdminSessionHashActive(tokenHash) ? tokenHash : null;
}

export async function isAdminSessionHashActive(tokenHash: string) {
  const session = await db.session.findUnique({
    where: { tokenHash },
    select: { expiresAt: true, user: { select: { active: true } } },
  });
  return Boolean(session && session.expiresAt > new Date() && session.user.active);
}

export async function requireAdmin(diagnostic?: StageDiagnostic) {
  const user = await getCurrentAdmin(diagnostic);
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  cookieStore.delete(SESSION_COOKIE);
}
