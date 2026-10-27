import Link from "next/link";
import { GoogleSignInButton } from "@/components/public/GoogleSignInButton";

export const metadata = { title: "Taco Club", robots: { index: false, follow: false } };

export default function AccountPage() {
  return <main className="public-shell"><section className="public-panel" aria-labelledby="account-title"><p className="eyebrow">Taco Club</p><h1 id="account-title">Tu cuenta, cuando quieras</h1><p className="selection-help">Comprar como invitado sigue siendo siempre posible. Si querés guardar tus pedidos para consultarlos después, podés iniciar sesión.</p><GoogleSignInButton /><p className="selection-help"><Link href="/menu">Volver al menú</Link></p></section></main>;
}
