"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, ShieldAlert } from "lucide-react";
import { useAdminLiveEvents } from "@/components/admin/AdminShell";

type OrderStatus = "RECEIVED" | "CONFIRMED" | "IN_PREPARATION" | "READY" | "DELIVERED" | "CANCELLED";
type Queue = "start" | "preparing" | "ready";
type Line = { quantity: number; productName: string; modifiersSnapshot: unknown; note?: string | null };
type Order = { id: string; orderNumber: number; status: OrderStatus; fulfillment: "PICKUP" | "DINE_IN" | "DELIVERY"; verificationStatus: string; paymentStatus: string; refundStatus?: string; customerName: string | null; totalAmount: number; createdAt: string; notes?: string | null; lines: Line[] };
type Counts = { start: number; preparing: number; ready: number; verification: number; unconfirmed: number; incidents: number; attention: number };
const labels: Record<OrderStatus,string> = { RECEIVED:"Recibido",CONFIRMED:"Confirmado",IN_PREPARATION:"En preparación",READY:"Listo",DELIVERED:"Entregado",CANCELLED:"Cancelado" };
const queues: Array<{ id: Queue; label: string; count: keyof Counts; action: string; toStatus: OrderStatus }> = [
  { id:"start",label:"Por iniciar",count:"start",action:"Iniciar preparación",toStatus:"IN_PREPARATION" },
  { id:"preparing",label:"Preparando",count:"preparing",action:"Marcar listo",toStatus:"READY" },
  { id:"ready",label:"Listos",count:"ready",action:"Marcar entregado",toStatus:"DELIVERED" },
];
function code(n:number){return `TL-${String(n).padStart(4,"0")}`}
function money(n:number){return `$${n.toLocaleString("es-AR")}`}
function queueParam(queue:Queue){return queue==="start"?"iniciar":queue==="preparing"?"preparando":"listos"}
function queueFromParam(value:string|null):Queue{return value==="preparando"?"preparing":value==="listos"?"ready":"start"}
function lineModifiers(value:unknown){return Array.isArray(value)?value.map(item=>typeof item==="object"&&item&&"group" in item&&"option" in item?`${String(item.group)}: ${String(item.option)}`:"").filter(Boolean).join(" · "):""}
function waitTime(createdAt:string,now=Date.now()){const mins=Math.max(0,Math.floor((now-new Date(createdAt).getTime())/60000));return mins<1?"Ahora":mins<60?`${mins} min`:`${Math.floor(mins/60)} h ${mins%60} min`}

