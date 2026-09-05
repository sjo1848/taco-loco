export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const originUrl = new URL(origin);
  const requestUrl = new URL(request.url);
  const requestHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const requestProtocol = request.headers.get("x-forwarded-proto");
  if (requestHost && originUrl.host === requestHost && (!requestProtocol || originUrl.protocol === `${requestProtocol}:`)) return true;
  return origin === requestUrl.origin;
}
