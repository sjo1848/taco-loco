export function getGoogleSignInConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const enabled = process.env.GOOGLE_SIGN_IN_ENABLED === "true" && clientId.endsWith(".apps.googleusercontent.com");
  return { enabled, clientId: enabled ? clientId : null };
}
