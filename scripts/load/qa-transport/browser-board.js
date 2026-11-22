async page => {
  const path = '**/api/admin/orders/aaaaaaaa-93aa-4aaa-aaaa-aaaaaaaaaaaa';
  await page.unroute(path);
  let writes=0, reads=0, upstream=0;
  await page.route(path, async route => {
    if (route.request().method() === 'GET') { reads++; return route.continue(); }
    if (route.request().method() !== 'PATCH') return route.continue();
    writes++;
    const response = await route.fetch({ maxRetries: 0 });
    upstream = response.status();
    await route.abort('connectionreset');
  });
  const button = page.getByRole('button', {name:'Marcar entregado',exact:true});
  await button.click({timeout:10000});
  const end=Date.now()+12000;
  while ((!upstream || !reads) && Date.now()<end) await new Promise(resolve=>setTimeout(resolve,50));
  await button.waitFor({state:'hidden',timeout:15000});
  if (writes !== 1 || reads === 0 || upstream !== 200) throw new Error(JSON.stringify({writes,reads,upstream}));
  await page.reload();
  await page.getByRole('heading', {name:'Pedidos', exact:true}).waitFor();
  if (await button.count() !== 0 || writes !== 1) throw new Error('order reappeared or mutation replayed');
  return {writes,reads,upstream,deliveredAfterReload:true};
}
