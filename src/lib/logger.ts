import { getEnv } from "@/lib/env";

type LogContext = Record<string, string | number | boolean | undefined>;

function write(level: string, message: string, context?: LogContext) {
  const configured = getEnv().LOG_LEVEL;
  const order = { debug: 0, info: 1, warn: 2, error: 3 };
  if (order[level as keyof typeof order] < order[configured]) return;
  console[level as "debug" | "info" | "warn" | "error"](JSON.stringify({ level, message, ...context }));
}

export const logger = {
  debug: (message: string, context?: LogContext) => write("debug", message, context),
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
};
