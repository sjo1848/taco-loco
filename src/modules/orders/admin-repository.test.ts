import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks=vi.hoisted(()=>({count:vi.fn(),findMany:vi.fn(), isD1Runtime:false}));
vi.mock("@/lib/db",()=>({db:{order:{count:dbMocks.count,findMany:dbMocks.findMany}}}));
vi.mock("@/lib/runtime",()=>({get isD1Runtime(){return dbMocks.isD1Runtime}}));
import { orderRepository } from "./repository";

beforeEach(()=>{vi.clearAllMocks();dbMocks.isD1Runtime=false});

describe("admin operational reads",()=>{
 it("counts complete indexed queues and unique attention conditions",async()=>{
  dbMocks.count.mockResolvedValueOnce(11).mockResolvedValueOnce(12).mockResolvedValueOnce(13).mockResolvedValueOnce(14).mockResolvedValueOnce(15).mockResolvedValueOnce(16).mockResolvedValueOnce(17);
  const result=await orderRepository.operationalCounts();
  expect(result).toEqual({start:11,preparing:12,ready:13,verification:14,unconfirmed:15,incidents:16,attention:17});
  expect(dbMocks.count).toHaveBeenCalledTimes(7);
  expect(dbMocks.count.mock.calls.at(-1)?.[0].where.OR).toHaveLength(4);
  expect(dbMocks.count.mock.calls[0]?.[0].where.status).toBe("CONFIRMED");
 });
 it("queries only eligible tickets in oldest-first keyset order and exposes load-more cursor",async()=>{
  const createdAt=new Date("2026-11-14T10:00:00Z");
  dbMocks.findMany.mockResolvedValueOnce(Array.from({length:4},(_,i)=>({id:`id-${i}`,createdAt:new Date(createdAt.getTime()+i),orderNumber:i+1,lines:[]})));
  const result=await orderRepository.listOperational("preparing",null,3);
  expect(dbMocks.findMany).toHaveBeenCalledWith(expect.objectContaining({take:4,orderBy:[{createdAt:"asc"},{id:"asc"}],where:expect.objectContaining({status:"IN_PREPARATION",verificationStatus:"VERIFIED",paymentStatus:{in:["NOT_REQUIRED","CONFIRMED"]}})}));
  expect(result.orders).toHaveLength(3);
  expect(result.hasMore).toBe(true);
  expect(result.nextCursor).toEqual({createdAt:new Date(createdAt.getTime()+2).toISOString(),id:"id-2"});
 });
 it("prioritizes the current Buenos Aires business day and pages newest-first",async()=>{
  dbMocks.findMany.mockResolvedValueOnce(Array.from({length:31},(_,i)=>({id:`old-${i}`,createdAt:new Date(2000,0,i+1),orderNumber:i,lines:[]})));
  const page=await orderRepository.listAttention("all","today",null,30,new Date("2026-11-14T16:00:00Z"));
  const args=dbMocks.findMany.mock.calls[0]?.[0];
  expect(args.take).toBe(31);
  expect(args.orderBy).toEqual([{createdAt:"desc"},{id:"desc"}]);
  expect(args.where.OR).toHaveLength(4);
  expect(args.where.createdAt.gte.toISOString()).toBe("2026-11-14T03:00:00.000Z");
  expect(args.where.createdAt.lt.toISOString()).toBe("2026-11-15T03:00:00.000Z");
  expect(page.orders).toHaveLength(30);
  expect(page.hasMore).toBe(true);
 });
 it("pages historical pending cases independently of current-day new orders",async()=>{
  dbMocks.findMany.mockResolvedValueOnce(Array.from({length:31},(_,i)=>({id:`historic-${i}`,createdAt:new Date(Date.UTC(2026,10,13-i,10)),orderNumber:i,lines:[]})));
  const page=await orderRepository.listAttention("all","previous",null,30,new Date("2026-11-14T16:00:00Z"));
  const args=dbMocks.findMany.mock.calls[0]?.[0];
  expect(args.where.createdAt).toEqual({lt:new Date("2026-11-14T03:00:00.000Z")});
  expect(page.orders).toHaveLength(30);
  expect(page.hasMore).toBe(true);
  expect(page.nextCursor?.createdAt).toBe(page.orders.at(-1)?.createdAt.toISOString());
 });
 it("returns global category counts and independent day-bucket counts",async()=>{
  dbMocks.count.mockResolvedValueOnce(105).mockResolvedValueOnce(96).mockResolvedValueOnce(32).mockResolvedValueOnce(7).mockResolvedValueOnce(9).mockResolvedValueOnce(98);
  const counts=await orderRepository.attentionCounts("verification",new Date("2026-11-14T16:00:00Z"));
  expect(counts).toEqual({all:105,verification:96,unconfirmed:32,incidents:7,buckets:{today:9,previous:98}});
  expect(dbMocks.count.mock.calls.at(-2)?.[0].where).toEqual({verificationStatus:"PENDING",createdAt:{gte:new Date("2026-11-14T03:00:00.000Z"),lt:new Date("2026-11-15T03:00:00.000Z")}});
  expect(dbMocks.count.mock.calls.at(-1)?.[0].where).toEqual({verificationStatus:"PENDING",createdAt:{lt:new Date("2026-11-14T03:00:00.000Z")}});
 });
 it("keeps search and date/status/fulfillment filters conjunctive with cursor paging",async()=>{
  dbMocks.findMany.mockResolvedValueOnce([]);
  await orderRepository.listHistory({cursor:{createdAt:new Date("2026-11-01T00:00:00Z"),id:"cursor-id"},from:new Date("2026-11-01T03:00:00Z"),to:new Date("2026-11-02T02:59:59.999Z"),status:"DELIVERED",fulfillment:"DELIVERY",query:"TL-42",take:20});
  const args=dbMocks.findMany.mock.calls[0]?.[0];
  expect(args.take).toBe(21);
  expect(args.where.status).toBe("DELIVERED");
  expect(args.where.fulfillment).toBe("DELIVERY");
  expect(args.where.createdAt.gte.toISOString()).toBe("2026-11-01T03:00:00.000Z");
  expect(args.where.OR).toEqual([{customerName:{contains:"TL-42",mode:"insensitive"}},{customerPhone:{contains:"TL-42",mode:"insensitive"}},{orderNumber:42}]);
  expect(args.where.AND[0].OR).toHaveLength(2);
  expect(args.orderBy).toEqual([{createdAt:"desc"},{id:"desc"}]);
 });
 it("omits PostgreSQL-only insensitive mode from history search on D1/SQLite",async()=>{
  dbMocks.isD1Runtime=true;
  dbMocks.findMany.mockResolvedValueOnce([]);
  await orderRepository.listHistory({cursor:null,query:"TL-92"});
  const args=dbMocks.findMany.mock.calls[0]?.[0];
  expect(args.where.OR).toEqual([{customerName:{contains:"TL-92"}},{customerPhone:{contains:"TL-92"}},{orderNumber:92}]);
 });
 it("omits PostgreSQL-only insensitive mode from legacy order search on D1/SQLite",async()=>{
  dbMocks.isD1Runtime=true;
  dbMocks.findMany.mockResolvedValueOnce([]);
  await orderRepository.list({query:"TL-92"});
  const args=dbMocks.findMany.mock.calls[0]?.[0];
  expect(args.where.OR).toEqual([{customerName:{contains:"TL-92"}},{customerPhone:{contains:"TL-92"}},{orderNumber:92}]);
 });
});
