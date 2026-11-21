import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks=vi.hoisted(()=>({count:vi.fn(),findMany:vi.fn(),findUnique:vi.fn(),queryRaw:vi.fn(), isD1Runtime:false}));
vi.mock("@/lib/db",()=>({db:{order:{count:dbMocks.count,findMany:dbMocks.findMany,findUnique:dbMocks.findUnique}},queryD1Raw:dbMocks.queryRaw}));
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
 it("uses one conditional aggregate for D1 operational counts without changing count meanings",async()=>{
  dbMocks.isD1Runtime=true;
  dbMocks.queryRaw.mockResolvedValueOnce([{start:BigInt(11),preparing:BigInt(12),ready:BigInt(13),verification:BigInt(14),unconfirmed:BigInt(15),incidents:BigInt(16),attention:BigInt(17)}]);
  const result=await orderRepository.operationalCounts();
  expect(result).toEqual({start:11,preparing:12,ready:13,verification:14,unconfirmed:15,incidents:16,attention:17});
  expect(dbMocks.queryRaw).toHaveBeenCalledTimes(1);
  expect(dbMocks.queryRaw.mock.calls[0]?.[0].join(" ")).toContain('FROM "Order"');
  expect(dbMocks.queryRaw.mock.calls[0]?.[0].join(" ")).toContain('"refundStatus" = \'REQUIRED\' OR "paymentStatus" = \'REJECTED\'');
  expect(dbMocks.count).not.toHaveBeenCalled();
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
 it("reclassifies the business-day boundary at Argentina midnight",async()=>{
  dbMocks.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
  await orderRepository.listAttention("all","today",null,30,new Date("2026-11-14T02:59:59.999Z"));
  await orderRepository.listAttention("all","today",null,30,new Date("2026-11-14T03:00:00.001Z"));
  expect(dbMocks.findMany.mock.calls[0]?.[0].where.createdAt).toEqual({gte:new Date("2026-11-13T03:00:00.000Z"),lt:new Date("2026-11-14T03:00:00.000Z")});
  expect(dbMocks.findMany.mock.calls[1]?.[0].where.createdAt).toEqual({gte:new Date("2026-11-14T03:00:00.000Z"),lt:new Date("2026-11-15T03:00:00.000Z")});
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
 it("uses one D1 aggregation for attention and binds Buenos Aires day boundaries",async()=>{
  dbMocks.isD1Runtime=true;
  dbMocks.queryRaw.mockResolvedValueOnce([{all:BigInt(10),verification:BigInt(6),unconfirmed:BigInt(7),incidents:BigInt(2),today:BigInt(3),previous:BigInt(4)}]);
  const now=new Date("2026-11-14T16:00:00Z");
  const counts=await orderRepository.attentionCounts("verification",now);
  expect(counts).toEqual({all:10,verification:6,unconfirmed:7,incidents:2,buckets:{today:3,previous:4}});
  expect(dbMocks.queryRaw).toHaveBeenCalledTimes(1);
  expect(dbMocks.queryRaw.mock.calls[0]?.slice(1)).toEqual([
   new Date("2026-11-14T03:00:00.000Z"), new Date("2026-11-15T03:00:00.000Z"), "verification",
   new Date("2026-11-14T03:00:00.000Z"), "verification",
  ]);
  expect(dbMocks.queryRaw.mock.calls[0]?.[0].join(" ")).toContain('"status" = \'RECEIVED\'');
  expect(dbMocks.queryRaw.mock.calls[0]?.[0].join(" ")).toContain('"verificationStatus" = \'PENDING\'');
  expect(dbMocks.count).not.toHaveBeenCalled();
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
 it("loads only the fields required by an administrative live event",async()=>{
  const snapshot={id:"order-1",orderNumber:21,status:"READY",fulfillment:"PICKUP",verificationStatus:"VERIFIED",paymentStatus:"NOT_REQUIRED",refundStatus:"NOT_REQUIRED",source:"PUBLIC_MENU",customerName:"Synthetic",customerPhone:null,totalAmount:1200,createdAt:new Date("2026-11-15T12:00:00Z"),lines:[{quantity:2,productName:"Taco",modifiersSnapshot:null,note:null}]};
  dbMocks.findUnique.mockResolvedValueOnce(snapshot);
  await expect(orderRepository.findForLiveEvent("order-1")).resolves.toBe(snapshot);
  expect(dbMocks.findUnique).toHaveBeenCalledWith({where:{id:"order-1"},select:{
   id:true,orderNumber:true,status:true,fulfillment:true,verificationStatus:true,paymentStatus:true,refundStatus:true,
   source:true,customerName:true,customerPhone:true,totalAmount:true,createdAt:true,
   lines:true,
  }});
 });
});
