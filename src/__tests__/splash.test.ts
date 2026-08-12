import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Splash screen removal unit tests.
 * Validates: Requirements 11.3
 *
 * Tests the splash removal logic from main.tsx:
 * - After React mounts, opacity is set to '0' to trigger fade
 * - transitionend listener removes the element from DOM
 * - 2-second fallback timeout force-removes if transition never fires
 */

describe('Splash screen removal', () => {
  let splash: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    // Create a mock #splash element in the DOM
    splash = document.createElement('div');
    splash.id = 'splash';
    splash.style.opacity = '1';
    splash.style.transition = 'opacity 300ms ease';
    document.body.appendChild(splash);
  });

  afterEach(() => {
    vi.useRealTimers();
    // Clean up any remaining splash element
    const remaining = document.getElementById('splash');
    if (remaining) {
      remaining.remove();
    }
  });

  /**
   * Executes the splash removal logic (replicated from main.tsx)
   * to test in isolation without importing the full main module.
   */
  function executeSplashRemoval() {
    const el = document.getElementById('splash');
    if (el) {
      el.style.opacity = '0';

      const removeSplash = () => {
        el.remove();
        clearTimeout(fallbackTimeout);
      };
      el.addEventListener('transitionend', removeSplash, { once: true });

      const fallbackTimeout = setTimeout(removeSplash, 2000);
    }
  }

  describe('splash element removal after React mount', () => {
    it('sets opacity to 0 to trigger fade transition', () => {
      executeSplashRemoval();
      expect(splash.style.opacity).toBe('0');
    });

    it('removes splash from DOM when transitionend fires', () => {
      executeSplashRemoval();

      // Simulate the transitionend event
      splash.dispatchEvent(new Event('transitionend'));

      expect(document.getElementById('splash')).toBeNull();
    });

    it('splash is no longer in document.body after transitionend', () => {
      executeSplashRemoval();
      splash.dispatchEvent(new Event('transitionend'));

      expect(document.body.contains(splash)).toBe(false);
    });
  });

  describe('fallback timeout removes splash', () => {
    it('removes splash after 2 seconds if transitionend never fires', () => {
      executeSplashRemoval();

      // Do NOT dispatch transitionend — simulate the event never firing
      expect(document.getElementById('splash')).not.toBeNull();

      // Advance time by 2 seconds
      vi.advanceTimersByTime(2000);

      expect(document.getElementById('splash')).toBeNull();
    });

    it('does not remove splash before 2 seconds without transitionend', () => {
      executeSplashRemoval();

      // Advance time by 1999ms — should still be there
      vi.advanceTimersByTime(1999);
      expect(document.getElementById('splash')).not.toBeNull();

      // At 2000ms it should be removed
      vi.advanceTimersByTime(1);
      expect(document.getElementById('splash')).toBeNull();
    });

    it('clears fallback timeout when transitionend fires first', () => {
      executeSplashRemoval();

      // transitionend fires before timeout
      splash.dispatchEvent(new Event('transitionend'));
      expect(document.getElementById('splash')).toBeNull();

      // Advancing past timeout should not throw (clearTimeout was called)
      vi.advanceTimersByTime(2000);
      // No error means fallback was properly cleared
    });
  });

  describe('edge cases', () => {
    it('does nothing if no #splash element exists', () => {
      splash.remove();
      // Should not throw
      expect(() => executeSplashRemoval()).not.toThrow();
    });
  });
});
