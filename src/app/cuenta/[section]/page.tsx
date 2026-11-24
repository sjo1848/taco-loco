import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CustomerAccount } from "@/components/public/CustomerAccount";

export const metadata = { title: "Mi cuenta · Taco Club", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function CustomerProfilePage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section !== "datos" && section !== "direcciones" && section !== "favoritos") notFound();
  return <Suspense fallback={<main aria-busy="true">Cargando cuenta…</main>}><CustomerAccount /></Suspense>;
}
