import { db } from "@/lib/db";
import { isD1Runtime } from "@/lib/runtime";
import { createCustomerSession, revokeCurrentCustomerSession } from "@/modules/auth/customer-session";
import type { GoogleIdentityProfile } from "@/modules/auth/google-identity";

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
    if (isD1Runtime) {
      const { createD1CustomerIdentity } = await import("@/modules/auth/d1-customer-atomic.worker");
      await createD1CustomerIdentity({ customerId, identityId, email: profile.email, displayName: profile.displayName, avatarUrl: profile.avatarUrl, provider: "google", providerSubject: profile.subject });
    } else {
      await db.$transaction([
        db.customer.create({ data: { id: customerId, email: profile.email, displayName: profile.displayName, avatarUrl: profile.avatarUrl, lastLoginAt: new Date() } }),
        db.customerIdentity.create({ data: { id: identityId, customerId, provider: "google", providerSubject: profile.subject, emailAtLogin: profile.email } }),
      ]);
    }
  } catch (error) {
    const winningIdentity = await db.customerIdentity.findUnique({ where: { provider_providerSubject: { provider: "google", providerSubject: profile.subject } } });
    if (!winningIdentity) throw error;
    const winningCustomer = await db.customer.update({ where: { id: winningIdentity.customerId }, data: { lastLoginAt: new Date() } });
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
