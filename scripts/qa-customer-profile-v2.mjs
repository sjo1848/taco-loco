import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const base = new URL(process.env.TACO_QA_LOCAL_URL ?? "").origin;
assert.equal(new URL(base).hostname, "127.0.0.1");
const mode = process.env.TACO_QA_PROFILE_MODE;
assert(["baseline", "candidate"].includes(mode));
const output = resolve(process.env.TACO_QA_PROFILE_OUTPUT);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const sessionCookie = "taco_loco_customer_session";
const product = "acacacac-acac-4aca-8aca-acacacacacac";
const tracked = "/pedido/" + "d".repeat(43);
const report = { mode, views: [], network: {}, functional: [], accessibility: {} };
const filteredUrl = (path) => base + path;
const modal = (p) => p.getByRole("dialog");
async function setCustomer(context, letter) {
  await context.addCookies([{ name: sessionCookie, value: letter.repeat(64), url: base, httpOnly: true }]);
}
async function setup(width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  await context.route("**/*", route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(14000);
  return { context, page };
}
async function visit(page, path) {
  const response = await page.goto(filteredUrl(path));
  assert.equal(response?.status(), 200, path);
}
async function snapshot(page, width, name) {
  const layout = await page.evaluate(() => ({ width: innerWidth, root: document.documentElement.scrollWidth }));
  if (mode === "candidate") assert(layout.root <= layout.width + 1, `${name} horizontal overflow ${layout.root} at ${width}`);
  report.views.push({ width, name, overflow: layout.root - layout.width });
  await page.screenshot({ path: join(output, `${width}-${name}.png`), animations: "disabled" });
  if (mode === "candidate" && width === 390 && ["producto","delivery","cuenta","datos","direcciones","favoritos"].includes(name)) {
    const result = await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
    report.accessibility[name] = result.violations.map(({id,impact,nodes}) => ({id,impact,targets:nodes.map(({target})=>target)}));
  }
}
async function menu(page) {
  await visit(page, "/menu");
  await page.getByRole("searchbox").waitFor();
}
async function addTaco(page) {
  await page.getByRole("article").filter({ has: page.getByRole("heading", { name: "QA Taco", exact: true }) }).getByRole("button", { name: "Agregar", exact: true }).first().click();
  await modal(page).getByRole("button", { name: "Picante", exact: true }).click();
}
async function cart(page) {
  await page.getByRole("button", { name: /Abrir carrito/ }).filter({ visible: true }).first().click();
  await modal(page).getByRole("heading", { name: "Revisá tu pedido" }).waitFor();
}
async function goBackToMenu(page) {
  await page.keyboard.press("Escape");
  await modal(page).waitFor({state:"hidden"});
}

try {
  for (const width of process.env.TACO_QA_PROFILE_ONLY === "functional" ? [] : [320,360,390,430,768,1440]) {
    const { context, page } = await setup(width);
    let network;
    page.on("request", request => {
      const url = new URL(request.url());
      if (!network || url.origin !== base) return;
      const key = url.pathname.startsWith("/api/") ? `${request.method()} ${url.pathname}` : "assets/pages";
      network[key] = (network[key] ?? 0) + 1;
    });
    network = {};
    await menu(page);
    await page.getByRole("heading", { name: "QA Taco", exact: true }).first().waitFor();
    if(mode==="candidate" && width===320) {
      const categories=page.getByRole("navigation",{name:"Categorías del menú"});
      await categories.getByRole("link",{name:"Bebidas QA"}).click();
      await page.waitForFunction(() => location.hash==="#category-qa-side-cat");
      const clearOfHeader=await page.evaluate(()=>document.querySelector("#category-qa-side-cat").getBoundingClientRect().top >= document.querySelector(".category-nav").getBoundingClientRect().bottom - 2);
      assert(clearOfHeader);
      await page.getByRole("searchbox").fill("QA Taco");
      assert.equal(await categories.locator('[aria-current="location"]').textContent(),"QA");
      await page.getByRole("searchbox").fill("sin resultados qa");
      await page.getByText(/No encontramos productos/).waitFor();
      await page.getByRole("searchbox").fill("");
    }
    await snapshot(page,width,"menu");
    report.network[`${width}-menu-guest`] = network; network = null;
    await addTaco(page);
    await snapshot(page,width,"producto");
    await modal(page).getByRole("button",{name:/Agregar al pedido/}).click();
    await modal(page).waitFor({state:"hidden"});
    await snapshot(page,width,"menu-con-carrito");
    if (mode === "candidate" && width < 768) {
      const tabs = page.getByRole("navigation", {name:"Navegación de la app"});
      assert.deepEqual(await tabs.getByRole("link").allTextContents().then(values=>values.map(v=>v.trim().slice(1))), ["Menú","Pedidos","Cuenta"]);
      const tabsRect = await tabs.boundingBox();
      const action = await page.getByRole("button",{name:/Ver carrito/}).boundingBox();
      assert(tabsRect && action && action.y+action.height <= tabsRect.y);
      assert.equal(await page.locator(".public-navigation__cart").isVisible(),false);
      if(width===390) {
        await page.locator(".public-frame").evaluate(el=>el.style.setProperty("--public-tab-offset","86px"));
        const expandedTabs = await tabs.boundingBox();
        const shiftedAction = await page.getByRole("button",{name:/Ver carrito/}).boundingBox();
        assert(expandedTabs && shiftedAction && shiftedAction.y+shiftedAction.height < expandedTabs.y);
        await page.locator(".public-frame").evaluate(el=>el.style.removeProperty("--public-tab-offset"));
      }
    }
    await cart(page);
    if (mode === "candidate") {
      assert.equal(await page.locator(".public-bottom-nav [aria-current=page]").textContent(), "🛒Carrito (1)");
      assert.equal(await page.locator(".public-frame__body").getAttribute("inert"),"");
    }
    await snapshot(page,width,"carrito");
    await modal(page).getByRole("button",{name:"Continuar con tus datos"}).click();
    await snapshot(page,width,"retiro");
    await modal(page).getByRole("radio",{name:/Delivery/}).check();
    await modal(page).getByRole("textbox",{name:"Dirección",exact:true}).fill("Dirección sintética");
    await modal(page).getByRole("textbox",{name:"Titular de la transferencia",exact:true}).fill("Titular sintético");
    await modal(page).getByRole("button",{name:"Enviar pedido",exact:true}).scrollIntoViewIfNeeded();
    await snapshot(page,width,"delivery");
    if(mode==="candidate" && width===390) {
      await page.setViewportSize({width,height:480});
      await modal(page).getByRole("textbox",{name:"Titular de la transferencia",exact:true}).focus();
      const submit=await modal(page).getByRole("button",{name:"Enviar pedido",exact:true}).boundingBox();
      assert(submit && submit.y>=0 && submit.y+submit.height<=480);
      await page.setViewportSize({width,height:900});
    }
    await goBackToMenu(page);
    await visit(page,"/cuenta");
    await page.getByRole("heading",{name:mode === "baseline" ? "Tu cuenta, cuando quieras" : "Mi cuenta",exact:true}).waitFor();
    await snapshot(page,width,"visitante");
    await setCustomer(context,"b");
    network = {};
    await visit(page,"/cuenta");
    if(mode==="baseline") await page.getByText(/Bienvenido, QA Cliente/).waitFor();
    else await page.getByRole("heading",{name:"QA Cliente",exact:true}).waitFor();
    if(mode==="baseline") await page.getByText("Casa QA",{exact:true}).waitFor();
    await snapshot(page,width,"cuenta");
    report.network[`${width}-cuenta`] = network; network = null;
    if(mode==="candidate") {
      for(const [suffix,label,ready] of [
        ["datos","Mis datos","customer@example.com"],
        ["direcciones","Mis direcciones","Casa QA"],
        ["favoritos","Mis favoritos","QA Taco"],
      ]) {
        await visit(page,`/cuenta/${suffix}`);
        await page.getByRole("heading",{name:label,exact:true}).waitFor();
        await page.getByText(ready,{exact:true}).first().waitFor();
        await snapshot(page,width,suffix);
      }
    }
    await visit(page,"/pedidos");
    await page.getByRole("region",{name:"En curso",exact:true}).getByText("TL-0008",{exact:true}).waitFor();
    await page.getByRole("region",{name:"Historial",exact:true}).getByText("TL-0030",{exact:true}).waitFor();
    await snapshot(page,width,"pedidos");
    await visit(page,tracked);
    await page.getByRole("heading",{name:"Pedido TL-0008",exact:true}).waitFor();
    await page.getByRole("button",{name:"Entendido",exact:true}).click({timeout:2500}).catch(()=>{});
    await snapshot(page,width,"seguimiento");
    await context.close();
  }
  if (mode === "candidate") {
    await writeFile(join(output,"report.json"), JSON.stringify(report,null,2));
    const { context, page } = await setup(390);
    const headers = { origin: base };
    const profile = filteredUrl("/api/customer/profile");
    // Independent HTTP connections isolate the expected rejection statuses from local keep-alive cancellation.
    function profileStatus(data,{origin=base,authenticated=true,viewer}={}) {
      const args=["--silent","--show-error","--max-time","10","--http1.1","-o","/dev/null","-w","%{http_code}","-X","PATCH",
        "-H","Connection: close","-H","Content-Type: application/json"];
      if (origin) args.push("-H",`Origin: ${origin}`);
      if (authenticated) args.push("-b",`${sessionCookie}=${"b".repeat(64)}`);
      if (viewer) args.push("-H",`X-Customer-Viewer: ${viewer}`);
      return Number(execFileSync("curl",[...args,"--data",JSON.stringify(data),profile],{encoding:"utf8"}));
    }
    assert.equal(profileStatus({displayName:"Invitado"},{authenticated:false}),401);
    assert.equal(profileStatus({displayName:"CSRF"},{origin:"https://example.invalid"}),403);
    assert.equal(profileStatus({displayName:"CSRF"},{origin:null}),403);
    for (const data of [{displayName:" "},{displayName:"ñ".repeat(161)},{displayName:"Válido",email:"otro@example.test"}]) {
      assert.equal(profileStatus(data),400);
    }
    assert.equal(profileStatus({displayName:"Cuenta incorrecta"},{viewer:"qa-other"}),409);
    await setCustomer(context,"b");
    await visit(page,"/cuenta/datos");
    await page.getByRole("button",{name:/Editar nombre|^Editar$/}).click();
    await page.getByRole("textbox",{name:/Nombre/}).fill("  María Ñandú 🌮  ");
    page.once("dialog",dialog=>void dialog.dismiss());
    await page.getByRole("navigation",{name:"Navegación de la app"}).getByRole("link",{name:"Menú",exact:true}).click();
    assert.equal(new URL(page.url()).pathname,"/cuenta/datos");
    assert.equal(await page.getByRole("textbox",{name:/Nombre/}).inputValue(),"  María Ñandú 🌮  ");
    let patches = 0;
    await page.route("**/api/customer/profile",async route => {
      patches++;
      const response=await route.fetch();
      assert.equal(response.status(),200);
      await route.abort("failed");
    },{times:1});
    await page.getByRole("button",{name:/Guardar/}).click();
    await page.getByText("Nombre actualizado.",{exact:true}).waitFor();
    assert.equal(patches,1);
    await visit(page,"/cuenta");
    await page.getByRole("heading",{name:"María Ñandú 🌮",exact:true}).waitFor();
    await visit(page,"/cuenta/direcciones");
    await page.getByRole("button",{name:/Agregar dirección/}).click();
    await page.getByRole("textbox",{name:/Etiqueta/}).fill("Trabajo QA");
    await page.getByRole("textbox",{name:"Dirección",exact:true}).fill("Calle de prueba 23");
    await page.getByRole("button",{name:/Guardar dirección/}).click();
    await page.getByText("Trabajo QA",{exact:true}).waitFor();
    const address = page.getByRole("article").filter({hasText:"Trabajo QA"});
    await address.getByRole("button",{name:/Editar/}).click();
    await page.getByRole("textbox",{name:"Dirección",exact:true}).fill("Calle de prueba 24");
    await page.getByRole("button",{name:/Actualizar dirección|Guardar dirección/}).click();
    await address.getByText("Calle de prueba 24",{exact:true}).waitFor();
    await menu(page);
    await addTaco(page);
    await modal(page).getByRole("button",{name:/Agregar al pedido/}).click();
    await cart(page);
    await modal(page).getByRole("button",{name:"Continuar con tus datos"}).click();
    assert.equal(await modal(page).getByRole("textbox",{name:/Nombre para el pedido/}).inputValue(),"María Ñandú 🌮");
    await modal(page).getByRole("radio",{name:/Delivery/}).check();
    await modal(page).getByRole("combobox",{name:"Dirección guardada"}).getByRole("option",{name:/Trabajo QA.*Calle de prueba 24/}).waitFor({state:"attached"});
    await goBackToMenu(page);
    // A saved pickup may restore its unchanged default. A newer profile name cannot alter the old fingerprint.
    const savedLines = await page.evaluate(() => JSON.parse(sessionStorage.getItem("taco-loco-selection") ?? "[]"));
    const recovery = {
      reference:"qa-existing-recovery-only",
      ownerId:"qa-customer",
      fingerprint:createHash("sha256").update(JSON.stringify({
        customerName:"María Ñandú 🌮",fulfillment:"PICKUP",deliveryAddress:null,deliveryReference:null,transferHolderName:null,
        lines:savedLines.map(({productId,quantity,modifiers})=>({productId,quantity,modifiers})),
      })).digest("hex"),
    };
    await page.evaluate(value=>sessionStorage.setItem("taco-loco-checkout-intent",JSON.stringify(value)),recovery);
    await page.reload();
    await cart(page);
    await modal(page).getByRole("button",{name:"Continuar con tus datos"}).click();
    const nameBox=modal(page).getByRole("textbox",{name:/Nombre para el pedido/});
    await page.waitForFunction(()=>document.querySelector(".checkout-name input")?.value==="María Ñandú 🌮");
    assert.equal(await nameBox.inputValue(),"María Ñandú 🌮");
    assert.equal((await context.request.patch(profile,{headers,data:{displayName:"Nombre nuevo"}})).status(),200);
    await page.reload();
    await cart(page);
    await modal(page).getByRole("button",{name:"Continuar con tus datos"}).click();
    await modal(page).getByRole("button",{name:"Recuperar intento"}).waitFor();
    assert.equal(await nameBox.inputValue(),"");
    const savedRecovery=await page.evaluate(()=>JSON.parse(sessionStorage.getItem("taco-loco-checkout-intent")));
    assert.deepEqual(savedRecovery,recovery);
    await page.evaluate(()=>sessionStorage.removeItem("taco-loco-checkout-intent"));
    assert.equal((await context.request.patch(profile,{headers,data:{displayName:"María Ñandú 🌮"}})).status(),200);
    await goBackToMenu(page);
    await visit(page,"/cuenta/direcciones");
    await page.getByText("Trabajo QA",{exact:true}).waitFor();
    page.once("dialog",dialog=>void dialog.accept());
    await page.getByRole("article").filter({hasText:"Trabajo QA"}).getByRole("button",{name:/Eliminar/}).click();
    await page.getByText("Trabajo QA",{exact:true}).waitFor({state:"hidden"});
    assert.equal((await context.request.delete(filteredUrl("/api/customer/preferences/qa-home-b"),{headers})).status(),404);
    await visit(page,"/cuenta/favoritos");
    await page.getByText("QA Taco",{exact:true}).waitFor();
    await page.getByRole("button",{name:/Quitar favorito|^Quitar$/}).click();
    await page.getByText("QA Taco",{exact:true}).waitFor({state:"hidden"});
    let preferenceRequests=0;
    page.on("request",r=>{if(new URL(r.url()).pathname==="/api/customer/preferences"&&r.method()==="GET") preferenceRequests++;});
    await menu(page);
    const favorites=page.getByRole("article").filter({has:page.getByRole("heading",{name:"QA Taco",exact:true})}).getByRole("button",{name:/Guardar/});
    await favorites.nth(1).waitFor();
    assert.equal(preferenceRequests,1);
    await favorites.first().click();
    const starred=page.getByRole("article").filter({has:page.getByRole("heading",{name:"QA Taco",exact:true})}).getByRole("button",{name:/Favorito/});
    await starred.nth(1).waitFor();
    assert.equal(await starred.count(),2);
    await visit(page,"/cuenta");
    await page.getByRole("button",{name:"Cerrar sesión",exact:true}).click();
    await page.getByText("Sesión cerrada.",{exact:true}).waitFor();
    await page.goBack();
    assert.equal((await context.request.get(filteredUrl("/api/customer/auth/session"))).status(),401);
    await visit(page,"/cuenta/datos");
    assert.equal(await page.getByText("customer@example.com",{exact:true}).count(),0);
    await setCustomer(context,"d");
    await visit(page,"/cuenta");
    await page.getByRole("heading",{name:"María Ñandú 🌮",exact:true}).waitFor();
    await setCustomer(context,"c");
    assert.equal((await context.request.put(filteredUrl(`/api/customer/favorites/${product}`),{headers:{...headers,"x-customer-viewer":"qa-customer"},data:{favorite:true}})).status(),409);
    await visit(page,"/cuenta/favoritos");
    await page.getByText("Limonada QA",{exact:true}).waitFor();
    assert.equal(await page.getByText("QA Taco",{exact:true}).count(),0);
    // The first A session was revoked above; use A's second synthetic session.
    await setCustomer(context,"d");
    let releaseOld;
    let oldCaptured;
    const captured = new Promise(resolve => { oldCaptured=resolve; });
    const gate = new Promise(resolve => { releaseOld=resolve; });
    await page.route("**/api/customer/preferences", async route => {
      const old = await route.fetch();
      assert.equal((await old.json()).viewerId,"qa-customer");
      oldCaptured();
      await gate;
      await route.fulfill({response:old}).catch(()=>{});
    },{times:1});
    await page.goto(filteredUrl("/cuenta/favoritos"));
    let captureTimeout;
    try {
      await Promise.race([captured,new Promise((_,reject)=>{captureTimeout=setTimeout(()=>reject(new Error("Old favorites response was not intercepted")),10000);})]);
    } finally { clearTimeout(captureTimeout); }
    await setCustomer(context,"c");
    await page.evaluate(()=>{
      const channel=new BroadcastChannel("taco-loco-customer-session");
      channel.postMessage("changed"); channel.close();
    });
    releaseOld();
    await page.getByText("Limonada QA",{exact:true}).waitFor();
    assert.equal(await page.getByText("QA Taco",{exact:true}).count(),0);
    report.functional.push("strict profile auth and CSRF", "name reconciles lost response and appears in next purchase", "address CRUD and cross-account rejection", "favorites single request, synchronized duplicate cards and ownership", "logout and protected profile");
    await context.close();
  }
  await writeFile(join(output,"report.json"), JSON.stringify(report,null,2));
  console.log(`${mode}: ${report.views.length} captures; ${report.functional.length} functional scenarios.`);
} finally { await browser.close(); }
