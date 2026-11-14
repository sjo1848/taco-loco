"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton(){
 const router=useRouter();
 const [pending,setPending]=useState(false),[message,setMessage]=useState("");
 async function logout(){
  if(pending)return;
  let revoked=false;
  setPending(true);setMessage("");
  try{
   const response=await fetch("/api/auth/logout",{method:"POST"});
   if(!response.ok)throw new Error("El servidor no pudo cerrar la sesión.");
   const verification=await fetch("/api/auth/session",{cache:"no-store"});
   if(verification.status!==401)throw new Error("El servidor no confirmó que la sesión haya sido revocada.");
   revoked=true;
   setMessage("Sesión revocada y cerrada.");
   window.setTimeout(()=>{router.replace("/admin/login");router.refresh()},650);
   return;
  }catch(error){setMessage(error instanceof Error?error.message:"No se pudo cerrar la sesión. Reintentá.")}
  finally{if(!revoked)setPending(false)}
 }
 return <div className="admin-logout"><button type="button" className="admin-button admin-button--secondary" onClick={()=>void logout()} disabled={pending}>{pending?"Cerrando sesión…":"Cerrar sesión"}</button>{message&&<p role="status" aria-live="polite">{message}</p>}</div>;
}
