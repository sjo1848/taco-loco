"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Config = { enabled: boolean; clientId: string | null; csrfToken?: string };

export function GoogleSignInButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/customer/auth/google/config", { credentials: "same-origin" })
      .then((response) => response.json() as Promise<Config>)
      .then((value) => { if (!cancelled) setConfig(value); })
      .catch(() => { if (!cancelled) setConfig({ enabled: false, clientId: null }); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!config?.enabled || !config.clientId || !config.csrfToken || !containerRef.current) return;
    const handleCredential = (response: { credential: string }) => {
      void fetch("/api/customer/auth/google", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ credential: response.credential, csrfToken: config.csrfToken }) })
        .then(async (result) => {
          if (!result.ok) {
            if (result.status === 401 || result.status === 403) {
              const refreshed = await fetch("/api/customer/auth/google/config", { credentials: "same-origin" }).then((configResponse) => configResponse.json() as Promise<Config>);
              setConfig(refreshed);
              throw new Error("GOOGLE_CSRF_EXPIRED");
            }
            throw new Error("GOOGLE_AUTH_FAILED");
          }
          router.push("/cuenta"); router.refresh();
        })
        .catch((error: unknown) => setError(error instanceof Error && error.message === "GOOGLE_CSRF_EXPIRED" ? "La sesión de acceso venció. Volvé a tocar el botón de Google." : "No pudimos iniciar sesión con Google."));
    };
    const render = () => { if (!window.google || !containerRef.current) return; window.google.accounts.id.initialize({ client_id: config.clientId!, callback: handleCredential, ux_mode: "popup" }); window.google.accounts.id.renderButton(containerRef.current, { theme: "outline", size: "large", text: "continue_with", shape: "rectangular", width: 280 }); };
    if (window.google) { render(); return; }
    const script = document.createElement("script"); script.src = "https://accounts.google.com/gsi/client"; script.async = true; script.onload = render; document.head.appendChild(script);
    return () => { script.onload = null; };
  }, [config, router]);

  if (config && !config.enabled) return <p className="selection-help">El acceso con Google todavía no está habilitado.</p>;
  return <div><div ref={containerRef} aria-label="Continuar con Google" />{error && <p className="form-error" role="alert">{error}</p>}</div>;
}
