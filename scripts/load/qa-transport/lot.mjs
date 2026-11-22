import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import { setTimeout as pause } from 'node:timers/promises';
import { independentRequest } from './transport.mjs';

const [mode, countArg, refsFile] = process.argv.slice(2);
const count = Number(countArg);
assert(['PICKUP','DELIVERY'].includes(mode) && Number.isInteger(count) && count > 0 && count <= 5);
const origin = 'https://taco-loco-qa-orders-93.sjo1848.workers.dev';
const keys = '/tmp/tl-qa-93-remote';
const key = readFileSync(keys + '/key', 'utf8');
const password = readFileSync(keys + '/password', 'utf8');
const refs = Array.from({length: count}, () => randomUUID());
writeFileSync(refsFile, JSON.stringify(refs), {mode: 0o600, flag: 'wx'});
const cookies = [];
const children = new Set();
let calls = 0;
let stopped = false;
function log(event) { console.log(JSON.stringify({at: new Date().toISOString(), ...event})); }
function reserve() { assert(++calls <= 76, 'request cap'); }

async function call(label, path, { method='GET', cookie, body, expected=200, cleanup=false }={}) {
  if (stopped && !cleanup) throw new Error('lot halted');
  reserve();
  const trace = randomUUID();
  try {
    const response = await independentRequest(origin + path, {
      method, headers: { 'X-Taco-QA-Key': key, origin, 'x-qa-trace': trace, ...(cookie && {cookie}),
        ...(body && {'content-type':'application/json'}) },
      body: body && JSON.stringify(body),
    });
    const acceptable = Array.isArray(expected) ? expected : [expected];
    log({label, trace, status: response.status, ray: response.headers.get('cf-ray'), timing: response.timing});
    assert(acceptable.includes(response.status), label + ': unexpected HTTP ' + response.status);
    return { response, data: JSON.parse(response.raw) };
  } catch (error) {
    stopped = true;
    log({label, trace, failure: error.name, transport: error.transport});
    throw new Error(label + ': request failed');
  }
}

async function group(tasks) {
  const completed = await Promise.allSettled(tasks);
  const rejected = completed.find(entry => entry.status === 'rejected');
  if (rejected) throw rejected.reason;
  return completed.map(entry => entry.value);
}

async function until(predicate, label) {
  for (let i = 0; i < 90; i++) {
    if (predicate()) return;
    await pause(100);
  }
  throw new Error(label);
}

function stream(cookie, after) {
  reserve();
  const child = spawn(process.execPath, [new URL('./stream.mjs', import.meta.url).pathname], {
    stdio: ['pipe','pipe','ignore'],
  });
  children.add(child);
  const sample = { events: [], close() { child.kill(); } };
  child.once('exit', () => { children.delete(child); sample.closed = true; });
  child.stdin.end(JSON.stringify({origin,key,cookie,after}));
  createInterface({input:child.stdout}).on('line', line => {
    const item = JSON.parse(line);
    if (item.ready) sample.cursor = item.id;
    if (item.event) sample.events.push(item.event);
    if (item.status || item.failure) log({label:'SSE', ...item});
    if (item.status && item.status !== 200) stopped = true;
  });
  return sample;
}

const readCounts = async () => (await call('operations', '/api/admin/orders/operations?countsOnly=1', {cookie:cookies[0]})).data.counts;
const transition = (id, cookie, toStatus, expected=200) =>
  call('transition-' + toStatus, '/api/admin/orders/' + id, {
    method:'PATCH',cookie,expected,
    body: mode === 'DELIVERY' && toStatus === 'CONFIRMED' ? {action:'CONFIRM_PAYMENT_AND_ORDER'} : {toStatus},
  });

