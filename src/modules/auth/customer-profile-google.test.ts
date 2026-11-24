import { beforeEach, describe, expect, it, vi } from "vitest";

const stubs = vi.hoisted(() => ({
  d1: true, session: vi.fn(), createD1: vi.fn(), identity: vi.fn(), create: vi.fn(),
  createIdentity: vi.fn(), find: vi.fn(), update: vi.fn(), transaction: vi.fn(),
}));
vi.mock("@/lib/runtime", () => ({ get isD1Runtime() { return stubs.d1; } }));
vi.mock("@/lib/db", () => ({ db: {
  customerIdentity: { findUnique: stubs.identity, create: stubs.createIdentity },
  customer: { create: stubs.create, findUnique: stubs.find, update: stubs.update },
  $transaction: stubs.transaction,
} }));
vi.mock("@/modules/auth/customer-session", () => ({ createCustomerSession: stubs.session }));
vi.mock("@/modules/auth/d1-customer-atomic.worker", () => ({ createD1CustomerIdentity: stubs.createD1 }));
import { signInWithGoogle } from "./customer-service";

const google = { subject: "synthetic-subject", email: "google@example.test", displayName: "Nombre Google", avatarUrl: "https://lh3.googleusercontent.com/example" };
const edited = { id: "qa-owner", displayName: "Nombre editado", active: true };

describe.each([true, false])("customer name ownership when D1 is %s", (d1) => {
  beforeEach(() => {
    vi.resetAllMocks();
    stubs.d1 = d1;
    stubs.update.mockResolvedValue(edited);
  });

  it("initializes a new profile with the verified name", async () => {
    stubs.identity.mockResolvedValue(null);
    await signInWithGoogle(google);
    const create = d1 ? stubs.createD1.mock.calls[0][0] : stubs.create.mock.calls[0][0].data;
    expect(create).toMatchObject({ displayName: google.displayName, email: google.email, avatarUrl: google.avatarUrl });
  });

  it("preserves a name edited since registration on the next login", async () => {
    stubs.identity.mockResolvedValue({ customerId: edited.id, customer: edited });
    await expect(signInWithGoogle(google)).resolves.toMatchObject(edited);
    expect(stubs.update.mock.calls[0][0].data).toMatchObject({ email: google.email, avatarUrl: google.avatarUrl });
    expect(stubs.update.mock.calls[0][0].data).not.toHaveProperty("displayName");
    expect(stubs.session).toHaveBeenCalledWith(edited.id);
  });

  it("preserves the winner's profile when identity creation races", async () => {
    stubs.identity.mockResolvedValueOnce(null).mockResolvedValueOnce({ customerId: edited.id });
    stubs.find.mockResolvedValue(edited);
    (d1 ? stubs.createD1 : stubs.transaction).mockRejectedValueOnce(new Error("UNIQUE constraint failed"));
    await expect(signInWithGoogle(google)).resolves.toMatchObject(edited);
    expect(stubs.update.mock.calls[0][0].data).not.toHaveProperty("displayName");
    expect(stubs.session).toHaveBeenCalledWith(edited.id);
  });
});
