"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setPending(true); setError(""); const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) }); if (!response.ok) { const body = await response.json().catch(() => null); setError(body?.message ?? "No pudimos iniciar sesión."); setPending(false); return; } router.push("/admin"); router.refresh(); }
  return <form className="admin-form" onSubmit={submit} noValidate><label>Email<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Contraseña<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="admin-button admin-button--primary" disabled={pending}>{pending ? "Ingresando…" : "Ingresar"}</button></form>;
}
