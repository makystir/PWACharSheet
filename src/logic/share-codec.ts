import { base64urlEncode, base64urlDecode } from './base64url';
import { gzip, gunzip } from './gzip';

/**
 * Versioned share-codec envelope for read-only character links.
 *
 * Wire format: base64url( [SHARE_FORMAT_V] ++ gzip(utf8(json)) )
 * A single leading version byte lets future readers reject payloads produced
 * by an incompatible encoder. Decoding never throws — every failure mode
 * (oversized, non-base64url, wrong version, bad gzip, invalid UTF-8) returns a
 * structured `{ ok: false }` result.
 */
export const SHARE_FORMAT_V = 1;

/** Reject encoded payloads longer than this before doing any work. */
export const MAX_ENCODED_CHARS = 2_000_000;
/** Zip-bomb guard: cap the decompressed byte count. */
export const MAX_DECOMPRESSED_BYTES = 4_000_000;
/** Upper bound on decoded JSON string length (used by the validator). */
export const MAX_JSON_CHARS = 3_000_000;

export type DecodeResult =
  | { ok: true; json: string }
  | { ok: false; error: string; code: string };

/** Encode a JSON string into the versioned, gzipped, base64url envelope. */
export async function encodeSharePayload(json: string): Promise<string> {
  const utf8 = new TextEncoder().encode(json);
  const compressed = await gzip(utf8);
  const framed = new Uint8Array(compressed.length + 1);
  framed[0] = SHARE_FORMAT_V;
  framed.set(compressed, 1);
  return base64urlEncode(framed);
}

/**
 * Decode an encoded share payload back to its JSON string.
 * Order of checks: oversized > base64url decode > version byte > gunzip
 * (bounded) > strict UTF-8 decode. Never throws.
 */
export async function decodeSharePayload(encoded: string): Promise<DecodeResult> {
  if (encoded.length > MAX_ENCODED_CHARS) {
    return { ok: false, error: 'Shared data is too large.', code: 'too-large' };
  }

  let framed: Uint8Array;
  try {
    framed = base64urlDecode(encoded);
  } catch {
    return { ok: false, error: 'Shared data is not valid.', code: 'bad-base64url' };
  }

  if (framed.length < 1) {
    return { ok: false, error: 'Shared data is not valid.', code: 'empty' };
  }

  if (framed[0] !== SHARE_FORMAT_V) {
    return { ok: false, error: 'Unsupported share link version.', code: 'bad-version' };
  }

  const compressed = framed.slice(1);
  let decompressed: Uint8Array;
  try {
    decompressed = await gunzip(compressed, MAX_DECOMPRESSED_BYTES);
  } catch {
    return { ok: false, error: 'Shared data could not be read.', code: 'bad-gzip' };
  }

  try {
    const json = new TextDecoder('utf-8', { fatal: true }).decode(decompressed);
    return { ok: true, json };
  } catch {
    return { ok: false, error: 'Shared data could not be read.', code: 'bad-utf8' };
  }
}
