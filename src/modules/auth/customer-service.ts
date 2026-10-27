import { db } from "@/lib/db";
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

  const customer = await db.customer.create({ data: { email: profile.email, displayName: profile.displayName, avatarUrl: profile.avatarUrl, lastLoginAt: new Date() } });
  try {
    await db.customerIdentity.create({ data: { customerId: customer.id, provider: "google", providerSubject: profile.subject, emailAtLogin: profile.email } });
  } catch (error) {
    await db.customer.delete({ where: { id: customer.id } }).catch(() => undefined);
    throw error;
  }
  await createCustomerSession(customer.id);
  return customer;
}

export async function logoutCustomer() {
  await revokeCurrentCustomerSession();
}

export function publicCustomer(customer: { id: string; email: string | null; displayName: string | null; avatarUrl: string | null }) {
  return { id: customer.id, email: customer.email, displayName: customer.displayName, avatarUrl: customer.avatarUrl };
}
