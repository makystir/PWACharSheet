import { useSyncExternalStore } from 'react';
import { parseViewRoute } from '../logic/view-route';

/**
 * Subscribe to `hashchange` and return the opaque encoded payload of the
 * current `#view/…` route, or `null` when the hash is not a view route.
 *
 * Uses `useSyncExternalStore` (not a setState-in-effect) to track the browser
 * hash: `subscribe` registers the `hashchange` listener and `getSnapshot`
 * reads `parseViewRoute(window.location.hash)`. The snapshot is a primitive
 * (string | null), so React's referential comparison re-renders only when the
 * payload actually changes. `getServerSnapshot` returns `null` for SSR safety.
 */
function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener('hashchange', onStoreChange);
  return () => window.removeEventListener('hashchange', onStoreChange);
}

function getSnapshot(): string | null {
  return parseViewRoute(window.location.hash);
}

function getServerSnapshot(): string | null {
  return null;
}

export function useViewRoute(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
