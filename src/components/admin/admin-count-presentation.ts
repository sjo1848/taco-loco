export function adminCountPresentation(loaded: boolean, error: boolean, sessionExpired: boolean, attention: number) {
  const available = loaded && !error && !sessionExpired;
  return {
    available,
    attentionLabel: sessionExpired ? "Sesión vencida" : available ? attention === 0 ? "Todo al día" : "Necesitan atención" : error ? "No pudimos comprobar los pedidos" : "Consultando pedidos",
    attentionCount: available ? String(attention) : "—",
  };
}

/** Keep count-only responses from replacing a newer queue or reconciliation snapshot. */
export function createCountRequestGate() {
  let latest = 0;
  return {
    next: () => ++latest,
    isCurrent: (request: number) => request === latest,
  };
}
