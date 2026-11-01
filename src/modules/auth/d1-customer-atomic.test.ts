import { describe, expect, it } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import { createD1CustomerIdentityWith, D1_CUSTOMER_IDENTITY_TRANSIENT } from "./d1-customer-atomic";

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

function concurrentUniqueD1() {
  const customerIds = new Set<string>();
  const identities = new Set<string>();
  const db = {
    prepare(statement: string) {
      return {
        bind: (...values: unknown[]) => ({ statement, values }),
      };
    },
    async batch(statements: Array<{ statement: string; values: unknown[] }>) {
      await Promise.resolve();
      const customer = statements[0].values[0] as string;
      const provider = statements[1].values[2] as string;
      const subject = statements[1].values[3] as string;
      const identityKey = `${provider}:${subject}`;
      if (identities.has(identityKey)) throw new Error("UNIQUE constraint failed: CustomerIdentity.provider_providerSubject");
      customerIds.add(customer);
      identities.add(identityKey);
      return statements.map(() => ({ success: true })) as never;
    },
  } as unknown as D1Database;
  return { db, customerIds, identities };
}

function busyD1() {
  const db = {
    prepare(statement: string) { return { bind: (...values: unknown[]) => ({ statement, values }) }; },
    async batch() { throw new Error("SQLITE_BUSY: database is locked"); },
  } as unknown as D1Database;
  return db;
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

  it("keeps one customer and one identity under concurrent same-subject creation", async () => {
    const { db, customerIds, identities } = concurrentUniqueD1();
    const input = { provider: "google", providerSubject: "same-subject", email: null, displayName: null, avatarUrl: null };
    const results = await Promise.allSettled([
      createD1CustomerIdentityWith(db, { ...input, customerId: "customer-a", identityId: "identity-a" }),
      createD1CustomerIdentityWith(db, { ...input, customerId: "customer-b", identityId: "identity-b" }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected" && result.reason instanceof Error && result.reason.message === "D1_CUSTOMER_IDENTITY_CONFLICT")).toHaveLength(1);
    expect(customerIds.size).toBe(1);
    expect(identities.size).toBe(1);
  });

  it("classifies SQLite busy as transient infrastructure failure", async () => {
    await expect(createD1CustomerIdentityWith(busyD1(), { customerId: "customer-busy", identityId: "identity-busy", provider: "google", providerSubject: "busy-subject", email: null, displayName: null, avatarUrl: null })).rejects.toThrow(D1_CUSTOMER_IDENTITY_TRANSIENT);
  });
});
