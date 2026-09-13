declare module "*.wasm?module" {
  const module: WebAssembly.Module;
  export default module;
}

declare module "*.js" {
  const runtime: Record<string, unknown>;
  export = runtime;
}
