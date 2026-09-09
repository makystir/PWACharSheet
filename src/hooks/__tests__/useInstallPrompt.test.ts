import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInstallPrompt } from '../useInstallPrompt';

/**
 * Tests for the PWA install-availability hook (spec: ux-audit-improvements, Req 6).
 *
 * jsdom does not implement `beforeinstallprompt`, `appinstalled`, or `matchMedia`
 * (the latter is defaulted in test-setup.ts to `{ matches: false }`), so we
 * fabricate the browser event and override matchMedia per-test.
 */

/** Build a stand-in for the browser's `beforeinstallprompt` event. */
function createBeforeInstallPromptEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt') as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    platforms: string[];
  };
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome, platform: 'web' });
  event.platforms = ['web'];
  return event;
}

/** Force `matchMedia('(display-mode: standalone)')` to report installed/not. */
function mockStandaloneMatchMedia(standalone: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query === '(display-mode: standalone)' ? standalone : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

describe('useInstallPrompt — canInstall gating', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    // Default: browser not running standalone.
    mockStandaloneMatchMedia(false);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it('is false initially when no install event has been captured (unsupported browser)', () => {
    const { result } = renderHook(() => useInstallPrompt());
    // Requirement 6.5: no browser signal → hidden/false.
    expect(result.current.canInstall).toBe(false);
  });

  it('becomes true after a beforeinstallprompt event is captured', () => {
    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      window.dispatchEvent(createBeforeInstallPromptEvent());
    });

    // Requirement 6.1: capturing the event enables the affordance.
    expect(result.current.canInstall).toBe(true);
  });

  it('stays false when the app is already running installed, even after the event fires', () => {
    // Requirement 6.6: already installed (display-mode: standalone) → hidden/false.
    mockStandaloneMatchMedia(true);
    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      window.dispatchEvent(createBeforeInstallPromptEvent());
    });

    expect(result.current.canInstall).toBe(false);
  });

  it('returns to false after the app is installed (appinstalled event)', () => {
    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      window.dispatchEvent(createBeforeInstallPromptEvent());
    });
    expect(result.current.canInstall).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    // Requirement 6.6: once installed, the affordance is hidden.
    expect(result.current.canInstall).toBe(false);
  });
});

describe('useInstallPrompt — promptInstall', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    mockStandaloneMatchMedia(false);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it('invokes the captured browser prompt when activated', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = createBeforeInstallPromptEvent();

    act(() => {
      window.dispatchEvent(event);
    });

    await act(async () => {
      await result.current.promptInstall();
    });

    // Requirement 6.4: activating the control invokes the browser install prompt.
    expect(event.prompt).toHaveBeenCalledTimes(1);
    // The event is single-use, so the affordance is cleared afterwards.
    expect(result.current.canInstall).toBe(false);
  });

  it('is a no-op when no install event has been captured', async () => {
    const { result } = renderHook(() => useInstallPrompt());

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(result.current.canInstall).toBe(false);
  });
});
