import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrderActions } from "@/components/admin/OrderActions";
import { OrderConfirmation } from "@/components/admin/OrderConfirmation";
import { getCurrentAdmin } from "@/modules/auth/session";
import { availableTransitions, formatOrderNumber } from "@/modules/orders/model";
import { orderRepository } from "@/modules/orders/repository";
import { settingsService } from "@/modules/settings/service";
import { AppError } from "@/lib/errors";
export const dynamic="force-dynamic";
const labels:Record<string,string>={RECEIVED:"Recibido",CONFIRMED:"Confirmado",IN_PREPARATION:"En preparación",READY:"Listo",DELIVERED:"Entregado",CANCELLED:"Cancelado"};
const paymentLabels:Record<string,string>={NOT_REQUIRED:"No requiere transferencia",PENDING:"Pendiente",REPORTED:"Pago informado",CONFIRMED:"Confirmado",REJECTED:"Rechazado"};
const verificationLabels:Record<string,string>={PENDING:"Pendiente de verificación",VERIFIED:"Verificado",EXPIRED:"Cerrado",REJECTED:"Rechazado"};
const money=(n:number)=>`$${n.toLocaleString("es-AR")}`;
function modifiers(value:unknown){return Array.isArray(value)?value.map(x=>typeof x==="object"&&x&&"group" in x&&"option" in x?`${String(x.group)}: ${String(x.option)}`:"").filter(Boolean).join(" · "):""}
type Context={params:Promise<{id:string}>;searchParams?:Promise<{focus?:string;from?:string;back?:string}>};
export default async function OrderDetailPage(context:Context){
 const {id}=await context.params;if(!await getCurrentAdmin())redirect(`/admin/login?returnTo=${encodeURIComponent(`/admin/orders/${id}`)}`);
 let order;try{order=await orderRepository.findById(id)}catch(error){if(error instanceof AppError&&error.code==="ORDER_NOT_FOUND")notFound();throw error}
 const [settings,search]=await Promise.all([settingsService.get(),context.searchParams??Promise.resolve({})]);
 const mode=order.fulfillment==="PICKUP"?"Retiro":order.fulfillment==="DELIVERY"?"Delivery":"Consumo local";
 const historyBack=typeof search.back==="string"&&search.back.startsWith("/admin/orders/history")?search.back:null;
 const backHref=historyBack??(search.from==="attention"?"/admin/orders/attention":"/admin/orders");
 return <main className="admin-page admin-order-detail"><header className="admin-header"><div><p className="eyebrow">Pedido {formatOrderNumber(order.orderNumber)}</p><h1>{labels[order.status]}</h1></div><Link className="admin-button admin-button--secondary" href={backHref}>Volver</Link></header><p className="detail-created">Ingresó {order.createdAt.toLocaleString("es-AR")}</p>
 <div className="detail-sections">
  <section className="admin-panel detail-panel"><h2>Pedido</h2><div className="detail-lines">{order.lines.map((line:{id:string;quantity:number;productName:string;modifiersSnapshot:unknown;note:string|null;unitPriceAmount:number})=><article key={line.id}><div><strong>{line.quantity} × {line.productName}</strong>{modifiers(line.modifiersSnapshot)&&<small>{modifiers(line.modifiersSnapshot)}</small>}{line.note&&<small>Nota: {line.note}</small>}</div><strong>{money(line.unitPriceAmount*line.quantity)}</strong></article>)}</div>{order.notes&&<p className="detail-note"><strong>Observaciones</strong><br/>{order.notes}</p>}</section>
  <section className="admin-panel detail-panel"><h2>Cliente y entrega</h2><dl className="detail-grid"><div><dt>Nombre</dt><dd>{order.customerName||"Sin nombre"}</dd></div><div><dt>Modalidad</dt><dd>{mode}</dd></div><div><dt>Teléfono</dt><dd>{order.customerPhone||"Sin teléfono vinculado"}</dd></div>{order.fulfillment==="DELIVERY"&&<><div><dt>Dirección</dt><dd>{order.deliveryAddress||"Sin dirección"}</dd></div><div><dt>Referencia</dt><dd>{order.deliveryReference||"Sin referencia"}</dd></div></>}{order.fulfillment==="DINE_IN"&&<div><dt>Mesa</dt><dd>{order.tableLabel||"Sin mesa"}</dd></div>}</dl></section>
  <section className={`admin-panel detail-panel detail-payment${order.verificationStatus==="PENDING"||order.paymentStatus==="REPORTED"||search.focus==="verification"?" detail-payment--attention":""}`}><h2>Pago y total</h2><dl className="detail-grid"><div><dt>Subtotal</dt><dd>{money(order.subtotalAmount)}</dd></div><div><dt>Envío / ajuste</dt><dd>{money(order.deliveryFeeAmount||order.adjustmentAmount)}</dd></div><div><dt>Pago</dt><dd>{paymentLabels[order.paymentStatus]??order.paymentStatus}</dd></div><div><dt>Verificación</dt><dd>{verificationLabels[order.verificationStatus]??order.verificationStatus}</dd></div>{order.transferHolderName&&<div><dt>Titular informado</dt><dd>{order.transferHolderName}</dd></div>}</dl><p className="detail-total"><span>Total</span><strong>{money(order.totalAmount)}</strong></p></section>
  <OrderActions orderId={order.id} transitions={availableTransitions(order.status)} fulfillment={order.fulfillment} verificationStatus={order.verificationStatus} paymentStatus={order.paymentStatus} refundStatus={order.refundStatus} status={order.status} orderNumber={order.orderNumber} totalAmount={order.totalAmount} transferHolderName={order.transferHolderName}/>
  {order.status!=="RECEIVED"&&order.status!=="CANCELLED"&&<OrderConfirmation businessName={settings?.businessName??"Taco Loco"} orderNumber={order.orderNumber} totalAmount={order.totalAmount} customerName={order.customerName} customerPhone={order.customerPhone} fulfillment={order.fulfillment}/>}
  <details className="admin-panel order-timeline"><summary>Historial del pedido</summary>{order.events.map((event:{id:string;fromStatus:string|null;toStatus:string;actor:{email:string}|null;createdAt:Date;reason:string|null})=><article key={event.id}><div><strong>{event.fromStatus?`${labels[event.fromStatus]} → ${labels[event.toStatus]}`:labels[event.toStatus]}</strong><small>{event.actor?.email??"Menú público"} · {event.createdAt.toLocaleString("es-AR")}</small></div>{event.reason&&<p>{event.reason}</p>}</article>)}</details>
 </div></main>
}
