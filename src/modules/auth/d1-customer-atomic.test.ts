import { describe, expect, it } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import { createD1CustomerIdentityWith } from "./d1-customer-atomic";

function fakeD1(reject = false) {
  const sql: string[] = [];
  const db = {
    prepare(statement: string) {
      sql.push(statement);
      return { bind: (...values: unknown[]) => { void values; return { statement }; } };
    },
    async batch(statements: Array<{ statement: string }>) {
      return statements.map(() => ({ success: !reject })) as never;
    },
  } as unknown as D1Database;
  return { db, sql };
}

describe("D1 customer identity atomic writer", () => {
  it("creates customer and Google identity in one batch", async () => {
    const { db, sql } = fakeD1();
    await createD1CustomerIdentityWith(db, { customerId: "customer-1", identityId: "identity-1", provider: "google", providerSubject: "sub-1", email: "a@example.com", displayName: "A", avatarUrl: null });
    expect(sql).toHaveLength(2);
    expect(sql[0]).toContain('INSERT INTO "Customer"');
    expect(sql[1]).toContain('INSERT INTO "CustomerIdentity"');
  });

  it("fails the whole identity write when the D1 batch reports failure", async () => {
    const { db } = fakeD1(true);
    await expect(createD1CustomerIdentityWith(db, { customerId: "customer-1", identityId: "identity-1", provider: "google", providerSubject: "sub-1", email: "a@example.com", displayName: null, avatarUrl: null })).rejects.toThrow("D1_CUSTOMER_IDENTITY_FAILED");
  });
});
