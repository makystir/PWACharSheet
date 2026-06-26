import { useCallback, useRef, useSyncExternalStore } from 'react';

/**
 * State for a lazy-loaded data module.
 */
export interface LazyDataState<T> {
  /** The loaded data, or undefined if still loading or failed. */
  data: T | undefined;
  /** Whether the data is currently being fetched. */
  loading: boolean;
  /** Error from a failed dynamic import, or null. */
  error: Error | null;
  /** Re-attempts the dynamic import after a failure. */
  retry: () => void;
}

interface CacheEntry {
  status: 'pending' | 'resolved' | 'rejected';
  module?: unknown;
  error?: Error;
  promise: Promise<unknown>;
  subscribers: Set<() => void>;
}

/**
 * Module-level cache for dynamic import results.
 * Shared across all useLazyData instances.
 */
const moduleCache = new Map<string, CacheEntry>();

/** Exported for testing: clear the module cache. */
export function _clearModuleCache(): void {
  moduleCache.clear();
}

function getOrCreateEntry(cacheKey: string, importFn: () => Promise<unknown>): CacheEntry {
  let entry = moduleCache.get(cacheKey);
  if (entry) return entry;

  const subscribers = new Set<() => void>();
  const promise = importFn().then(
    (mod) => {
      entry!.status = 'resolved';
      entry!.module = mod;
      subscribers.forEach(cb => cb());
    },
    (err) => {
      entry!.status = 'rejected';
      entry!.error = err instanceof Error ? err : new Error(String(err));
      subscribers.forEach(cb => cb());
    }
  );

  entry = { status: 'pending', promise, subscribers };
  moduleCache.set(cacheKey, entry);
  return entry;
}

/**
 * Hook that dynamically imports a data module and provides loading/error/retry state.
 *
 * Uses `useSyncExternalStore` to subscribe to the module loading state,
 * ensuring synchronous resolution when the module is already cached.
 *
 * @param importFn A stable callback returning a dynamic import promise
 * @param selector Optional function to extract specific exports from the module
 */
export function useLazyData<TModule, TData = TModule>(
  importFn: () => Promise<TModule>,
  selector?: (mod: TModule) => TData
): LazyDataState<TData> {
  const cacheKey = importFn.toString();
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  // Trigger the import eagerly (outside of effects)
  const entry = getOrCreateEntry(cacheKey, importFn as () => Promise<unknown>);

  const subscribe = useCallback((onStoreChange: () => void) => {
    entry.subscribers.add(onStoreChange);
    return () => { entry.subscribers.delete(onStoreChange); };
  }, [entry]);

  const getSnapshot = useCallback(() => {
    return entry.status;
  }, [entry]);

  // Subscribe to status changes
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const retry = useCallback(() => {
    moduleCache.delete(cacheKey);
    // Force re-render by triggering subscribers
    const newEntry = getOrCreateEntry(cacheKey, importFn as () => Promise<unknown>);
    // Transfer existing subscribers
    entry.subscribers.forEach(cb => {
      newEntry.subscribers.add(cb);
      cb(); // trigger re-render
    });
  }, [cacheKey, importFn, entry]);

  if (entry.status === 'resolved') {
    const sel = selectorRef.current;
    const data = sel ? sel(entry.module as TModule) : (entry.module as unknown as TData);
    return { data, loading: false, error: null, retry };
  }

  if (entry.status === 'rejected') {
    return { data: undefined, loading: false, error: entry.error!, retry };
  }

  return { data: undefined, loading: true, error: null, retry };
}