export function OrdersBoard({ initialOrders, initialCursor, initialCounts, initialQueue="start" }:{initialOrders:Order[];initialCursor:string|null;initialCounts:Counts;initialQueue?:Queue}){
 const [queue,setQueue]=useState<Queue>(initialQueue),[orders,setOrders]=useState(initialOrders),[cursor,setCursor]=useState(initialCursor),[counts,setCounts]=useState(initialCounts),[sessionExpired,setSessionExpired]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(""),[clock,setClock]=useState(()=>Date.now());
 const queueRef=useRef<Queue>(initialQueue);const requestRef=useRef(0);const {connection:sharedConnection,subscribe}=useAdminLiveEvents();const connection=sessionExpired?"expired":sharedConnection;
 const updateTicket=useCallback((updated:Order)=>{setOrders(current=>{const eligible=updated.status===(queueRef.current==="start"?"CONFIRMED":queueRef.current==="preparing"?"IN_PREPARATION":"READY")&&updated.verificationStatus==="VERIFIED"&&["NOT_REQUIRED","CONFIRMED"].includes(updated.paymentStatus);const without=current.filter(item=>item.id!==updated.id);return eligible?[...without,updated].sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id)):without});const params=new URLSearchParams({queue:queueRef.current,countsOnly:"1"});void fetch(`/api/admin/orders/operations?${params}`,{cache:"no-store"}).then(async response=>{if(response.status===401){setSessionExpired(true);return}if(response.ok){const data=await response.json() as {counts:Counts};setCounts(data.counts)}}).catch(()=>setError("No se pudieron actualizar los contadores."))},[]);
 const load=useCallback(async(nextQueue:Queue,append=false,nextCursor:string|null=null)=>{const request=++requestRef.current;setLoading(true);setError("");try{const params=new URLSearchParams({queue:nextQueue});if(nextCursor)params.set("cursor",nextCursor);const response=await fetch(`/api/admin/orders/operations?${params}`,{cache:"no-store"});if(request!==requestRef.current)return;if(response.status===401){setSessionExpired(true);return}if(!response.ok)throw new Error();const data=await response.json() as {orders:Order[];counts:Counts;nextCursor:string|null};if(request!==requestRef.current)return;setOrders(current=>append?[...current,...data.orders.filter(order=>!current.some(item=>item.id===order.id))]:data.orders);setCursor(data.nextCursor);setCounts(data.counts)}catch{if(request===requestRef.current)setError("No se pudieron actualizar los pedidos.")}finally{if(request===requestRef.current)setLoading(false)}},[]);
 const selectQueue=(next:Queue)=>{queueRef.current=next;setQueue(next);setOrders([]);setCursor(null);const url=new URL(window.location.href);url.searchParams.set("cola",queueParam(next));window.history.pushState({},"",url);void load(next)};
 useEffect(()=>{const onPop=()=>{const param=new URL(window.location.href).searchParams.get("cola");const next=queueFromParam(param);queueRef.current=next;setQueue(next);setOrders([]);setCursor(null);void load(next)};window.addEventListener("popstate",onPop);return()=>window.removeEventListener("popstate",onPop)},[load]);
 const onLiveOrder=useCallback((order:Order)=>updateTicket(order),[updateTicket]);
 useEffect(()=>subscribe(onLiveOrder),[subscribe,onLiveOrder]);
 useEffect(()=>{const timer=window.setInterval(()=>setClock(Date.now()),30_000);return()=>window.clearInterval(timer)},[]);
 const activeQueue=queues.find(item=>item.id===queue)!;
 const attentionCount=counts.attention;
 const label=connection==="live"?"En vivo":connection==="reconnecting"?"Reconectando":connection==="offline"?"Sin conexión":connection==="expired"?"Sesión vencida":"Conectando";
 const attentionHref="/admin/orders/attention";
 return <main className="admin-page admin-page--orders">
  <section className="operation-heading" aria-label="Estado de pedidos"><h1 className="visually-hidden">Pedidos</h1><div className="operation-heading__right"><span className={`connection connection--${connection}`} role="status"><i aria-hidden="true"/>{label}</span><Link href="/admin/orders/new" className="admin-button admin-button--primary">+ Nuevo pedido</Link></div></section>
  <Link href={attentionHref} className={`attention-card${attentionCount===0?" attention-card--clear":""}`}><span className="attention-card__icon"><ShieldAlert size={22}/></span><span className="attention-card__copy"><strong>{attentionCount===0?"Todo al día":"Necesitan atención"}</strong><small>Verificaciones y confirmaciones</small></span><b>{attentionCount}</b><ChevronRight size={21}/></Link>
  <section className="kitchen-section" aria-label="Colas de cocina"><div className="section-title"><div><p className="eyebrow">Producción</p><h2>Cocina</h2></div></div><div className="queue-tabs" role="group" aria-label="Colas de cocina">{queues.map(item=><button type="button" aria-pressed={queue===item.id} key={item.id} onClick={()=>selectQueue(item.id)} className={queue===item.id?"is-active":""}><span>{item.label}</span><b>{counts[item.count]}</b></button>)}</div>
   <div className="queue-title"><h3>{activeQueue.label}</h3><span>{counts[activeQueue.count]} pedido{counts[activeQueue.count]===1?"":"s"}</span></div>
   {connection==="expired"&&<div className="admin-notice admin-notice--warning" role="alert">La sesión venció. <Link href="/admin/login?returnTo=%2Fadmin%2Forders">Volver a ingresar</Link></div>}
   {error&&<div className="admin-notice admin-notice--error" role="alert">{error}<button className="text-button" onClick={()=>void load(queue)}>Reintentar</button></div>}
   <div className="ticket-list">{orders.map(order=>{
    const transition=queues.find(item=>item.id===queue);
    const valid=order.status=== (queue==="start"?"CONFIRMED":queue==="preparing"?"IN_PREPARATION":"READY") && order.verificationStatus==="VERIFIED" && ["NOT_REQUIRED","CONFIRMED"].includes(order.paymentStatus);
    const mode=order.fulfillment==="PICKUP"?"Retiro":order.fulfillment==="DELIVERY"?"Delivery":"Consumo local";
    return <article className="order-ticket" key={order.id}><header className="order-ticket__top"><strong>{code(order.orderNumber)}</strong><time dateTime={order.createdAt}>Espera {waitTime(order.createdAt,clock)}</time></header><div className="order-ticket__identity"><div><strong>{order.customerName||"Sin nombre"}</strong><span>{mode}</span></div><span className={`order-status order-status--${order.status.toLowerCase()}`}>{labels[order.status]}</span></div><div className="order-ticket__lines">{order.lines.map((line,index)=><div key={`${line.productName}-${index}`}><strong>{line.quantity} × {line.productName}</strong>{lineModifiers(line.modifiersSnapshot)&&<small>{lineModifiers(line.modifiersSnapshot)}</small>}{line.note&&<small>Nota: {line.note}</small>}</div>)}{order.notes&&<p><b>Observaciones:</b> {order.notes}</p>}</div><footer className="order-ticket__footer"><strong>Total <span>{money(order.totalAmount)}</span></strong><div className="order-ticket__actions">{valid&&transition&&<QuickAction order={order} label={transition.action} toStatus={transition.toStatus} onSuccess={updateTicket} onConflict={updateTicket} onExpired={()=>setSessionExpired(true)}/>}<Link className="admin-button admin-button--secondary" href={`/admin/orders/${order.id}`}>Ver detalle</Link></div></footer></article>
   })}</div>
   {orders.length===0&&!loading&&<div className="empty-state"><strong>{error?"No se pudo cargar esta cola":"No hay pedidos por acá"}</strong><p>{error?"Revisá la conexión e intentá nuevamente.":"Los nuevos pedidos aparecerán en esta lista."}</p>{error&&<button className="admin-button admin-button--secondary" onClick={()=>void load(queue)}>Reintentar</button>}</div>}
   {loading&&!orders.length&&<div className="admin-skeleton-list" role="status" aria-label="Actualizando pedidos"><div className="admin-skeleton-card"/><div className="admin-skeleton-card"/><div className="admin-skeleton-card"/></div>}
   {loading&&orders.length>0&&<p className="load-more-status" role="status">Actualizando pedidos…</p>}
   {cursor&&<button className="admin-button admin-button--secondary load-more" disabled={loading} onClick={()=>void load(queue,true,cursor)}>{loading?"Cargando…":"Cargar más pedidos"}</button>}
  </section>
 </main>
}

