import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
const mocks=vi.hoisted(()=>({requireAdmin:vi.fn(),counts:vi.fn(),list:vi.fn()}));
vi.mock("@/modules/auth/session",()=>({requireAdmin:mocks.requireAdmin}));
vi.mock("@/modules/orders/repository",()=>({orderRepository:{operationalCounts:mocks.counts,listOperational:mocks.list}}));
import {GET} from "./route";
beforeEach(()=>{mocks.requireAdmin.mockResolvedValue({id:"admin-test"});mocks.counts.mockResolvedValue({start:0,preparing:0,ready:0,verification:0,unconfirmed:0,incidents:0,attention:0});mocks.list.mockResolvedValue({orders:[],nextCursor:null})});
afterEach(()=>vi.resetAllMocks());
describe("GET admin operations",()=>{
 it("requires an authenticated admin before reading queue data",async()=>{mocks.requireAdmin.mockRejectedValue(new Error("UNAUTHORIZED"));const response=await GET(new Request("https://example.test/api/admin/orders/operations"));expect(response.status).toBe(401);expect(mocks.list).not.toHaveBeenCalled()});
 it("rejects unknown queues and returns private no-store cursor pages",async()=>{expect((await GET(new Request("https://example.test/api/admin/orders/operations?queue=all"))).status).toBe(400);mocks.list.mockResolvedValue({orders:[{id:"order"}],nextCursor:{createdAt:"2026-11-14T10:00:00.000Z",id:"b4fa38aa-1c2e-4f31-8d54-19e8398ff723"}});const response=await GET(new Request("https://example.test/api/admin/orders/operations?queue=ready"));expect(response.status).toBe(200);expect(response.headers.get("cache-control")).toContain("no-store");const body=await response.json();expect(body.orders).toHaveLength(1);expect(body.nextCursor).toBeTruthy();expect(mocks.list).toHaveBeenCalledWith("ready",null)});
 it("reports infrastructure errors as server failures instead of invalid cursors",async()=>{mocks.list.mockRejectedValue(new Error("database unavailable"));const response=await GET(new Request("https://example.test/api/admin/orders/operations?queue=start"));expect(response.status).toBe(500);expect(await response.json()).toEqual({code:"INTERNAL_ERROR"})});
});
