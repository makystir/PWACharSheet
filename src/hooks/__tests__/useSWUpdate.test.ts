import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SWUpdateState } from '../../sw/types';

// --- Mock helpers ---

interface MockServiceWorker {
  state: string;
  postMessage: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  _stateChangeListeners: Array<() => void>;
  _triggerStateChange: (newState: string) => void;
}

interface MockRegistration {
  installing: MockServiceWorker | null;
  waiting: MockServiceWorker | null;
  active: MockServiceWorker | null;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  _updateFoundListeners: Array<() => void>;
}

function createMockWorker(state = 'installing'): MockServiceWorker {
  const stateChangeListeners: Array<() => void> = [];
  const worker: MockServiceWorker = {
    state,
    postMessage: vi.fn(),
    addEventListener: vi.fn((event: string, handler: () => void) => {
      if (event === 'statechange') {
        stateChangeListeners.push(handler);
      }
    }),
    removeEventListener: vi.fn(),
    _stateChangeListeners: stateChangeListeners,
    _triggerStateChange(newState: string) {
      worker.state = newState;
      for (const listener of stateChangeListeners) {
        listener();
      }
    },
  };
  return worker;
}

function createMockRegistration(options?: {
  waiting?: MockServiceWorker | null;
  installing?: MockServiceWorker | null;
}): MockRegistration {
  const updateFoundListeners: Array<() => void> = [];
  return {
    installing: options?.installing ?? null,
    waiting: options?.waiting ?? null,
    active: null,
    addEventListener: vi.fn((event: string, handler: () => void) => {
      if (event === 'updatefound') {
        updateFoundListeners.push(handler);
      }
    }),
    removeEventListener: vi.fn(),
    _updateFoundListeners: updateFoundListeners,
  };
}

