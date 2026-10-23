/**
 * base64url (RFC 4648 §5) encode/decode over raw bytes, built on btoa/atob.
 *
 * Used by the share codec to put compressed character payloads in a URL hash.
 * Decoding rejects any input containing characters outside the base64url
 * alphabet before attempting to decode, so malformed payloads fail cleanly
 * rather than throwing from atob.
 */

const BASE64URL_RE = /^[A-Za-z0-9_-]*$/;

/** Encode raw bytes as an unpadded base64url string. */
export function base64urlEncode(bytes: Uint8Array<ArrayBuffer>): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // Standard base64, then translate to the URL-safe alphabet and drop padding.
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode an unpadded base64url string back to raw bytes.
 * Throws if the input contains characters outside [A-Za-z0-9_-].
 */
export function base64urlDecode(encoded: string): Uint8Array<ArrayBuffer> {
  if (!BASE64URL_RE.test(encoded)) {
    throw new Error('Invalid base64url input');
  }
  // Translate back to standard base64 and restore padding to a multiple of 4.
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const remainder = base64.length % 4;
  if (remainder === 2) base64 += '==';
  else if (remainder === 3) base64 += '=';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
