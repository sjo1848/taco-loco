/** Temporary, non-sensitive diagnostics for the S7c staging login investigation. */
export type AuthLoginDiagnostic = {
  run<T>(stage: string, operation: () => T | Promise<T>): Promise<T>;
  mark(stage: string, result: string): void;
  finish(result: string, httpStatus: number, safeCode?: string): void;
};

const STAGING_ORIGIN = "https://taco-loco-staging-20260913.sjo1848.workers.dev";

export function isStagingAuthDiagnosticsEnabled(request: Request, flagEnabled: boolean) {
  return flagEnabled && new URL(request.url).origin === STAGING_ORIGIN;
}

export function createAuthLoginDiagnostic(request: Request, enabled: boolean) {
  if (!enabled) return { id: undefined, diagnostic: undefined };
  const id = crypto.randomUUID();
  const ray = request.headers.get("cf-ray") ?? "unavailable";
  const startedAt = performance.now();
  const emit = (stage: string, result: string, durationMs?: number, details?: { safeCode?: string; httpStatus?: number }) => {
    console.info(JSON.stringify({
      event: "admin_auth_login_diagnostic",
      id,
      ray,
      stage,
      result,
      ...(durationMs === undefined ? {} : { durationMs: Number(durationMs.toFixed(2)) }),
      ...(details?.safeCode === undefined ? {} : { safeCode: details.safeCode }),
      ...(details?.httpStatus === undefined ? {} : { httpStatus: details.httpStatus }),
    }));
  };

  emit("request", "started");
  request.signal.addEventListener("abort", () => emit("request.signal", "aborted"), { once: true });

  const diagnostic: AuthLoginDiagnostic = {
    async run<T>(stage: string, operation: () => T | Promise<T>) {
      const stageStartedAt = performance.now();
      emit(stage, "started");
      try {
        const result = await operation();
        emit(stage, "completed", performance.now() - stageStartedAt);
        return result;
      } catch (error) {
        emit(stage, "failed", performance.now() - stageStartedAt, { safeCode: error instanceof Error ? error.name : "NonErrorThrow" });
        throw error;
      }
    },
    mark(stage: string, result: string) {
      emit(stage, result);
    },
    finish(result: string, httpStatus: number, safeCode?: string) {
      emit("request", result, performance.now() - startedAt, { safeCode, httpStatus });
    },
  };

  return { id, diagnostic };
}
