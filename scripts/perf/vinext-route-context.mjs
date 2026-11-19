import { readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, "../..");
const source = path.resolve(here, "vinext-route-context.worker.ts");
const nativeCode = `
export function optimize(fn, args) {
  for (let round = 0; round < 5 && !%ActiveTierIsTurbofan(fn); round++) {
    %PrepareFunctionForOptimization(fn);
    for (let i = 0; i < 20; i++) fn(...args());
    %OptimizeFunctionOnNextCall(fn);
    fn(...args());
  }
  return %ActiveTierIsTurbofan(fn);
}
export function isTurbofanned(fn) { return %ActiveTierIsTurbofan(fn); }
`;

const oldRoot = process.argv[2];
if (!oldRoot) throw new Error("Pass the baseline worktree path");
const oldNode = path.resolve(oldRoot, "node_modules/.pnpm");
const newNode = path.resolve(root, "node_modules/.pnpm");
const findPackage = (nodePath, version) => {
  const name = readdirSync(nodePath).find((entry) => entry.startsWith(`vinext@${version}_`));
  if (!name) throw new Error(`vinext ${version} not installed in ${nodePath}`);
  return path.join(nodePath, name, "node_modules/vinext/dist");
};

async function run(label, vinextDist) {
  const built = await build({
    configFile: false,
    logLevel: "silent",
    resolve: { alias: { "vinext/internal": vinextDist } },
    ssr: { noExternal: true, target: "webworker" },
    build: { ssr: source, write: false, minify: false, rollupOptions: { external: ["./v8-natives.js", /^node:/] } },
  });
  const chunks = Array.isArray(built) ? built : [built];
  const code = chunks.flatMap((item) => "output" in item ? item.output : []).find((item) => item.type === "chunk" && item.isEntry)?.code;
  if (!code) throw new Error(`${label}: no bundled worker`);
  const miniflarePath = path.join(newNode, readdirSync(newNode).find((entry) => entry.startsWith("miniflare@")), "node_modules/miniflare/dist/src/index.js");
  const { Miniflare, convertV4MiniflareOptions } = await import(pathToFileURL(miniflarePath));
  const prior = process.env.MINIFLARE_WORKERD_V8_FLAGS;
  process.env.MINIFLARE_WORKERD_V8_FLAGS = "--allow-natives-syntax --no-maglev";
  let worker;
  try {
    worker = new Miniflare(convertV4MiniflareOptions({ workers: [
      { name: "main", modules: [
        { type: "ESModule", path: "worker.js", contents: code },
        { type: "ESModule", path: "v8-natives.js", contents: nativeCode },
      ], compatibilityDate: "2026-09-05", compatibilityFlags: ["nodejs_compat"], serviceBindings: { UPSTREAM: "upstream" } },
      { name: "upstream", modules: true, script: "export default { fetch: () => new Response('upstream ok') };", compatibilityDate: "2026-09-05" },
    ] }));
    await worker.ready;
  } finally {
    if (prior === undefined) delete process.env.MINIFLARE_WORKERD_V8_FLAGS;
    else process.env.MINIFLARE_WORKERD_V8_FLAGS = prior;
  }
  try {
    const runId = crypto.randomUUID();
    const get = (pathname) => worker.dispatchFetch(`http://worker${pathname}${pathname.includes("?") ? "&" : "?"}run=${runId}`);
    const start = get("/start");
    for (let i = 0; i < 500; i++) {
      if (await (await get("/started")).text() === "true") break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const joins = [0, 1].map(async () => {
      try { const response = await get("/join"); return { status: response.status, body: (await response.text()).split("\n")[0].slice(0, 100) }; }
      catch (error) { return { error: String(error).slice(0, 100) }; }
    });
    const started = await (await start).json();
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("join timeout")), 15_000);
    });
    const results = await Promise.race([Promise.all(joins), timeout]).finally(() => clearTimeout(timer));
    return { label, started, results };
  } finally { await worker.dispose(); }
}

const outcomes = [];
for (const [label, dist] of [
  ["beta.9", findPackage(oldNode, "1.0.0-beta.9")],
  ["1.4.5", findPackage(newNode, "1.4.5")],
]) {
  const outcome = await run(label, dist);
  console.log(JSON.stringify(outcome));
  outcomes.push(outcome);
}
const [old, current] = outcomes;
const forced = (result) => result.started.primed && result.started.created && result.started.joined === 2;
if (!forced(old) || !forced(current)
  || !old.results.every((result) => result.status === 500 && result.body.includes("different request"))
  || !current.results.every((result) => result.status === 200 && result.body === "upstream ok")) {
  throw new Error("The forced request-context comparison did not meet its expected results");
}
