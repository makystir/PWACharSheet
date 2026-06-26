import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { triggerRollHaptic } from '../haptics';

describe('triggerRollHaptic', () => {
  let vibrateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers 50ms vibration for a standard roll', () => {
    triggerRollHaptic(false, false);
    expect(vibrateMock).toHaveBeenCalledWith(50);
  });

  it('triggers [50, 30, 50] pattern for a critical roll', () => {
    triggerRollHaptic(true, false);
    expect(vibrateMock).toHaveBeenCalledWith([50, 30, 50]);
  });

  it('triggers 100ms vibration for a fumble roll', () => {
    triggerRollHaptic(false, true);
    expect(vibrateMock).toHaveBeenCalledWith(100);
  });

  it('fumble overrides critical when both are true', () => {
    triggerRollHaptic(true, true);
    expect(vibrateMock).toHaveBeenCalledWith(100);
  });

  it('skips silently when navigator.vibrate is undefined', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    // Should not throw
    expect(() => triggerRollHaptic(false, false)).not.toThrow();
  });

  it('skips silently when navigator.vibrate is not a function', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: 'not-a-function',
      writable: true,
      configurable: true,
    });
    expect(() => triggerRollHaptic(true, false)).not.toThrow();
  });
});
