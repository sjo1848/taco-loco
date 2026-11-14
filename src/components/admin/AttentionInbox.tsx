"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronRight, Wifi, WifiOff } from "lucide-react";
import { useAdminLiveEvents } from "@/components/admin/AdminShell";

type Kind="all"|"verification"|"unconfirmed"|"incidents";
type Bucket="today"|"previous";
type Order={id:string;orderNumber:number;status:string;fulfillment:string;verificationStatus:string;paymentStatus:string;refundStatus:string;customerName:string|null;totalAmount:number;createdAt:string;lines?:Array<{quantity:number;productName:string}>};
type Counts={all:number;verification:number;unconfirmed:number;incidents:number;buckets:{today:number;previous:number}};
type Page={orders:Order[];cursor:string|null;loading:boolean};
const tabs:Array<{id:Kind;label:string}>=[{id:"all",label:"Todos"},{id:"verification",label:"Por verificar"},{id:"unconfirmed",label:"Sin confirmar"},{id:"incidents",label:"Incidencias"}];
const buckets:Array<{id:Bucket;label:string}>=[{id:"today",label:"Nuevos de la jornada"},{id:"previous",label:"Pendientes anteriores"}];
const emptyPage=():Page=>({orders:[],cursor:null,loading:false});
const code=(n:number)=>`TL-${String(n).padStart(4,"0")}`;
const money=(n:number)=>`$${n.toLocaleString("es-AR")}`;
function reason(order:Order){const parts=[];if(order.verificationStatus==="PENDING")parts.push("Requiere verificación");if(order.status==="RECEIVED")parts.push("Pedido sin confirmar");if(order.paymentStatus==="REJECTED")parts.push("Pago rechazado");if(order.refundStatus==="REQUIRED")parts.push("Devolución pendiente");return parts.join(" · ")}
function paymentLabel(order:Order){return order.paymentStatus==="REPORTED"?"Pago informado":order.paymentStatus==="PENDING"?"Pago pendiente":order.paymentStatus==="CONFIRMED"?"Pago confirmado":order.paymentStatus==="REJECTED"?"Pago rechazado":""}
function isAttention(order:Order,kind:Kind){const cases=[order.verificationStatus==="PENDING",order.status==="RECEIVED",order.refundStatus==="REQUIRED"||order.paymentStatus==="REJECTED"];return kind==="all"?cases.some(Boolean):kind==="verification"?cases[0]:kind==="unconfirmed"?cases[1]:cases[2]}
function businessDate(value:Date){const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(value);return `${parts.find(item=>item.type==="year")?.value}-${parts.find(item=>item.type==="month")?.value}-${parts.find(item=>item.type==="day")?.value}`}
function bucketFor(createdAt:string):Bucket {return businessDate(new Date(createdAt))===businessDate(new Date())?"today":"previous"}

