"use client";

export default function ErrorState({ reset }: { reset: () => void }) { return <main className="page-shell"><p className="eyebrow">Taco Loco</p><h1>No pudimos cargar el menú</h1><p className="lede">Revisá tu conexión e intentá nuevamente.</p><button className="button" onClick={reset}>Reintentar</button></main>; }
