// Vite aliases this internal runtime module to each tested vinext version.
// @ts-expect-error -- vinext does not publish this internal path to consumers
import { ensureAppRouteModulesLoaded } from "vinext/internal/server/app-route-module-loader";
// The harness supplies this module unbundled so V8 parses its natives syntax.
// @ts-expect-error -- provided by Miniflare test modules
import { isTurbofanned, optimize } from "./v8-natives.js";

type Fetcher = { fetch(url: string): Promise<Response> };
declare const scheduler: { wait(ms: number): Promise<void> };

let primeCount = 0;
const sources = new Map<string, Promise<unknown>>();
function createRoute(id: string) {
  return {
    page: null as unknown,
    layouts: [null] as unknown[],
    __loadPage: () => sources.get(id)!.then(() => ({ id })),
    __loadLayouts: [() => Promise.resolve({ default: "layout" })],
    __loaded: false,
    __loading: null as Promise<unknown> | null,
  };
}

let gatedRoute: ReturnType<typeof createRoute> | undefined;
let startedRun: string | null = null;
let joined = 0;

const worker = {
  async fetch(request: Request, env: { UPSTREAM: Fetcher }): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/start") {
      startedRun = null;
      joined = 0;
      let open!: () => void;
      sources.set("menu-gated", new Promise<void>((resolve) => { open = resolve; }));
      const primed = optimize(ensureAppRouteModulesLoaded, () => {
        const id = `prime-${primeCount++}`;
        sources.set(id, Promise.resolve());
        return [createRoute(id)];
      });
      gatedRoute = createRoute("menu-gated");
      void ensureAppRouteModulesLoaded(gatedRoute);
      const created = isTurbofanned(ensureAppRouteModulesLoaded);
      startedRun = url.searchParams.get("run");
      for (let i = 0; joined < 2 && i < 500; i++) await scheduler.wait(10);
      open();
      return Response.json({ primed, created, joined });
    }
    if (url.pathname === "/started") {
      return new Response(String(startedRun === url.searchParams.get("run")));
    }
    if (url.pathname === "/join") {
      joined++;
      void scheduler.wait(10_000);
      await ensureAppRouteModulesLoaded(gatedRoute);
      const response = await env.UPSTREAM.fetch("http://upstream/");
      return new Response(await response.text());
    }
    return new Response("not found", { status: 404 });
  },
};

export default worker;
