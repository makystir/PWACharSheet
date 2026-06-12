import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useBodyScrollLock } from '../useBodyScrollLock';

describe('useBodyScrollLock', () => {
  let originalOverflow: string;

  beforeEach(() => {
    originalOverflow = document.body.style.overflow;
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = originalOverflow;
  });

  it('sets body overflow to hidden when locked', () => {
    renderHook(() => useBodyScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('does not change body overflow when not locked', () => {
    document.body.style.overflow = 'auto';
    renderHook(() => useBodyScrollLock(false));
    expect(document.body.style.overflow).toBe('auto');
  });

  it('restores body overflow when unlocked after being locked', () => {
    document.body.style.overflow = 'scroll';
    const { rerender } = renderHook(
      ({ isLocked }) => useBodyScrollLock(isLocked),
      { initialProps: { isLocked: true } }
    );

    expect(document.body.style.overflow).toBe('hidden');

    rerender({ isLocked: false });
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('restores body overflow on unmount', () => {
    document.body.style.overflow = 'visible';
    const { unmount } = renderHook(() => useBodyScrollLock(true));

    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('visible');
  });

  it('preserves empty string as the previous overflow value', () => {
    document.body.style.overflow = '';
    const { unmount } = renderHook(() => useBodyScrollLock(true));

    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
