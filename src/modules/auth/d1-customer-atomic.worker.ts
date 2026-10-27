import { env } from "cloudflare:workers";
import { createD1CustomerIdentityWith } from "@/modules/auth/d1-customer-atomic";

export const createD1CustomerIdentity = (input: Parameters<typeof createD1CustomerIdentityWith>[1]) => createD1CustomerIdentityWith(env.DB, input);
