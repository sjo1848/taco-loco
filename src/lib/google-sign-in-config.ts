export function getGoogleSignInConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const enabled = process.env.GOOGLE_SIGN_IN_ENABLED === "true" && clientId.endsWith(".apps.googleusercontent.com");
  return { enabled, clientId: enabled ? clientId : null };
}

export type GoogleSignInClientConfig = {
  enabled: boolean;
  clientId: string | null;
  csrfToken?: string;
  nonce?: string;
};

export function isGoogleSignInClientConfig(value: unknown): value is GoogleSignInClientConfig {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { enabled?: unknown; clientId?: unknown; csrfToken?: unknown; nonce?: unknown };
  if (typeof candidate.enabled !== "boolean") return false;
  if (!candidate.enabled) return candidate.clientId === null;
  return typeof candidate.clientId === "string" && candidate.clientId.length > 0
    && typeof candidate.csrfToken === "string" && candidate.csrfToken.length > 0
    && typeof candidate.nonce === "string" && candidate.nonce.length > 0;
}

export async function readGoogleSignInClientConfig(response: Response): Promise<GoogleSignInClientConfig> {
  if (!response.ok) throw new Error("GOOGLE_CONFIG_UNAVAILABLE");
  const value: unknown = await response.json();
  if (!isGoogleSignInClientConfig(value)) throw new Error("GOOGLE_CONFIG_INVALID");
  return value;
}
