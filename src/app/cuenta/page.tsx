import { CustomerAccount } from "@/components/public/CustomerAccount";
import { Suspense } from "react";

export const metadata = { title: "Taco Club", robots: { index: false, follow: false } };

export default function AccountPage() { return <Suspense fallback={<main aria-busy="true">Cargando cuenta…</main>}><CustomerAccount /></Suspense>; }
