import { env } from "cloudflare:workers";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({
  connectionString: env.HYPERDRIVE.connectionString,
});

export const db = new PrismaClient({ adapter });
