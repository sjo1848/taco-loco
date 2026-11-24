import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

const target = new URL(process.env.TACO_QA_LOCAL_URL ?? "http://127.0.0.1:8845");
assert.equal(target.protocol, "http:");
assert.equal(target.hostname, "127.0.0.1", "This mutating QA suite only runs on a disposable local Worker.");
const baseline = process.argv.includes("--baseline");
const browser = await chromium.launch({ headless: true });
const origin = target.origin;
const menu = "/menu";
const completedDialog = (page) => page.getByRole("dialog", { name: "¡Listo, tu pedido está armado!" });
const local = (path) => origin + path;
const section = (page) => page.getByRole("navigation", { name: "Secciones principales" });
const go = async (page, path) => { const r = await page.goto(local(path)); assert.equal(r?.status(), 200); };
const syntheticSessionToken = "b".repeat(64);

function setSyntheticStatus(id, status, original) {
  assert.match(id, /^[a-f0-9-]{36}$/);
  assert(["RECEIVED","CONFIRMED"].includes(original));
  assert(["CONFIRMED","DELIVERED"].includes(status));
  const state = process.env.TACO_QA_LOCAL_STATE;
  assert(state?.startsWith("/tmp/"), "Status fixtures require the isolated Wrangler local D1 runner.");
  execFileSync("./node_modules/.bin/wrangler", ["d1","execute","DB","--config","dist/server/wrangler.json","--local","--persist-to",state,"--command",
    `UPDATE "Order" SET status='${status}', verificationStatus='VERIFIED', updatedAt=CURRENT_TIMESTAMP WHERE id='${id}'; INSERT INTO OrderEvent (id,sequence,orderId,fromStatus,toStatus,kind) SELECT 'qa-transition-${status}', COALESCE(MAX(sequence),0)+1,'${id}','${original}','${status}','STATUS_TRANSITION' FROM OrderEvent;`],
  {stdio:"pipe", timeout:15000});
}
const activeOrders = (page) => page.getByRole("region",{name:"En curso",exact:true});
const history = (page) => page.getByRole("region",{name:"Historial",exact:true});

