import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(12),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export function getEnv() {
  return envSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    LOG_LEVEL: process.env.LOG_LEVEL,
  });
}

export function getOptionalEnv(name: string) {
  return process.env[name];
}
