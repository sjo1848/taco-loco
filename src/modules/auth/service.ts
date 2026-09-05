import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/modules/auth/crypto";
import { clearLoginRateLimit, loginRateLimit } from "@/modules/auth/rate-limit";
import { createSession, revokeCurrentSession } from "@/modules/auth/session";

export async function login(email: string, password: string, rateLimitKey: string) {
  const limit = loginRateLimit(rateLimitKey);
  if (!limit.allowed) throw new AppError("RATE_LIMITED", "Demasiados intentos. Volvé a intentar más tarde.", 429);
  const user = await db.adminUser.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    throw new AppError("INVALID_CREDENTIALS", "Email o contraseña inválidos.", 401);
  }
  clearLoginRateLimit(rateLimitKey);
  await db.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
}

export async function logout() {
  await revokeCurrentSession();
}

export { hashPassword };