async function context(options = {}) {
  const c = await browser.newContext(options);
  await c.route("**/*", (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  // Simulate the external handoff without opening the app or sending a message.
  await c.addInitScript(() => {
    window.open = () => ({ opener: null, location: { replace(url) { window.__qaWhatsApp = url; } }, close() {} });
  });
  return c;
}
async function catalog(page) {
  await page.getByRole("heading", { name: "Elegí tu próximo antojo" }).waitFor();
  await page.getByRole("heading", { name: "QA Taco", exact: true }).waitFor();
}
async function addTaco(page) {
  await catalog(page);
  const search = page.getByRole("searchbox");
  await search.fill("sin-resultados-QA");
  await page.getByRole("heading", { name: "QA Taco", exact: true }).waitFor({ state:"hidden" });
  await search.fill("QA Taco");
  await page.getByRole("article").filter({ has: page.getByRole("heading", { name:"QA Taco", exact:true }) }).getByRole("button",{name:"Agregar",exact:true}).click();
  const product = page.getByRole("dialog",{name:"QA Taco"});
  await product.getByRole("button",{name:"Picante",exact:true}).click();
  await product.getByRole("button",{name:/Agregar al pedido/}).click();
}
async function details(page) {
  await page.getByRole("button",{name:/Abrir carrito/}).filter({visible:true}).first().click();
  await page.getByRole("button",{name:"Continuar con tus datos"}).click();
}
const send = (page) => baseline ? page.getByText("Enviar pedido", { exact:true }) : page.getByRole("button", { name:/^Enviar pedido$|^Recuperar intento$/ });
async function checkout(page) {
  const result = page.waitForResponse(r => new URL(r.url()).pathname === "/api/orders/intents" && r.request().method() === "POST");
  await send(page).click();
  const response = await result;
  assert([200,201].includes(response.status()), "Checkout API did not persist the synthetic order");
  const data = await response.json();
  await completedDialog(page).waitFor();
  return {data, request:response.request().postDataJSON()};
}
async function noOldDialog(page) {
  await catalog(page);
  await completedDialog(page).waitFor({state:"hidden"});
  await page.getByRole("heading",{level:1,name:/^Pedido TL-/}).waitFor({state:"hidden"});
  assert.equal(await page.evaluate(() => document.body.style.overflow), "");
}
function blockStorage(c) {
  return c.addInitScript(() => {
    for (const key of ["localStorage","sessionStorage"]) Object.defineProperty(window,key,{ get() { throw new DOMException("QA storage disabled", "SecurityError"); } });
  });
}

try {
  if (process.argv.includes("--closed")) {
    const c = await context();
    const page = await c.newPage();
    await go(page, menu);
    await addTaco(page);
    await details(page);
    await page.getByText("Fuera de horario",{exact:true}).first().waitFor();
    assert(await page.getByRole("button",{name:"Enviar pedido",exact:true}).isDisabled());
    await c.close();
    console.log("PASS closed hours: catalogue and cart remain available, submission disabled");
  } else {
  const desktop = await context({viewport:{width:1440,height:900}});
  const page = await desktop.newPage();
  await go(page, menu);
  await addTaco(page);
  await details(page);
  const first = await checkout(page);
  // The persisted token stays inside the test.
  assert.match(await page.evaluate(() => window.__qaWhatsApp), /^https:\/\/wa\.me\//);
  await completedDialog(page).getByRole("link",{name:"Ver estado de mi pedido"}).click();
  await page.waitForURL(local(first.data.tracking.path));
  await section(page).getByRole("link",{name:"Menú",exact:true}).click();
  await page.waitForURL(local(menu));
  await catalog(page);
  if(baseline) {
    await completedDialog(page).waitFor({timeout:4500});
    console.log("REPRO: tracking → Menú rendered the previous purchase modal.");
  } else {
    await noOldDialog(page);
    const changed = await desktop.request.post(local("/api/orders/intents"), {
      data:{...first.request, customerName:"Otro nombre"},headers:{origin},
    });
    assert.equal(changed.status(),409);
    assert.equal((await changed.json()).code,"ORDER_INTENT_MISMATCH");
    await section(page).getByRole("link",{name:"Pedidos",exact:true}).click();
    await page.waitForURL(local("/pedidos"));
    await activeOrders(page).getByRole("link",{name:/Ver seguimiento/}).click();
    await page.waitForURL(local(first.data.tracking.path));
    await section(page).getByRole("link",{name:"Menú",exact:true}).click();
    await page.waitForURL(local(menu));
    await page.reload();
    await noOldDialog(page);
    await page.goBack();
    await page.waitForURL(local(first.data.tracking.path));
    await page.getByRole("heading",{level:1,name:/^Pedido TL-/}).waitFor();
    await page.goForward();
    await page.waitForURL(local(menu));
    await noOldDialog(page);
    const separate = await desktop.newPage();
    await go(separate,menu);
    await noOldDialog(separate);
    assert.equal(await section(separate).getByRole("link",{name:"Pedidos",exact:true}).getAttribute("href"),"/pedidos");
    await separate.close();
    await page.bringToFront();
    await page.waitForURL(local(menu));
    await noOldDialog(page);
    if (process.env.TACO_QA_DESKTOP_SCREENSHOT) await page.screenshot({path:process.env.TACO_QA_DESKTOP_SCREENSHOT});
    console.log("PASS desktop: checkout, WhatsApp handoff, explicit tracking, reload/back/forward, new tab isolation");
  }

  // Drop only the response, after the real local backend has committed.
  await go(page,menu);
  if(baseline) {
    if(await completedDialog(page).isVisible()) await completedDialog(page).getByRole("button",{name:"Seguir viendo el menú"}).click();
  }
  await addTaco(page);
  await details(page);
  let lost;
  let interruptedReference;
  if (!baseline) {
    let releaseRequest;
    const requestGate = new Promise(resolve => { releaseRequest = resolve; });
    await page.route("**/api/orders/intents", async route => {
      interruptedReference = route.request().postDataJSON().clientReference;
      await requestGate;
      await route.abort("failed");
    }, {times:1});
    await send(page).click();
    try {
      await page.getByRole("button",{name:"Preparando pedido…",exact:true}).waitFor();
      await page.keyboard.press("Tab");
      assert(await page.getByRole("dialog").evaluate(dialog => dialog.contains(document.activeElement)));
      await page.keyboard.press("Shift+Tab");
      assert(await page.getByRole("dialog").evaluate(dialog => dialog.contains(document.activeElement)));
    } finally { releaseRequest(); }
    await page.getByText(/No pudimos confirmar si se registró/).waitFor();
    page.once("dialog", dialog => dialog.dismiss());
    await page.getByRole("button",{name:"Vaciar pedido",exact:true}).click();
    assert(await send(page).isEnabled());
    assert.match(await send(page).textContent(),/Recuperar intento/);
    await page.route("**/api/orders/intents", async route => {
      assert.equal(route.request().postDataJSON().clientReference,interruptedReference);
      await route.fulfill({ status:409, json:{code:"ORDERS_CLOSED"} });
    }, {times:1});
    await send(page).click();
    await page.getByText(/No estamos tomando pedidos en este momento\. Revisá nuestros horarios/).waitFor();
    assert.match(await send(page).textContent(),/Recuperar intento/);
  }
  await page.route("**/api/orders/intents", async route => {
    const persisted = await route.fetch({maxRetries:0});
    try {
      assert.equal(persisted.status(),201);
      lost={body:route.request().postDataJSON(),order:(await persisted.json()).order.id};
    } finally { await route.abort("failed"); }
  },{times:1});
  await send(page).click();
  await page.getByText(baseline ? /No pudimos registrar el pedido/ : /No pudimos confirmar si se registró/).waitFor();
  assert(lost);
  if (!baseline) {
    assert.equal(lost.body.clientReference,interruptedReference);
    const name=page.getByRole("textbox",{name:/Nombre para el pedido/});
    await name.fill("Datos cambiados");
    await send(page).click();
    await page.getByText(/Restaurá los datos originales/).waitFor();
    await name.fill("");
  }
  if(!baseline) { await page.reload(); await details(page); }
  const retry = await checkout(page);
  if(baseline) {
    assert.notEqual(retry.request.clientReference,lost.body.clientReference);
    assert.notEqual(retry.data.order.id,lost.order);
    console.log("REPRO: a lost response led to a second persisted order on retry.");
  } else {
    assert.equal(retry.request.clientReference,lost.body.clientReference);
    assert.equal(retry.data.order.id,lost.order);
    assert.equal(retry.data.reused,true);
    // Simulate blur/focus as the person returns from the external window.
    await page.evaluate(() => { window.dispatchEvent(new Event("blur")); window.dispatchEvent(new Event("focus")); });
    await page.waitForURL(local(retry.data.tracking.path));
    await section(page).getByRole("link",{name:"Menú",exact:true}).click();
    await page.waitForURL(local(menu));
    await noOldDialog(page);
    await addTaco(page);
    await details(page);
    await page.getByRole("radio",{name:/Delivery/}).check();
    await send(page).click();
    await page.getByText("Completá la dirección y el titular de la transferencia.",{exact:true}).waitFor();
    await page.getByRole("textbox",{name:"Dirección",exact:true}).fill("Dirección sintética");
    await page.getByRole("textbox",{name:"Titular de la transferencia",exact:true}).fill("Titular sintético");
    const delivery = await checkout(page);
    assert.equal(delivery.data.order.totalAmount,1500);
    assert.equal(delivery.request.fulfillment,"DELIVERY");
    assert.notEqual(delivery.data.order.id,retry.data.order.id);
    await completedDialog(page).getByRole("link",{name:"Ver estado de mi pedido"}).click();
    await page.waitForURL(local(delivery.data.tracking.path));
    await page.getByRole("button",{name:"Informé la transferencia"}).waitFor();
    await section(page).getByRole("link",{name:"Pedidos",exact:true}).click();
    await page.waitForURL(local("/pedidos"));
    await activeOrders(page).getByRole("link",{name:/Ver seguimiento/}).nth(2).waitFor();
    assert.equal(await activeOrders(page).getByRole("link",{name:/Ver seguimiento/}).count(),3);
    console.log("PASS DELIVERY: required fields, current fee, distinct order and payment-pending tracking");
    console.log("PASS idempotence after real local commit + response lost + reload; one-shot return and no stale modal");
  }
  await desktop.close();
  if(baseline) process.exitCode = 0;
  else {
    const mobile = await context({viewport:{width:390,height:844}, isMobile:true, hasTouch:true});
    const phone = await mobile.newPage();
    await go(phone,menu);
    await addTaco(phone);
    const nav = phone.getByRole("navigation",{name:"Navegación de la app"});
    await nav.getByRole("link",{name:"Cuenta",exact:true}).click();
    await phone.waitForURL(local("/cuenta"));
    await nav.getByRole("link",{name:"Carrito",exact:true}).click();
    await phone.getByRole("dialog").getByText("Salsa: Picante",{exact:false}).waitFor();
    await phone.getByRole("button",{name:"Continuar con tus datos"}).click();
    await phone.getByRole("radio",{name:/Delivery/}).check();
    await phone.getByRole("textbox",{name:"Dirección",exact:true}).fill("Dirección sintética");
    await phone.getByRole("textbox",{name:"Titular de la transferencia",exact:true}).fill("Titular sintético");
    assert(await phone.getByText(/Total informativo con envío/).isVisible());
    const viewport=await phone.evaluate(() => ({content:document.documentElement.scrollWidth,width:innerWidth}));
    assert(viewport.content <= viewport.width + 1);
    await send(phone).scrollIntoViewIfNeeded();
    assert(await send(phone).isVisible());
    if (process.env.TACO_QA_SCREENSHOT) await phone.screenshot({path:process.env.TACO_QA_SCREENSHOT});
    await phone.keyboard.press("Escape");
    await phone.getByRole("dialog").waitFor({state:"hidden"});
    await details(phone);
    await phone.route("**/api/orders/intents", route => route.abort("failed"), {times:1});
    await send(phone).click();
    await phone.getByText(/No pudimos confirmar si se registró/).waitFor();
    phone.once("dialog", dialog => dialog.accept());
    await phone.getByRole("button",{name:"Descartar intento anterior",exact:true}).click();
    assert.match(await send(phone).textContent(),/Enviar pedido/);
    await mobile.close();
    console.log("PASS mobile: catalogue/search/modifiers, Cuenta → Carrito, DELIVERY details and fee");

    const privateContext = await context();
    await blockStorage(privateContext);
    const privatePage = await privateContext.newPage();
    await go(privatePage, menu);
    await addTaco(privatePage);
    await details(privatePage);
    const privateOrder = await checkout(privatePage);
    await completedDialog(privatePage).getByRole("link",{name:"Ver estado de mi pedido"}).click();
    await privatePage.waitForURL(local(privateOrder.data.tracking.path));
    await section(privatePage).getByRole("link",{name:"Menú",exact:true}).click();
    await privatePage.waitForURL(local(menu));
    await noOldDialog(privatePage);
    await privateContext.close();
    console.log("PASS storage blocked: guest checkout and manual tracking");

    const account = await context();
    await account.addCookies([{name:"taco_loco_customer_session",value:syntheticSessionToken,url:origin,httpOnly:true}]);
    const customer = await account.newPage();
    await go(customer, "/cuenta");
    await customer.getByText(/Bienvenido, QA Cliente/).waitFor();
    // Claim the guest order via its private link and test that an explicit repeat only opens the draft.
    await go(customer,first.data.tracking.path);
    await customer.getByRole("button",{name:/Guardar pedido|Guardar en mi cuenta/}).click();
    await customer.getByRole("button",{name:"Sí, guardarlo",exact:true}).click();
    await customer.getByText("Pedido guardado en tu cuenta.",{exact:true}).waitFor();
    const visitor = await context();
    try {
      const mismatch = await visitor.request.post(local("/api/orders/intents"), {
        data:first.request, headers:{origin},
      });
      assert.equal(mismatch.status(),409);
      const result=await mismatch.json();
      assert.equal(result.code,"ORDER_INTENT_SESSION_CHANGED");
      assert(!Object.hasOwn(result,"tracking"));
    } finally { await visitor.close(); }
    await section(customer).getByRole("link",{name:"Pedidos",exact:true}).click();
    await customer.waitForURL(local("/pedidos"));
    const code = "TL-" + String(first.data.order.orderNumber).padStart(4,"0");
    const current = activeOrders(customer);
    await current.getByRole("heading",{name:code,exact:true}).waitFor();
    await current.getByText("Devolución pendiente",{exact:true}).waitFor();
    await current.getByText("Verificando el pago",{exact:true}).waitFor();
    assert.equal(await current.getByRole("link",{name:/Ver seguimiento/}).count(),3);
    assert.equal(await current.getByRole("button",{name:"Repetir pedido"}).count(),0);
    await customer.setViewportSize({width:390,height:844});
    assert(await customer.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    if(process.env.TACO_QA_ORDERS_SCREENSHOT) await customer.screenshot({path:process.env.TACO_QA_ORDERS_SCREENSHOT,fullPage:true});
    await customer.setViewportSize({width:1440,height:900});
    await history(customer).getByRole("button",{name:"Ver más del historial",exact:true}).click();
    await history(customer).getByRole("heading",{name:"TL-0020",exact:true}).waitFor();
    const privateId=first.data.order.id;
    const api=local("/api/customer/orders/"+privateId+"/tracking");
    const list=await account.request.get(local("/api/customer/orders?view=active"));
    assert.equal(list.status(),200);
    assert(!(await list.text()).includes(first.data.tracking.path.split("/").at(-1)));
    const other = await context();
    try {
      assert.equal((await other.request.get(api)).status(),401);
      await other.addCookies([{name:"taco_loco_customer_session",value:"c".repeat(64),url:origin,httpOnly:true}]);
      assert.equal((await other.request.get(api)).status(),404);
      assert.equal((await other.request.post(api+"/payment",{headers:{origin}})).status(),404);
      const foreignPage = await other.request.get(local("/pedidos/"+privateId));
      assert.doesNotMatch(await foreignPage.text(),new RegExp(code));
    } finally { await other.close(); }
    const cancelledPayment = local("/api/customer/orders/aaaaaaaa-1111-4111-8111-111111111115/tracking/payment");
    assert.equal((await account.request.post(cancelledPayment,{headers:{origin}})).status(),409);
    const pay = local("/api/customer/orders/aaaaaaaa-1111-4111-8111-111111111112/tracking/payment");
    assert.equal((await account.request.post(pay,{headers:{origin:"https://example.invalid"}})).status(),403);
    const report = await account.request.post(pay,{headers:{origin}});
    assert.equal(report.status(),200);
    assert.deepEqual(await report.json(),{reported:true,reused:false});
    const replay = await account.request.post(pay,{headers:{origin}});
    assert.equal(replay.status(),200);
    assert.deepEqual(await replay.json(),{reported:true,reused:true});
    await current.getByRole("link",{name:"Ver seguimiento de "+code}).click();
    await customer.waitForURL(local("/pedidos/"+privateId));
    await customer.getByRole("heading",{name:"Pedido "+code}).waitFor();
    const initial = await account.request.get(api);
    assert.equal(initial.headers()["referrer-policy"],"no-referrer");
    assert.match(initial.headers()["cache-control"],/no-store/);
    const payload = await initial.json();
    assert(!(JSON.stringify(payload).includes(first.data.tracking.path.split("/").at(-1))));
    const unchanged = await account.request.get(api+"?after="+payload.version);
    assert.equal(unchanged.status(),204);
    assert.equal(unchanged.headers()["referrer-policy"],"no-referrer");
    setSyntheticStatus(privateId,"CONFIRMED","RECEIVED");
    await customer.getByRole("heading",{name:"Pedido confirmado",exact:true}).waitFor({timeout:20000});
    setSyntheticStatus(privateId,"DELIVERED","CONFIRMED");
    await customer.getByRole("heading",{name:"Pedido entregado",exact:true}).waitFor({timeout:20000});
    await section(customer).getByRole("link",{name:"Pedidos",exact:true}).click();
    await history(customer).getByRole("heading",{name:code,exact:true}).waitFor();
    await history(customer).getByRole("article").filter({has:customer.getByRole("heading",{name:code,exact:true})})
      .getByRole("button",{name:"Repetir pedido",exact:true}).click();
    await customer.getByRole("button",{name:"Continuar al checkout",exact:true}).click();
    await customer.getByRole("dialog").getByText("QA Taco",{exact:true}).waitFor();
    assert.equal(await completedDialog(customer).count(),0);
    await go(customer,"/pedidos/"+privateId);
    const logout = await account.newPage();
    await go(logout,"/cuenta");
    await logout.getByRole("button",{name:"Cerrar sesión",exact:true}).click();
    await logout.getByText("Sesión cerrada.",{exact:true}).waitFor();
    await customer.bringToFront();
    await customer.evaluate(()=>window.dispatchEvent(new Event("focus")));
    await customer.getByRole("heading",{name:"Seguimiento no disponible",exact:true}).waitFor();
    assert.equal(await customer.getByRole("heading",{name:"Pedido "+code,exact:true}).count(),0);
    await go(customer,"/cuenta");
    assert.equal(await customer.getByRole("heading",{name:"Mis pedidos"}).count(),0);
    await account.close();
    console.log("PASS synthetic session: claim, private history, repeat as draft, logout");
  }
  }
} finally { await browser.close(); }
