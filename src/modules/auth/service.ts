import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/modules/auth/crypto";
import { clearLoginRateLimit, loginRateLimit } from "@/modules/auth/rate-limit";
import { createSession, revokeCurrentSession } from "@/modules/auth/session";
import type { AuthLoginDiagnostic } from "@/modules/auth/login-diagnostics";

export async function login(email: string, password: string, rateLimitKey: string, diagnostic?: AuthLoginDiagnostic) {
  const checkLimit = () => loginRateLimit(rateLimitKey);
  const limit = diagnostic ? await diagnostic.run("auth.login_rate_limit", checkLimit) : checkLimit();
  if (!limit.allowed) throw new AppError("RATE_LIMITED", "Demasiados intentos. Volvé a intentar más tarde.", 429);
  const lookup = () => db.adminUser.findUnique({ where: { email: email.trim().toLowerCase() } });
  const user = diagnostic ? await diagnostic.run("d1.admin_user_find_unique", lookup) : await lookup();
  diagnostic?.mark("d1.admin_user_lookup_result", !user ? "not_found" : user.active ? "active" : "inactive");
  if (!user || !user.active) {
    diagnostic?.mark("password.scrypt_verify", "skipped_no_active_user");
    throw new AppError("INVALID_CREDENTIALS", "Email o contraseña inválidos.", 401);
  }
  const verify = () => verifyPassword(password, user.passwordHash);
  const passwordValid = diagnostic ? await diagnostic.run("password.scrypt_verify", verify) : await verify();
  if (!passwordValid) throw new AppError("INVALID_CREDENTIALS", "Email o contraseña inválidos.", 401);
  clearLoginRateLimit(rateLimitKey);
  const update = () => db.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  if (diagnostic) await diagnostic.run("d1.admin_user_update", update);
  else await update();
  await createSession(user.id, diagnostic);
}

export async function logout() {
  await revokeCurrentSession();
}

export { hashPassword };
