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
  if (candidate.clientId !== null && typeof candidate.clientId !== "string") return false;
  if (!candidate.enabled) return true;
  return typeof candidate.clientId === "string" && typeof candidate.csrfToken === "string" && typeof candidate.nonce === "string";
}

export async function readGoogleSignInClientConfig(response: Response): Promise<GoogleSignInClientConfig> {
  if (!response.ok) throw new Error("GOOGLE_CONFIG_UNAVAILABLE");
  const value: unknown = await response.json();
  if (!isGoogleSignInClientConfig(value)) throw new Error("GOOGLE_CONFIG_INVALID");
  return value;
}