try {
  for (let i = 0; i < 3; i++) {
    const {response} = await call('login', '/api/auth/login', {
      method:'POST',body:{email: i ? 'harness-' + (i + 1) + '@example.com' : 'harness@example.com',password},
    });
    cookies.push(response.headers.get('set-cookie').split(';')[0]);
  }
  assert.equal(new Set(cookies).size,3);
  const initial = await readCounts();
  const streams = cookies.map(cookie => stream(cookie));
  await until(() => streams.every(s => Number.isFinite(s.cursor)), 'SSE ready');
  const originalCursor = streams[0].cursor;
  assert(streams.every(s => s.cursor === originalCursor));
  const orders = await group(refs.map(async (clientReference,index) => {
    await pause(index * 120);
    const quantity = 1 + index % 3;
    const body = {clientReference, fulfillment:mode, lines:[{productId:'acacacac-acac-4aca-8aca-acacacacacac',
      quantity,modifiers:[{group:'Salsa',option:'Picante'}]}],
      ...(mode === 'DELIVERY' && {deliveryAddress:'Dirección sintética QA',transferHolderName:'Titular sintético QA'})};
    const {data:order} = await call('intent', '/api/orders/intents', {method:'POST',body,expected:201});
    const {data:retry} = await call('idempotent-intent', '/api/orders/intents', {method:'POST',body});
    assert.equal(retry.order.id, order.order.id);
    assert.equal(retry.tracking.path, order.tracking.path);
    assert.equal(retry.reused,true);
    assert.equal(order.order.totalAmount, 1200 * quantity + (mode === 'DELIVERY' ? 300 : 0));
    return order;
  }));
  const orderIds = orders.map(o => o.order.id);
  assert.equal(new Set(orderIds).size,count);
  assert.equal((await readCounts()).attention, initial.attention + count);
  let replayed=0;
  if (mode === 'DELIVERY') {
    await until(() => streams.every(s => s.events.length === count),'creation SSE');
    const old = streams[2];
    old.close();
    const checkpoint = old.events.at(-1);
    for (const order of orders) {
      const blocked = await call('blocked-unpaid', '/api/admin/orders/' + order.order.id, {method:'PATCH',
        cookie:cookies[0],body:{toStatus:'CONFIRMED'},expected:409});
      assert.equal(blocked.data.code,'PAYMENT_REQUIRED');
      const path = '/api/orders/tracking/' + order.tracking.path.split('/').at(-1) + '/payment';
      assert.equal((await call('report-payment',path,{method:'POST'})).data.reused,false);
      assert.equal((await call('retry-payment',path,{method:'POST'})).data.reused,true);
    }
    const caught = stream(cookies[2],checkpoint);
    await until(() => caught.events.length >= count,'payment replay');
    replayed = caught.events.length;
    streams[2] = {get events() { return [...old.events,...caught.events]; }};
  }
  let conflicts=0;
  for (const [toStatus,queue] of [['CONFIRMED','start'],['IN_PREPARATION','preparing'],['READY','ready'],['DELIVERED',null]]) {
    const remaining = [...orderIds];
    if (mode==='PICKUP' && toStatus==='CONFIRMED') {
      const same = remaining.shift();
      const outcomes = await group(cookies.slice(0,2).map(cookie => transition(same,cookie,toStatus,[200,409])));
      assert.deepEqual(outcomes.map(x=>x.response.status).sort(),[200,409]);
      conflicts++;
    }
    await group(cookies.map(async (cookie,operator) => {
      for (const id of remaining.filter((_,i)=>i%3===operator)) {
        const {data} = await transition(id,cookie,toStatus);
        assert.equal((data.order ?? data).status,toStatus);
        if (data.event) assert.equal(data.event.toStatus,toStatus);
      }
    }));
    if (queue) assert.equal((await readCounts())[queue], initial[queue] + count);
  }
  const expected = Array.from({length:count*(mode==='DELIVERY'?6:5)},(_,i)=>originalCursor+i+1);
  await until(() => streams.every(s=>s.events.length>=expected.length),'complete SSE');
  for (const s of streams) assert.deepEqual(s.events,expected);
  const final = await readCounts();
  for (const queue of ['start','preparing','ready','attention']) assert.equal(final[queue],initial[queue]);
  log({label:'lot-summary',mode,count,replayed,conflicts,eventsPerOperator:expected.length});
} finally {
  for (const child of children) child.kill();
  for (const cookie of cookies) {
    try {
      await call('logout','/api/auth/logout',{method:'POST',cookie,cleanup:true});
      await call('verify-revocation','/api/auth/session',{cookie,expected:401,cleanup:true});
    } catch { process.exitCode = 1; }
  }
  log({label:'budget',calls});
}
