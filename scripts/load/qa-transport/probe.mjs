import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { independentRequest } from './transport.mjs';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as pause } from 'node:timers/promises';

const origin = 'https://taco-loco-qa-orders-93.sjo1848.workers.dev';
const keys = '/tmp/tl-qa-93-remote';
const qa = { 'X-Taco-QA-Key': readFileSync(keys + '/key', 'utf8'), origin };
const password = readFileSync(keys + '/password', 'utf8');
const orders = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const readyRemainder = process.argv[3] === '--ready-remainder';
assert.equal(orders.length, readyRemainder ? 2 : 5);
assert(orders.every(order => /^[0-9a-f-]{36}$/.test(order.id) && ['IN_PREPARATION', 'READY'].includes(order.status)));
let calls = 0;
const controllers = [];
const cookies = [];
const children = [];
let mode = 'independent';
function log(data) { console.log(JSON.stringify({ at: new Date().toISOString(), ...data })); }

async function request(label, path, { method = 'GET', cookie, body, expected = 200 } = {}) {
  assert(++calls <= 27, 'request budget');
  const trace = randomUUID();
  const start = performance.now();
  let response;
  try {
    const options = {
      method, redirect: 'error', signal: AbortSignal.timeout(9000),
      headers: { ...qa, 'x-qa-trace': trace, ...(cookie && { cookie }), ...(body && { 'content-type': 'application/json' }) },
      body: body && JSON.stringify(body),
    };
    response = mode === 'independent' ? await independentRequest(origin + path, options) : await fetch(origin + path, options);
    const type = response.headers.get('content-type') ?? '';
    const raw = response.raw ?? await response.text();
    const data = type.includes('application/json') ? JSON.parse(raw) : {};
    log({ label, trace, mode, timing: response.timing, status: response.status, type, ray: response.headers.get('cf-ray'),
      elapsedMs: Math.round(performance.now() - start), code: data?.code,
      orderStatus: data?.order?.status, eventStatus: data?.event?.toStatus, sequence: data?.event?.sequence });
    assert.equal(response.status, expected, label);
    return { data, response };
  } catch (error) {
    log({ label, trace, status: response?.status, ray: response?.headers.get('cf-ray'), failure: error.name, cause: error.cause?.code, mode, transport: error.transport });
    throw error;
  }
}

async function separateStream(cookie, operator) {
  assert(++calls <= 27, 'request budget');
  const child = spawn(process.execPath, [new URL('./stream.mjs', import.meta.url).pathname], {
    stdio: ['pipe', 'pipe', 'ignore'],
  });
  children.push(child);
  const result = { ready: false, events: [], done: false, close: () => child.kill() };
  child.once('exit', () => { result.done = true; });
  child.stdin.end(JSON.stringify({ origin, key: qa['X-Taco-QA-Key'], cookie }));
  const lines = createInterface({ input: child.stdout });
  lines.on('line', line => {
    const entry = JSON.parse(line);
    if (entry.ready) result.ready = true;
    if (entry.event) result.events.push(entry.event);
    if (entry.status || entry.failure) log({ label: 'SSE-' + operator, mode: 'independent', ...entry });
  });
  return result;
}

async function stream(cookie, operator) {
  assert(++calls <= 27, 'request budget');
  const controller = new AbortController();
  controllers.push(controller);
  const result = { ready: false, events: [], done: false, close: () => controller.abort() };
  const response = await fetch(origin + '/api/admin/orders/events', {
    headers: { ...qa, cookie },
    signal: AbortSignal.any([controller.signal, AbortSignal.timeout(40000)]),
  });
  log({ label: 'SSE-' + operator, status: response.status, ray: response.headers.get('cf-ray') });
  assert.equal(response.status, 200);
  let buffer = '';
  const decoder = new TextDecoder();
  result.read = (async () => {
    try {
      for await (const chunk of response.body) {
        buffer += decoder.decode(chunk, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop();
        for (const frame of frames) {
          if (frame.includes('event: ready')) result.ready = true;
          if (frame.includes('event: order')) result.events.push(Number(frame.match(/^id: (\d+)$/m)?.[1]));
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) log({ label: 'SSE-' + operator, failure: error.name });
    } finally { result.done = true; }
  })();
  return result;
}

async function waitFor(predicate, label) {
  for (let i = 0; i < 70; i++) {
    if (predicate()) return;
    await pause(100);
  }
  throw new Error(label);
}

try {
  for (let i = 0; i < 3; i++) {
    const { response } = await request('login-' + (i + 1), '/api/auth/login', {
      method: 'POST', body: { email: i ? 'harness-' + (i + 1) + '@example.com' : 'harness@example.com', password },
    });
    cookies.push(response.headers.get('set-cookie').split(';')[0]);
  }
  assert.equal(new Set(cookies).size, 3);
  const matrix = readyRemainder ? [[0, orders.length, 'independent']] : [[0, 3, 'independent'], [3, 5, 'shared']];
  for (const [start, end, transport] of matrix) {
    mode = transport;
    const openStream = mode === 'independent' ? separateStream : stream;
    const streams = await Promise.all(cookies.map((cookie, i) => openStream(cookie, i + 1)));
    try {
      await waitFor(() => streams.every(s => s.ready), 'SSE ready');
      const expectedSse = [];
      for (let index = start; index < end; index++) {
        const order = orders[index];
        const path = '/api/admin/orders/' + order.id;
        const body = { toStatus: order.status === 'READY' ? 'DELIVERED' : 'READY' };
        const cell = 'cell-' + (index + 1);
        await request(cell + '/anonymous', path, { method: 'PATCH', body, expected: 401 });
        const { data } = await request(cell + '/authorized', path, { method: 'PATCH', body, cookie: cookies[index % 3] });
        assert.equal(data.order.status, body.toStatus);
        assert.equal(data.event.toStatus, body.toStatus);
        expectedSse.push(Number(data.event.sequence));
        if (readyRemainder) {
          await request(cell + '/duplicate-transition', path, { method: 'PATCH', body, cookie: cookies[index % 3], expected: 409 });
        }
      }
      await waitFor(() => streams.every(s => s.events.length >= expectedSse.length), 'SSE observations');
      for (const s of streams) assert.deepEqual(s.events, expectedSse);
      log({ label: 'summary', mode, validTransitions: end - start, sseEventsPerOperator: expectedSse.length });
    } finally { streams.forEach(s => s.close()); }
  }
} finally {
  controllers.forEach(c => c.abort());
  children.forEach(c => c.kill());
  mode = 'independent';
  for (const [index, cookie] of cookies.entries()) {
    try {
      await request('logout-' + (index + 1), '/api/auth/logout', { method: 'POST', cookie });
      await request('session-revoked-' + (index + 1), '/api/auth/session', { cookie, expected: 401 });
    } catch { process.exitCode = 1; }
  }
  log({ label: 'budget', calls });
}
