import { env } from "cloudflare:workers";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@/generated/d1";

const adapter = new PrismaD1(env.DB);

export const db = new PrismaClient({ adapter });
