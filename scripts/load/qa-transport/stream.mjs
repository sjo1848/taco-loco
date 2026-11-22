let config = '';
for await (const chunk of process.stdin) config += chunk;
const { origin, key, cookie, after } = JSON.parse(config);
const controller = new AbortController();
process.on('SIGTERM', () => controller.abort());
try {
  const response = await fetch(origin + '/api/admin/orders/events', {
    headers: { 'X-Taco-QA-Key': key, cookie, ...(after !== undefined && { 'Last-Event-ID': String(after) }) },
    signal: AbortSignal.any([controller.signal, AbortSignal.timeout(65000)]),
  });
  console.log(JSON.stringify({ status: response.status, ray: response.headers.get('cf-ray') }));
  if (response.status !== 200) process.exit(1);
  let buffer = '';
  const decoder = new TextDecoder();
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop();
    for (const frame of frames) {
      const id = Number(frame.match(/^id: (\d+)$/m)?.[1]);
      if (frame.includes('event: ready')) console.log(JSON.stringify({ ready: true, id }));
      if (frame.includes('event: order')) console.log(JSON.stringify({ event: id }));
    }
  }
} catch (error) {
  if (!controller.signal.aborted) {
    console.log(JSON.stringify({ failure: error.name, code: error.cause?.code }));
    process.exitCode = 1;
  }
}
