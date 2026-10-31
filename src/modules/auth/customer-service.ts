import { db } from "@/lib/db";
import { isD1Runtime } from "@/lib/runtime";
import { createCustomerSession, revokeCurrentCustomerSession } from "@/modules/auth/customer-session";
import type { GoogleIdentityProfile } from "@/modules/auth/google-identity";
import { D1_CUSTOMER_IDENTITY_CONFLICT, D1_CUSTOMER_IDENTITY_TRANSIENT, isD1CustomerIdentityTransient } from "@/modules/auth/d1-customer-atomic";

const IDENTITY_WRITE_ATTEMPTS = 3;
const IDENTITY_RETRY_DELAYS_MS = [0, 15, 40];

export function isCustomerIdentityConflict(error: unknown) {
  return error instanceof Error && (error.message === D1_CUSTOMER_IDENTITY_CONFLICT || error.message.includes("P2002") || /UNIQUE|unique constraint/i.test(error.message));
}

export function isCustomerIdentityTransient(error: unknown) {
  return error instanceof Error && (error.message === D1_CUSTOMER_IDENTITY_TRANSIENT || isD1CustomerIdentityTransient(error));
}

export function isCustomerIdentityInfrastructureError(error: unknown) {
  return error instanceof Error && (error.message === "D1_CUSTOMER_IDENTITY_FAILED" || isCustomerIdentityTransient(error));
}

async function waitForIdentityRetry(attempt: number) {
  const delay = IDENTITY_RETRY_DELAYS_MS[attempt] ?? IDENTITY_RETRY_DELAYS_MS.at(-1)!;
  if (delay > 0) await new Promise<void>((resolve) => setTimeout(resolve, delay));
}

export async function withBoundedIdentityWrite<T>(write: () => Promise<T>) {
  for (let attempt = 0; attempt < IDENTITY_WRITE_ATTEMPTS; attempt += 1) {
    try {
      return await write();
    } catch (error) {
      if (!isCustomerIdentityTransient(error) || attempt === IDENTITY_WRITE_ATTEMPTS - 1) throw error;
      await waitForIdentityRetry(attempt);
    }
  }
  throw new Error(D1_CUSTOMER_IDENTITY_TRANSIENT);
}

export async function signInWithGoogle(profile: GoogleIdentityProfile) {
  const existingIdentity = await db.customerIdentity.findUnique({ where: { provider_providerSubject: { provider: "google", providerSubject: profile.subject } }, include: { customer: true } });
  if (existingIdentity) {
    if (!existingIdentity.customer.active) throw new Error("CUSTOMER_DISABLED");
    const customer = await db.customer.update({ where: { id: existingIdentity.customerId }, data: { email: profile.email, displayName: profile.displayName, avatarUrl: profile.avatarUrl, lastLoginAt: new Date() } });
    await createCustomerSession(customer.id);
    return customer;
  }

  const customerId = crypto.randomUUID();
  const identityId = crypto.randomUUID();
  try {
    await withBoundedIdentityWrite(async () => {
        if (isD1Runtime) {
          const { createD1CustomerIdentity } = await import("@/modules/auth/d1-customer-atomic.worker");
          await createD1CustomerIdentity({ customerId, identityId, email: profile.email, displayName: profile.displayName, avatarUrl: profile.avatarUrl, provider: "google", providerSubject: profile.subject });
        } else {
          await db.$transaction([
            db.customer.create({ data: { id: customerId, email: profile.email, displayName: profile.displayName, avatarUrl: profile.avatarUrl, lastLoginAt: new Date() } }),
            db.customerIdentity.create({ data: { id: identityId, customerId, provider: "google", providerSubject: profile.subject, emailAtLogin: profile.email } }),
          ]);
        }
        return undefined;
      });
  } catch (error) {
    if (!isCustomerIdentityConflict(error)) throw error;
    const winningIdentity = await db.customerIdentity.findUnique({ where: { provider_providerSubject: { provider: "google", providerSubject: profile.subject } } });
    if (!winningIdentity) throw error;
    const winningCustomer = await db.customer.findUnique({ where: { id: winningIdentity.customerId } });
    if (!winningCustomer || !winningCustomer.active) throw new Error("CUSTOMER_DISABLED");
    await db.customer.update({ where: { id: winningCustomer.id }, data: { lastLoginAt: new Date() } });
    await createCustomerSession(winningCustomer.id);
    return winningCustomer;
  }
  const customer = await db.customer.update({ where: { id: customerId }, data: { lastLoginAt: new Date() } });
  await createCustomerSession(customer.id);
  return customer;
}

export async function logoutCustomer() {
  await revokeCurrentCustomerSession();
}

export function publicCustomer(customer: { id: string; email: string | null; displayName: string | null; avatarUrl: string | null }) {
  return { id: customer.id, email: customer.email, displayName: customer.displayName, avatarUrl: customer.avatarUrl };
}
