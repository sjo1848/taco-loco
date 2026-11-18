/** Temporary staging-only, non-sensitive diagnostics for admin read failures. */
const STAGING_ORIGIN = "https://taco-loco-staging-20260913.sjo1848.workers.dev";

export function createAdminQueryDiagnostic(request: Request, route: "operations" | "attention", enabled: boolean) {
  if (!enabled || new URL(request.url).origin !== STAGING_ORIGIN) return undefined;
  const id = crypto.randomUUID();
  const ray = request.headers.get("cf-ray") ?? "unavailable";
  const startedAt = performance.now();
  const emit = (stage: string, result: string, durationMs?: number, status?: number) => {
    console.info(JSON.stringify({
      event: "admin_query_diagnostic", id, ray, route, stage, result,
      ...(durationMs === undefined ? {} : { durationMs: Number(durationMs.toFixed(2)) }),
      ...(status === undefined ? {} : { status }),
    }));
  };
  emit("request", "started");
  request.signal.addEventListener("abort", () => emit("request.signal", "aborted", performance.now() - startedAt), { once: true });
  return {
    id,
    async run<T>(stage: string, operation: () => T | Promise<T>): Promise<T> {
      const start = performance.now();
      emit(stage, "started");
      try {
        const value = await operation();
        emit(stage, "completed", performance.now() - start);
        return value;
      } catch (error) {
        emit(stage, "failed", performance.now() - start);
        throw error;
      }
    },
    finish(status: number) { emit("request", "completed", performance.now() - startedAt, status); },
  };
}

export type AdminQueryDiagnostic = NonNullable<ReturnType<typeof createAdminQueryDiagnostic>>;
