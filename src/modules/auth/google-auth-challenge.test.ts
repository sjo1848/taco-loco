import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  create: vi.fn(),
  updateMany: vi.fn(),
  findMany: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: { googleAuthChallenge: { create: state.create, updateMany: state.updateMany, findMany: state.findMany, deleteMany: state.deleteMany } } }));

import { consumeGoogleAuthChallenge, issueGoogleAuthChallenge } from "./google-auth-challenge";

describe("Google auth challenge", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores only a hashed challenge with an expiry", async () => {
    state.create.mockResolvedValue({});
    state.findMany.mockResolvedValue([]);
    const nonce = await issueGoogleAuthChallenge();
    expect(nonce).toMatch(/^[0-9a-f]{64}$/);
    expect(state.create).toHaveBeenCalledOnce();
    const data = state.create.mock.calls[0][0].data;
    expect(data.nonceHash).toMatch(/^[0-9a-f]{64}$/);
    expect(data.nonceHash).not.toBe(nonce);
    expect(data.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("cleans at most the selected stale challenge ids before issuing", async () => {
    state.findMany.mockResolvedValue([{ id: "stale-1" }, { id: "stale-2" }]);
    state.deleteMany.mockResolvedValue({ count: 2 });
    state.create.mockResolvedValue({});
    await issueGoogleAuthChallenge();
    expect(state.findMany.mock.calls[0][0].take).toBe(100);
    expect(state.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["stale-1", "stale-2"] } } });
  });

  it("accepts exactly one database winner", async () => {
    state.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const first = await consumeGoogleAuthChallenge("a".repeat(64));
    const second = await consumeGoogleAuthChallenge("a".repeat(64));
    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(state.updateMany).toHaveBeenCalledTimes(2);
    expect(state.updateMany.mock.calls[0][0].where.consumedAt).toBeNull();
  });
});
