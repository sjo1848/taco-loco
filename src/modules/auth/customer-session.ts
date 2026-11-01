import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { hashSessionToken } from "@/modules/auth/crypto";

export const CUSTOMER_SESSION_COOKIE = "taco_loco_customer_session";
const CUSTOMER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createCustomerSession(customerId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + CUSTOMER_SESSION_TTL_MS);
  await db.customerSession.create({ data: { tokenHash: hashSessionToken(token), customerId, expiresAt } });
  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
  return expiresAt;
}

export async function getCurrentCustomer() {
  const token = (await cookies()).get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.customerSession.findUnique({ where: { tokenHash: hashSessionToken(token) }, include: { customer: true } });
  if (!session || session.expiresAt <= new Date() || !session.customer.active) return null;
  return session.customer;
}

export async function requireCustomer() {
  const customer = await getCurrentCustomer();
  if (!customer) throw new Error("CUSTOMER_UNAUTHORIZED");
  return customer;
}

export async function revokeCurrentCustomerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (token) await db.customerSession.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  cookieStore.delete(CUSTOMER_SESSION_COOKIE);
}
