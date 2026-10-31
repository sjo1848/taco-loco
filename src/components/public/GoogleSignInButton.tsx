"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicCustomer } from "@/modules/auth/customer-types";
import { readGoogleSignInClientConfig, type GoogleSignInClientConfig } from "@/lib/google-sign-in-config";

type AuthStatus = "idle" | "loading" | "error";

export function GoogleSignInButton({ onAuthenticated, onStatusChange }: { onAuthenticated?: (customer: PublicCustomer) => void; onStatusChange?: (status: AuthStatus) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [config, setConfig] = useState<GoogleSignInClientConfig | null>(null);
  const [error, setError] = useState("");
  const [configError, setConfigError] = useState(false);
  const [configRetry, setConfigRetry] = useState(0);
  const nonceRef = useRef<string | null>(null);
  const renderedChallengeRef = useRef<string | null>(null);
  const refreshingConfigRef = useRef(false);
  const challengeGenerationRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/customer/auth/google/config", { credentials: "same-origin" })
      .then(readGoogleSignInClientConfig)
      .then((value) => { if (!cancelled) { setConfig(value); setConfigError(false); } })
      .catch(() => { if (!cancelled) { setConfig(null); setConfigError(true); } });
    return () => { cancelled = true; };
  }, [configRetry]);

  useEffect(() => {
    if (!config?.enabled || !config.clientId || !config.csrfToken || !config.nonce || !containerRef.current) return;
    const container = containerRef.current;
    let active = true;
    const generation = challengeGenerationRef.current + 1;
    challengeGenerationRef.current = generation;
    const handleCredential = (response: { credential: string }) => {
      if (!active || challengeGenerationRef.current !== generation) return;
      setError("");
      onStatusChange?.("loading");
      void fetch("/api/customer/auth/google", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ credential: response.credential, csrfToken: config.csrfToken, nonce: nonceRef.current }) })
        .then(async (result) => {
          if (!active || challengeGenerationRef.current !== generation) return;
          if (!result.ok) {
            if (result.status === 403 || result.status === 503) {
              if (refreshingConfigRef.current) return;
              refreshingConfigRef.current = true;
              const renewalMessage = result.status === 503 ? "No pudimos completar el acceso. Volvé a tocar el botón de Google para intentar de nuevo." : "La sesión de acceso venció. Volvé a tocar el botón de Google.";
              window.google?.accounts.id.cancel();
              container.replaceChildren();
              renderedChallengeRef.current = null;
              nonceRef.current = null;
              challengeGenerationRef.current += 1;
              try {
                const refreshed = await fetch("/api/customer/auth/google/config", { credentials: "same-origin" }).then(readGoogleSignInClientConfig);
                if (!active || !refreshed.enabled || !refreshed.clientId || !refreshed.csrfToken || !refreshed.nonce) throw new Error("GOOGLE_CONFIG_UNAVAILABLE");
                setConfig(refreshed);
                setConfigError(false);
                onStatusChange?.("error");
                setError(renewalMessage);
              } catch (refreshError) {
                if (active) { setConfig(null); setConfigError(true); onStatusChange?.("error"); setError(refreshError instanceof Error && refreshError.message === "GOOGLE_CONFIG_UNAVAILABLE" ? "No pudimos preparar el acceso con Google." : "No pudimos renovar el acceso. Intentá nuevamente."); }
              } finally {
                refreshingConfigRef.current = false;
              }
              return;
              throw new Error(result.status === 503 ? "GOOGLE_PROVIDER_UNAVAILABLE" : "GOOGLE_CSRF_EXPIRED");
            }
            if (result.status === 429) throw new Error("GOOGLE_RATE_LIMITED");
            throw new Error("GOOGLE_AUTH_FAILED");
          }
          const body = await result.json() as { authenticated?: boolean; customer?: PublicCustomer };
          if (!body.authenticated || !body.customer) throw new Error("GOOGLE_AUTH_RESPONSE_INVALID");
          if (!active || challengeGenerationRef.current !== generation) return;
          onAuthenticated?.(body.customer);
          onStatusChange?.("idle");
          router.refresh();
        })
        .catch((error: unknown) => {
          if (!active || challengeGenerationRef.current !== generation) return;
          onStatusChange?.("error");
          setError(error instanceof Error && error.message === "GOOGLE_CSRF_EXPIRED" ? "La sesión de acceso venció. Volvé a tocar el botón de Google." : error instanceof Error && error.message === "GOOGLE_PROVIDER_UNAVAILABLE" ? "No pudimos completar el acceso. Volvé a tocar el botón de Google para intentar de nuevo." : error instanceof Error && error.message === "GOOGLE_RATE_LIMITED" ? "Demasiados intentos. Esperá unos minutos y volvé a intentar." : "No pudimos iniciar sesión con Google.");
        });
    };
    const challengeKey = `${config.clientId}:${config.csrfToken}:${config.nonce}`;
    const render = () => {
      if (!active || challengeGenerationRef.current !== generation || !window.google || renderedChallengeRef.current === challengeKey) return;
      renderedChallengeRef.current = challengeKey;
      nonceRef.current = config.nonce!;
      window.google.accounts.id.initialize({ client_id: config.clientId!, callback: handleCredential, nonce: nonceRef.current, ux_mode: "popup" });
      window.google.accounts.id.renderButton(container, { theme: "outline", size: "large", text: "continue_with", shape: "rectangular", width: 280 });
    };
    let script: HTMLScriptElement | null = null;
    if (window.google) render();
    else {
      script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = render;
      script.onerror = () => {
        if (!active || challengeGenerationRef.current !== generation) return;
        setConfig(null);
        setConfigError(true);
        onStatusChange?.("error");
        setError("No pudimos cargar el acceso con Google. Intentá nuevamente.");
      };
      document.head.appendChild(script);
    }
    return () => { active = false; if (script) script.onload = null; if (renderedChallengeRef.current === challengeKey) { window.google?.accounts.id.cancel(); container.replaceChildren(); renderedChallengeRef.current = null; } };
  }, [config, onAuthenticated, onStatusChange, router]);

  if (config && !config.enabled) return <p className="selection-help">El acceso con Google todavía no está habilitado.</p>;
  if (configError) return <div><p className="form-error" role="alert">No pudimos preparar el acceso con Google.</p><button className="admin-button admin-button--secondary" type="button" onClick={() => setConfigRetry((value) => value + 1)}>Reintentar acceso</button></div>;
  return <div><div ref={containerRef} aria-label="Continuar con Google" />{error && <p className="form-error" role="alert">{error}</p>}{!error && <p className="selection-help" role="status" aria-live="polite">{config ? "Elegí una cuenta Google para continuar." : "Preparando el acceso…"}</p>}</div>;
}
