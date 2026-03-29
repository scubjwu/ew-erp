/** Uppercase A–Z and 0–9 (excludes ambiguous characters). */
const CUSTOM_ID_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const SUFFIX_LENGTH = 5;

/**
 * Generates a unique-style customer reference: `C` + 5 random uppercase letters/digits (e.g. `C3A9FZ`).
 * Uses `crypto.getRandomValues` in the browser when available.
 */
export function generateCustomerCustomId(): string {
  const bytes = new Uint8Array(SUFFIX_LENGTH);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < SUFFIX_LENGTH; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let suffix = "";
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    suffix += CUSTOM_ID_CHARSET[bytes[i]! % CUSTOM_ID_CHARSET.length];
  }
  return `C${suffix}`;
}
