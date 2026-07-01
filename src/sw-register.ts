import type { SWUpdateState, SWUpdateListener, SkipWaitingMessage } from './sw/types';

/**
 * Registers the service worker and manages update lifecycle.
 * Returns an API for subscribing to update state, applying updates, and dismissing prompts.
 */
export function registerServiceWorker(baseUrl: string): {
  subscribe: (listener: SWUpdateListener) => () => void;
  applyUpdate: () => Promise<void>;
  dismiss: () => void;
} {
  const listeners = new Set<SWUpdateListener>();
  let state: SWUpdateState = {
    updateAvailable: false,
    applying: false,
    error: null,
  };
  let registration: ServiceWorkerRegistration | undefined;

  function notify(): void {
    const snapshot = { ...state };
    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  function setState(partial: Partial<SWUpdateState>): void {
    state = { ...state, ...partial };
    notify();
  }

  function trackInstallingWorker(worker: ServiceWorker): void {
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        // A new worker installed while an existing one controls the page = update available
        setState({ updateAvailable: true });
      }
    });
  }

  function subscribe(listener: SWUpdateListener): () => void {
    listeners.add(listener);
    // Immediately notify with current state
    listener({ ...state });
    return () => {
      listeners.delete(listener);
    };
  }

  async function applyUpdate(): Promise<void> {
    const waitingWorker = registration?.waiting;
    if (!waitingWorker) {
      setState({ error: 'No waiting worker available' });
      return;
    }

    setState({ applying: true, error: null });

    const message: SkipWaitingMessage = { type: 'SKIP_WAITING' };
    waitingWorker.postMessage(message);

    // Set up a 5-second timeout for controller change
    const timeout = new Promise<'timeout'>((resolve) =>
      setTimeout(() => resolve('timeout'), 5000),
    );

    const controllerChanged = new Promise<'changed'>((resolve) => {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        resolve('changed');
      }, { once: true });
    });

    const result = await Promise.race([timeout, controllerChanged]);

    if (result === 'timeout') {
      setState({
        applying: false,
        error: 'Update timed out. Please reload the page manually.',
      });
    } else {
      // controllerchange fired — reload the page
      window.location.reload();
    }
  }

  function dismiss(): void {
    setState({ updateAvailable: false });
  }

  // Skip registration if service worker API is not available
  if (!('serviceWorker' in navigator)) {
    return { subscribe, applyUpdate, dismiss };
  }

  // Register after the window load event
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(baseUrl + 'sw.js')
      .then((reg) => {
        registration = reg;

        // Check if there's already a waiting worker
        if (reg.waiting) {
          setState({ updateAvailable: true });
        }

        // Listen for new updates
        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            trackInstallingWorker(installingWorker);
          }
        });
      })
      .catch((err) => {
        // Registration failed — log and continue without caching
        console.error('Service worker registration failed:', err);
      });
  });

  // Listen for controllerchange to reload when a new SW takes over
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Only reload if we're not already in the middle of applying an update
    // (applyUpdate handles its own reload)
    if (!state.applying) {
      window.location.reload();
    }
  });

  return { subscribe, applyUpdate, dismiss };
}