export function AttentionInbox(){
 const [kind,setKind]=useState<Kind>("all"),[pages,setPages]=useState<Record<Bucket,Page>>({today:emptyPage(),previous:emptyPage()}),[counts,setCounts]=useState<Counts>({all:0,verification:0,unconfirmed:0,incidents:0,buckets:{today:0,previous:0}}),[error,setError]=useState("");
 const requests=useRef<Record<Bucket,number>>({today:0,previous:0});
 const countRequest=useRef(0),liveOverrides=useRef(new Map<string,Order>());
 const {connection,subscribe}=useAdminLiveEvents();
 const countsForKind=useCallback(async(nextKind:Kind)=>{const request=++countRequest.current;const response=await fetch(`/api/admin/orders/attention?kind=${nextKind}&countsOnly=1`,{cache:"no-store"});if(response.status===401)throw new Error("SESSION_EXPIRED");if(!response.ok)throw new Error("No se pudieron actualizar los contadores.");const data=await response.json() as {counts:Counts};if(request===countRequest.current)setCounts(data.counts)},[]);
 const load=useCallback(async(nextKind:Kind,bucket:Bucket,append=false,nextCursor:string|null=null)=>{
  const request=++requests.current[bucket];setPages(current=>({...current,[bucket]:{...current[bucket],loading:true}}));setError("");
  try{const params=new URLSearchParams({kind:nextKind,bucket});if(nextCursor)params.set("cursor",nextCursor);const response=await fetch(`/api/admin/orders/attention?${params}`,{cache:"no-store"});if(request!==requests.current[bucket])return;if(response.status===401)throw new Error("SESSION_EXPIRED");if(!response.ok)throw new Error("No se pudo cargar esta bandeja.");const data=await response.json() as {orders:Order[];counts?:Counts;nextCursor:string|null};if(request!==requests.current[bucket])return;setPages(current=>{const before=append?current[bucket].orders:[];const serverRows=data.orders.map(item=>liveOverrides.current.get(item.id)??item).filter(item=>isAttention(item,nextKind)&&bucketFor(item.createdAt)===bucket);const liveRows=[...liveOverrides.current.values()].filter(item=>isAttention(item,nextKind)&&bucketFor(item.createdAt)===bucket);const combined=[...before,...serverRows,...liveRows];return {...current,[bucket]:{orders:combined.filter((item,index)=>combined.findIndex(other=>other.id===item.id)===index).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),cursor:data.nextCursor,loading:false}}});if(data.counts&&request===requests.current[bucket])setCounts(data.counts)}
  catch(e){if(request===requests.current[bucket]){setPages(current=>({...current,[bucket]:{...current[bucket],loading:false}}));setError(e instanceof Error?e.message:"No se pudo cargar la bandeja.")}}
 },[]);
 const reloadBoth=useCallback((nextKind:Kind,clear=true)=>{if(clear){setPages({today:{...emptyPage(),loading:true},previous:{...emptyPage(),loading:true}})}void Promise.all([load(nextKind,"today"),load(nextKind,"previous")])},[load]);
 useEffect(()=>{const timer=window.setTimeout(()=>reloadBoth(kind),0);return()=>window.clearTimeout(timer)},[kind,reloadBoth]);
 const onLiveOrder=useCallback((eventOrder:Order)=>{liveOverrides.current.delete(eventOrder.id);liveOverrides.current.set(eventOrder.id,eventOrder);if(liveOverrides.current.size>1000)liveOverrides.current.delete(liveOverrides.current.keys().next().value!);setPages(current=>{const next={today:{...current.today},previous:{...current.previous}};for(const bucket of ["today","previous"] as const){next[bucket].orders=next[bucket].orders.filter(item=>item.id!==eventOrder.id);if(isAttention(eventOrder,kind)&&bucketFor(eventOrder.createdAt)===bucket){next[bucket].orders=[eventOrder,...next[bucket].orders].sort((a,b)=>b.createdAt.localeCompare(a.createdAt))}}return next});void countsForKind(kind).catch(e=>{if(e instanceof Error&&e.message==="SESSION_EXPIRED")setError("SESSION_EXPIRED")})},[kind,countsForKind]);
 useEffect(()=>subscribe(onLiveOrder),[subscribe,onLiveOrder]);
 useEffect(()=>{const refresh=()=>{if(document.visibilityState==="visible")void countsForKind(kind).catch(()=>{})};window.addEventListener("pageshow",refresh);document.addEventListener("visibilitychange",refresh);return()=>{window.removeEventListener("pageshow",refresh);document.removeEventListener("visibilitychange",refresh)}},[kind,countsForKind]);
 const connectionLabel=connection==="live"?"En vivo":connection==="reconnecting"||connection==="connecting"?"Reconectando":connection==="offline"?"Sin conexión":connection==="expired"?"Sesión vencida":"En vivo";
 const countForTab=(tab:Kind)=>counts[tab];
 return <main className="admin-page admin-attention" aria-busy={pages.today.loading||pages.previous.loading}>
  <header className="admin-header"><div><p className="eyebrow">Operación</p><h1>Necesitan atención</h1></div><div className="attention-header-actions"><span className={`connection connection--${connection}`} role="status">{connection==="offline"?<WifiOff size={15}/>:<Wifi size={15}/>} {connectionLabel}</span><Link className="admin-button admin-button--secondary" href="/admin/orders">Volver</Link></div></header>
  <p className="inbox-summary"><AlertTriangle size={18}/><strong>{counts.all} casos sin resolver</strong></p>
  <div className="inbox-tabs" role="group" aria-label="Filtrar casos">{tabs.map(tab=><button type="button" aria-pressed={kind===tab.id} key={tab.id} onClick={()=>setKind(tab.id)} className={kind===tab.id?"is-active":""}>{tab.label}<b>{countForTab(tab.id)}</b></button>)}</div>
  {connection==="expired"||error==="SESSION_EXPIRED"?<div role="alert" className="admin-notice admin-notice--warning">La sesión venció. <Link href="/admin/login?returnTo=%2Fadmin%2Forders%2Fattention">Ingresar</Link></div>:null}
  {connection==="offline"&&<div role="status" className="admin-notice admin-notice--warning">Sin conexión. Se conservaron los pedidos cargados. <button className="text-button" onClick={()=>{reloadBoth(kind);void countsForKind(kind).catch(()=>{})}}>Reintentar</button></div>}
  {error&&error!=="SESSION_EXPIRED"&&<div role="alert" className="admin-notice admin-notice--error">{error}<button className="text-button" onClick={()=>{reloadBoth(kind);void countsForKind(kind).catch(()=>{})}}>Reintentar</button></div>}
  {buckets.map(bucket=>{const page=pages[bucket.id],count=counts.buckets[bucket.id];return <section className="attention-bucket" aria-labelledby={`attention-${bucket.id}`} key={bucket.id}><header className="attention-bucket__heading"><h2 id={`attention-${bucket.id}`}>{bucket.label}</h2><span>{count}</span></header>
   {page.loading&&!page.orders.length&&<div className="admin-skeleton-list" role="status" aria-label={`Cargando ${bucket.label.toLowerCase()}`}><div className="admin-skeleton-card"/><div className="admin-skeleton-card"/></div>}
   <div className="attention-list">{page.orders.map(order=><article className="attention-ticket" key={order.id}><div className="attention-ticket__head"><strong>{code(order.orderNumber)}</strong><time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleString("es-AR")}</time></div><p className="attention-ticket__customer"><strong>{order.customerName||"Sin nombre"}</strong><span>{order.fulfillment==="PICKUP"?"Retiro":order.fulfillment==="DELIVERY"?"Delivery":"Consumo local"}</span></p><p className="attention-ticket__reason">{reason(order)}{paymentLabel(order)?` · ${paymentLabel(order)}`:""}</p><div className="attention-ticket__foot"><strong>{money(order.totalAmount)}</strong><Link href={`/admin/orders/${order.id}?focus=verification&from=attention`} className="admin-button admin-button--primary">Revisar pedido <ChevronRight size={17}/></Link></div></article>)}</div>
   {!page.loading&&!page.orders.length&&<div className="empty-state"><strong>{count===0?"Todo al día":"No hay casos en esta página"}</strong><p>{bucket.id==="today"?"Los pedidos nuevos de hoy aparecerán acá.":"Los casos anteriores siguen disponibles en esta bandeja."}</p></div>}
   {page.cursor&&<button className="admin-button admin-button--secondary load-more" disabled={page.loading} onClick={()=>void load(kind,bucket.id,true,page.cursor)}>{page.loading?"Cargando…":"Cargar más"}</button>}
  </section>})}
 </main>
}
