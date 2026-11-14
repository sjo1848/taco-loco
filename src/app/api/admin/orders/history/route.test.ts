import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
const mocks=vi.hoisted(()=>({requireAdmin:vi.fn(),listHistory:vi.fn()}));
vi.mock("@/modules/auth/session",()=>({requireAdmin:mocks.requireAdmin}));
vi.mock("@/modules/orders/repository",()=>({orderRepository:{listHistory:mocks.listHistory}}));
import {GET} from "./route";
beforeEach(()=>{mocks.requireAdmin.mockResolvedValue({id:"admin-test"});mocks.listHistory.mockResolvedValue({orders:[],hasMore:false,nextCursor:null})});
afterEach(()=>vi.resetAllMocks());
describe("GET admin order history",()=>{
 it("requires an admin session",async()=>{mocks.requireAdmin.mockRejectedValue(new Error("UNAUTHORIZED"));expect((await GET(new Request("https://example.test/api/admin/orders/history"))).status).toBe(401);expect(mocks.listHistory).not.toHaveBeenCalled()});
 it("rejects invalid date filters before querying",async()=>{expect((await GET(new Request("https://example.test/api/admin/orders/history?from=2026-02-30"))).status).toBe(400);expect(mocks.listHistory).not.toHaveBeenCalled()});
 it("maps business filters to a private cursor page",async()=>{const response=await GET(new Request("https://example.test/api/admin/orders/history?from=2026-11-14&to=2026-11-14&status=READY&fulfillment=PICKUP"));expect(response.status).toBe(200);expect(response.headers.get("cache-control")).toContain("no-store");expect(mocks.listHistory).toHaveBeenCalledWith(expect.objectContaining({status:"READY",fulfillment:"PICKUP",from:new Date("2026-11-14T03:00:00Z"),to:new Date("2026-11-15T02:59:59.999Z")}))});
 it("does not disguise database failures as invalid filters",async()=>{mocks.listHistory.mockRejectedValue(new Error("database unavailable"));const response=await GET(new Request("https://example.test/api/admin/orders/history"));expect(response.status).toBe(500);expect(await response.json()).toEqual({code:"INTERNAL_ERROR"})});
});