function QuickAction({order,label,toStatus,onSuccess,onConflict,onExpired}:{order:Order;label:string;toStatus:OrderStatus;onSuccess:(order:Order)=>void;onConflict:(order:Order)=>void;onExpired:()=>void}){
 const [pending,setPending]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(""),4000);return()=>clearTimeout(timer)},[message]);
 async function run(){if(pending)return;setPending(true);setMessage("");try{const response=await fetch(`/api/admin/orders/${order.id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({toStatus})});if(response.status===401){setMessage("Sesión vencida");onExpired();return}if(response.status===409){setMessage("El pedido cambió. Sincronizando el estado actual…");const current=await fetch(`/api/admin/orders/${order.id}`,{cache:"no-store"});if(current.status===401){onExpired();return}if(!current.ok)throw new Error();onConflict(await current.json() as Order);return}if(!response.ok)throw new Error();const body=await response.json() as {order?:Order}|Order;onSuccess(("order" in body&&body.order?body.order:body) as Order);setMessage(`${code(order.orderNumber)} actualizado`)}catch{setMessage("No se pudo actualizar. Reintentá.")}finally{setPending(false)}}
 return <><button type="button" className="admin-button admin-button--primary" onClick={()=>void run()} disabled={pending}>{pending?"Actualizando…":label}</button>{message&&<span role="status" className="quick-result">{message}</span>}</>
}
