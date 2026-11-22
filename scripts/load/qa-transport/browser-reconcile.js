async page => {
  const routePattern = '**/api/admin/orders/aaaaaaaa-93aa-4aaa-aaaa-aaaaaaaaaaaa';
  const seen = { patches: 0, reads: 0, upstream: [], replayButtonWrites: 0 };
  let scenario = 'after-commit';
  let capturedError;
  await page.route(routePattern, async route => {
    if (route.request().method() === 'GET') { seen.reads++; await route.continue(); return; }
    if (route.request().method() !== 'PATCH') { await route.continue(); return; }
    seen.patches++;
    if (scenario === 'before-commit') { await route.abort('connectionreset'); return; }
    if (scenario === 'after-commit') {
      try {
        const response = await route.fetch({ maxRetries: 0 });
        seen.upstream.push(response.status());
        if (response.status() !== 200) capturedError='upstream mutation failed';
      } catch { capturedError='upstream request failed'; }
      await route.abort('connectionreset');
      return;
    }
    await route.continue();
  });
  await page.getByRole('button', { name: 'Iniciar preparación', exact: true }).click({ timeout: 10000 });
  await page.getByRole('button', { name: 'Marcar listo', exact: true }).waitFor({ timeout: 20000 });
  if (capturedError || seen.patches !== 1 || seen.reads < 1 || JSON.stringify(seen.upstream) !== '[200]') throw new Error(capturedError ?? JSON.stringify(seen));
  const readAfterCommit = seen.reads;
  scenario = 'before-commit';
  await page.getByRole('button', { name: 'Marcar listo', exact: true }).click({ timeout: 10000 });
  await page.getByRole('button', { name: 'Verificar para reintentar', exact: true }).waitFor({ timeout: 20000 });
  if (seen.patches !== 2 || seen.reads <= readAfterCommit) throw new Error('expected guarded read after failed write');
  const readBeforeVerification = seen.reads;
  await page.getByRole('button', { name: 'Verificar para reintentar', exact: true }).click();
  await page.getByRole('button', { name: 'Marcar listo', exact: true }).waitFor({ timeout: 10000 });
  seen.replayButtonWrites = seen.patches - 2;
  if (seen.replayButtonWrites !== 0 || seen.reads <= readBeforeVerification) throw new Error('verification sent a mutation or failed to read');
  scenario='normal';
  await page.getByRole('button', { name: 'Marcar listo', exact: true }).click({ timeout: 10000 });
  await page.getByRole('button', { name: 'Marcar entregado', exact: true }).waitFor({ timeout: 20000 });
  if (seen.patches !== 3) throw new Error('unexpected number of PATCH attempts');
  await page.screenshot({ path: 'output/playwright/qa93-reconciled-ready.png' });
  return seen;
}
