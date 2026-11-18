export function adminCountPresentation(loaded: boolean, error: boolean, sessionExpired: boolean, attention: number) {
  const available = loaded && !error && !sessionExpired;
  return {
    available,
    attentionLabel: available ? attention === 0 ? "Todo al día" : "Necesitan atención" : error ? "No pudimos comprobar los pedidos" : "Consultando pedidos",
    attentionCount: available ? String(attention) : "—",
  };
}
