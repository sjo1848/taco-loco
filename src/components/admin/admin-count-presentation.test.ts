import { describe, expect, it } from "vitest";
import { adminCountPresentation, createCountRequestGate } from "./admin-count-presentation";

describe("admin counts presentation", () => {
  it("never treats an unknown or failed count as zero, then recovers after retry", () => {
    const loading = adminCountPresentation(false, false, false, 0);
    expect(loading).toMatchObject({ available: false, attentionLabel: "Consultando pedidos", attentionCount: "—" });

    const failed = adminCountPresentation(false, true, false, 0);
    expect(failed).toMatchObject({ available: false, attentionLabel: "No pudimos comprobar los pedidos", attentionCount: "—" });

    const retrying = adminCountPresentation(false, false, false, 0);
    expect(retrying.available).toBe(false);

    const recovered = adminCountPresentation(true, false, false, 52);
    expect(recovered).toMatchObject({ available: true, attentionLabel: "Necesitan atención", attentionCount: "52" });
    expect(adminCountPresentation(true, false, false, 0).attentionLabel).toBe("Todo al día");
  });

  it("hides a stale count after a later failure or expired session", () => {
    expect(adminCountPresentation(true, true, false, 52).attentionCount).toBe("—");
    expect(adminCountPresentation(true, false, true, 52).attentionCount).toBe("—");
    expect(adminCountPresentation(true, false, true, 52).attentionLabel).toBe("Sesión vencida");
  });

  it("ignores a late count response or failure after a newer request starts", () => {
    const gate = createCountRequestGate();
    const oldRequest = gate.next();
    const retry = gate.next();
    expect(gate.isCurrent(oldRequest)).toBe(false);
    expect(gate.isCurrent(retry)).toBe(true);
    const reconcile = gate.next();
    expect(gate.isCurrent(retry)).toBe(false);
    expect(gate.isCurrent(reconcile)).toBe(true);
  });
});
