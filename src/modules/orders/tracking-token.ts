const TRACKING_TOKEN_BYTES = 32;
export const trackingTokenPattern = /^[A-Za-z0-9_-]{43}$/;

/** 32 random bytes encoded as unpadded base64url; safe in Workers and Node. */
export function createPublicTrackingToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(TRACKING_TOKEN_BYTES));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function isPublicTrackingToken(value: string) {
  return trackingTokenPattern.test(value);
}
