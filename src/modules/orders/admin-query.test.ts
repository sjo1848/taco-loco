import { describe, expect, it } from "vitest";
import { businessDateBounds, decodeAdminCursor, encodeAdminCursor, parseAdminHistoryFilters } from "./admin-query";

describe("admin query cursor and business calendar",()=>{
 it("round trips a stable keyset cursor without changing its timestamp",()=>{
  const cursor={createdAt:"2026-11-14T14:10:00.000Z",id:"b4fa38aa-1c2e-4f31-8d54-19e8398ff723"};
  const encoded=encodeAdminCursor(cursor);
  expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  expect(decodeAdminCursor(encoded)).toEqual({createdAt:new Date(cursor.createdAt),id:cursor.id});
 });
 it("uses the Buenos Aires start and end of a selected calendar day",()=>{
  const {from,to}=businessDateBounds("2026-11-14","2026-11-14");
  expect(from?.toISOString()).toBe("2026-11-14T03:00:00.000Z");
  expect(to?.toISOString()).toBe("2026-11-15T02:59:59.999Z");
 });
 it("rejects malformed and reversed date ranges",()=>{
  expect(()=>businessDateBounds("2026-02-30",null)).toThrow("INVALID_DATE");
  expect(()=>businessDateBounds("2026-99-14",null)).toThrow("INVALID_DATE");
  expect(()=>businessDateBounds("2026-11-15","2026-11-14")).toThrow("INVALID_DATE_RANGE");
  expect(()=>decodeAdminCursor("not-a-cursor")).toThrow("INVALID_CURSOR");
 });
 it("parses history filters without widening the requested query",()=>{
  const filters=parseAdminHistoryFilters(new URLSearchParams("from=2026-11-01&to=2026-11-07&status=DELIVERED&fulfillment=DELIVERY&q=TL-0042"));
  expect(filters.status).toBe("DELIVERED");
  expect(filters.fulfillment).toBe("DELIVERY");
  expect(filters.query).toBe("TL-0042");
  expect(filters.from?.toISOString()).toBe("2026-11-01T03:00:00.000Z");
 });
});