describe('registerServiceWorker', () => {
  let originalServiceWorker: PropertyDescriptor | undefined;
  let loadListeners: Array<() => void>;
  let controllerChangeListeners: Array<(event?: unknown) => void>;
  let mockNavigatorSW: {
    register: ReturnType<typeof vi.fn>;
    addEventListener: ReturnType<typeof vi.fn>;
    controller: MockServiceWorker | null;
  };

  beforeEach(() => {
    vi.resetModules();
    originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
    loadListeners = [];
    controllerChangeListeners = [];

    // Mock window.addEventListener for 'load'
    const originalWindowAddEventListener = window.addEventListener.bind(window);
    vi.spyOn(window, 'addEventListener').mockImplementation(
      (event: string, handler: EventListenerOrEventListenerObject, ...args: unknown[]) => {
        if (event === 'load') {
          loadListeners.push(handler as () => void);
        } else {
          originalWindowAddEventListener(event, handler, ...(args as [unknown]));
        }
      },
    );

    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: vi.fn() },
    });

    mockNavigatorSW = {
      register: vi.fn(),
      addEventListener: vi.fn((event: string, handler: () => void) => {
        if (event === 'controllerchange') {
          controllerChangeListeners.push(handler);
        }
      }),
      controller: null,
    };
  });

  afterEach(() => {
    if (originalServiceWorker) {
      Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker);
    } else {
      // Restore to a state where serviceWorker exists (jsdom default)
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: undefined,
      });
    }
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function setupServiceWorkerAvailable() {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: mockNavigatorSW,
    });
  }

  function setupServiceWorkerUnavailable() {
    // Remove serviceWorker from navigator to simulate unsupported browsers
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      get: () => undefined,
    });
    // Also need to make `'serviceWorker' in navigator` return false
    // The simplest approach: delete it if possible, or redefine
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (navigator as any).serviceWorker;
  }

  async function importModule() {
    const mod = await import('../../sw-register');
    return mod.registerServiceWorker;
  }

  // --- Test 1: Skips registration when navigator.serviceWorker not available ---
  it('skips registration when navigator.serviceWorker is not available (Req 8.5)', async () => {
    setupServiceWorkerUnavailable();
    const registerServiceWorker = await importModule();

    const api = registerServiceWorker('/PWACharSheet/');

    // Should return API without registering
    expect(api.subscribe).toBeInstanceOf(Function);
    expect(api.applyUpdate).toBeInstanceOf(Function);
    expect(api.dismiss).toBeInstanceOf(Function);

    // No load listener added for registration since SW not available
    // (window.addEventListener may still be called for other things)
    expect(loadListeners).toHaveLength(0);
  });

  // --- Test 2: Registers SW after window load event ---
  it('registers service worker after window load event (Req 8.1)', async () => {
    setupServiceWorkerAvailable();
    const mockReg = createMockRegistration();
    mockNavigatorSW.register.mockResolvedValue(mockReg);
    const registerServiceWorker = await importModule();

    registerServiceWorker('/PWACharSheet/');

    // Before load, register should not have been called
    expect(mockNavigatorSW.register).not.toHaveBeenCalled();

    // Fire the load event
    for (const listener of loadListeners) {
      listener();
    }

    // Allow promise to resolve
    await vi.waitFor(() => {
      expect(mockNavigatorSW.register).toHaveBeenCalledWith('/PWACharSheet/sw.js');
    });
  });

  // --- Test 3: Detects existing waiting worker on registration ---
  it('detects existing waiting worker on registration and notifies updateAvailable (Req 8.4)', async () => {
    setupServiceWorkerAvailable();
    const waitingWorker = createMockWorker('installed');
    const mockReg = createMockRegistration({ waiting: waitingWorker });
    mockNavigatorSW.register.mockResolvedValue(mockReg);
    const registerServiceWorker = await importModule();

    const api = registerServiceWorker('/PWACharSheet/');
    const listener = vi.fn<[SWUpdateState], void>();
    api.subscribe(listener);

    // Fire load
    for (const l of loadListeners) l();

    await vi.waitFor(() => {
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ updateAvailable: true }),
      );
    });
  });

  // --- Test 4: Tracks installing worker's statechange ---
  it('tracks installing worker statechange and notifies when state becomes installed (Req 8.2, 8.3)', async () => {
    setupServiceWorkerAvailable();
    const installingWorker = createMockWorker('installing');
    const mockReg = createMockRegistration();
    mockNavigatorSW.register.mockResolvedValue(mockReg);
    // Simulate there's already a controller (existing SW)
    mockNavigatorSW.controller = createMockWorker('activated');
    const registerServiceWorker = await importModule();

    const api = registerServiceWorker('/PWACharSheet/');
    const listener = vi.fn<[SWUpdateState], void>();
    api.subscribe(listener);

    // Fire load event
    for (const l of loadListeners) l();
    await vi.waitFor(() => {
      expect(mockNavigatorSW.register).toHaveBeenCalled();
    });

    // Simulate updatefound event
    mockReg.installing = installingWorker;
    for (const handler of mockReg._updateFoundListeners) handler();

    // Simulate worker transitions to installed
    installingWorker._triggerStateChange('installed');

    await vi.waitFor(() => {
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ updateAvailable: true }),
      );
    });
  });

  // --- Test 5: applyUpdate() posts SKIP_WAITING message to waiting worker ---
  it('applyUpdate() posts SKIP_WAITING message to waiting worker (Req 4.4)', async () => {
    vi.useFakeTimers();
    setupServiceWorkerAvailable();
    const waitingWorker = createMockWorker('installed');
    const mockReg = createMockRegistration({ waiting: waitingWorker });
    mockNavigatorSW.register.mockResolvedValue(mockReg);
    const registerServiceWorker = await importModule();

    const api = registerServiceWorker('/PWACharSheet/');

    // Fire load event
    for (const l of loadListeners) l();
    await vi.waitFor(() => {
      expect(mockNavigatorSW.register).toHaveBeenCalled();
    });

    // Call applyUpdate (don't await since it will block on race)
    const updatePromise = api.applyUpdate();

    // Simulate controllerchange so the promise resolves
    for (const handler of controllerChangeListeners) handler();

    await updatePromise;

    expect(waitingWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  // --- Test 6: applyUpdate() reloads page on controllerchange event ---
  it('applyUpdate() reloads page on controllerchange event (Req 5.6)', async () => {
    vi.useFakeTimers();
    setupServiceWorkerAvailable();
    const waitingWorker = createMockWorker('installed');
    const mockReg = createMockRegistration({ waiting: waitingWorker });
    mockNavigatorSW.register.mockResolvedValue(mockReg);
    const registerServiceWorker = await importModule();

    const api = registerServiceWorker('/PWACharSheet/');

    // Fire load event
    for (const l of loadListeners) l();
    await vi.waitFor(() => {
      expect(mockNavigatorSW.register).toHaveBeenCalled();
    });

    const updatePromise = api.applyUpdate();

    // Simulate controllerchange
    for (const handler of controllerChangeListeners) handler();

    await updatePromise;

    expect(window.location.reload).toHaveBeenCalled();
  });

  // --- Test 7: applyUpdate() sets error state on 5s timeout ---
  it('applyUpdate() sets error state on 5s timeout (Req 4.6)', async () => {
    vi.useFakeTimers();
    setupServiceWorkerAvailable();
    const waitingWorker = createMockWorker('installed');
    const mockReg = createMockRegistration({ waiting: waitingWorker });
    mockNavigatorSW.register.mockResolvedValue(mockReg);
    const registerServiceWorker = await importModule();

    const api = registerServiceWorker('/PWACharSheet/');
    const listener = vi.fn<[SWUpdateState], void>();
    api.subscribe(listener);

    // Fire load event
    for (const l of loadListeners) l();
    await vi.waitFor(() => {
      expect(mockNavigatorSW.register).toHaveBeenCalled();
    });

    // Start applyUpdate
    const updatePromise = api.applyUpdate();

    // Advance time by 5 seconds without firing controllerchange
    vi.advanceTimersByTime(5000);

    await updatePromise;

    // Should have notified with error
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        applying: false,
        error: expect.stringContaining('timed out'),
      }),
    );
  });

  // --- Test 8: dismiss() sets updateAvailable to false ---
  it('dismiss() sets updateAvailable to false (Req 5.5)', async () => {
    setupServiceWorkerAvailable();
    const waitingWorker = createMockWorker('installed');
    const mockReg = createMockRegistration({ waiting: waitingWorker });
    mockNavigatorSW.register.mockResolvedValue(mockReg);
    const registerServiceWorker = await importModule();

    const api = registerServiceWorker('/PWACharSheet/');
    const listener = vi.fn<[SWUpdateState], void>();
    api.subscribe(listener);

    // Fire load event to trigger registration and detection of waiting worker
    for (const l of loadListeners) l();
    await vi.waitFor(() => {
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ updateAvailable: true }),
      );
    });

    // Dismiss
    api.dismiss();

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ updateAvailable: false }),
    );
  });

  // --- Test 9: Failed registration logs error and continues ---
  it('failed registration logs error to console and continues (Req 8.5)', async () => {
    setupServiceWorkerAvailable();
    const error = new Error('Registration failed');
    mockNavigatorSW.register.mockRejectedValue(error);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const registerServiceWorker = await importModule();

    const api = registerServiceWorker('/PWACharSheet/');

    // Fire load event
    for (const l of loadListeners) l();

    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Service worker registration failed'),
        error,
      );
    });

    // API still functional
    expect(api.subscribe).toBeInstanceOf(Function);
    expect(api.dismiss).toBeInstanceOf(Function);
  });

  // --- Test 10: Subscriber receives current state immediately on subscribe ---
  it('subscriber receives current state immediately on subscribe (Req 8.2)', async () => {
    setupServiceWorkerAvailable();
    const mockReg = createMockRegistration();
    mockNavigatorSW.register.mockResolvedValue(mockReg);
    const registerServiceWorker = await importModule();

    const api = registerServiceWorker('/PWACharSheet/');
    const listener = vi.fn<[SWUpdateState], void>();

    api.subscribe(listener);

    // Should have been called immediately with initial state
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      updateAvailable: false,
      applying: false,
      error: null,
    });
  });
});
