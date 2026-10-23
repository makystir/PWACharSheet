/**
 * Pure helpers for the read-only GM "view" route.
 *
 * The view route is handled SEPARATELY from the app's hash routing
 * (src/logic/hash-route.ts): a view link encodes a whole character payload
 * after `#view/`. These helpers only slice/format the opaque payload string —
 * they never decode or validate it (that is share-codec.ts + share-validate.ts).
 */

export const VIEW_ROUTE_PREFIX = 'view';

/**
 * Extract the opaque encoded payload that follows `view/` in a URL hash, or
 * `null` when the hash is not a view route. Performs NO decoding/validation.
 */
export function parseViewRoute(hash: string): string | null {
  const stripped = hash.startsWith('#') ? hash.slice(1) : hash;
  const prefix = `${VIEW_ROUTE_PREFIX}/`;
  if (!stripped.startsWith(prefix)) {
    return null;
  }
  return stripped.slice(prefix.length);
}

/**
 * Build a full view-link href from an origin, pathname, and the encoded payload.
 * e.g. formatViewHref('https://x.io', '/PWACharSheet/', 'ABC') ->
 * 'https://x.io/PWACharSheet/#view/ABC'.
 */
export function formatViewHref(origin: string, pathname: string, encoded: string): string {
  return `${origin}${pathname}#${VIEW_ROUTE_PREFIX}/${encoded}`;
}
