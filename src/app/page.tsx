import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <p className="eyebrow">Taco Loco Foodtrack</p>
      <h1>Menú digital</h1>
      <p className="lede">La base técnica está lista para construir el MVP.</p>
      <Link className="button" href="/menu">Ver menú</Link>
    </main>
  );
}
