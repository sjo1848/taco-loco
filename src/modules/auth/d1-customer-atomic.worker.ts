import { env } from "cloudflare:workers";
import { createD1CustomerIdentityWith, D1_CUSTOMER_IDENTITY_CONFLICT, D1_CUSTOMER_IDENTITY_TRANSIENT, isD1CustomerIdentityTransient } from "@/modules/auth/d1-customer-atomic";

export { D1_CUSTOMER_IDENTITY_CONFLICT, D1_CUSTOMER_IDENTITY_TRANSIENT, isD1CustomerIdentityTransient };

export const createD1CustomerIdentity = (input: Parameters<typeof createD1CustomerIdentityWith>[1]) => createD1CustomerIdentityWith(env.DB, input);
