import { afterEach,describe,expect,it,vi } from "vitest";
const mocks=vi.hoisted(()=>({findUnique:vi.fn(),findFirstOrThrow:vi.fn()}));
vi.mock("@/lib/db",()=>({db:{order:{findUnique:mocks.findUnique},orderEvent:{findFirstOrThrow:mocks.findFirstOrThrow}}}));
vi.mock("@/lib/runtime",()=>({isD1Runtime:false}));
import { createManualOrder } from "./service";
afterEach(()=>vi.resetAllMocks());
describe("manual order idempotency",()=>{
 it("returns the persisted order and original event for an identical admin retry",async()=>{
  const order={id:"order-stable",orderNumber:42,clientReference:"c2138b41-a767-4b2b-a779-437c608f4f1c",lines:[]};
  const event={id:"event-original",orderId:order.id,toStatus:"RECEIVED"};
  mocks.findUnique.mockResolvedValue(order);mocks.findFirstOrThrow.mockResolvedValue(event);
  const result=await createManualOrder({fulfillment:"PICKUP",adjustmentAmount:0,lines:[{productId:"11111111-1111-4111-8111-111111111111",quantity:1,modifiers:[]}]},"admin-id",order.clientReference);
  expect(result).toEqual({order,event,reused:true});
  expect(mocks.findUnique).toHaveBeenCalledWith({where:{clientReference:order.clientReference},include:{lines:true}});
  expect(mocks.findFirstOrThrow).toHaveBeenCalledTimes(1);
 });
 it("does not look up an existing order when the legacy caller has no key",async()=>{
  await expect(createManualOrder({fulfillment:"PICKUP",lines:[]},"admin-id")).rejects.toBeDefined();
  expect(mocks.findUnique).not.toHaveBeenCalled();
 });
});
