"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main className="admin-page"><section className="admin-error" role="alert"><h1>No se pudo cargar la operación</h1><p>Revisá la conexión y volvé a intentar.</p><button className="admin-button admin-button--primary" onClick={() => reset()}>Reintentar</button></section></main>; }
