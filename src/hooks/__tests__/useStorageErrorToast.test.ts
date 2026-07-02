import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStorageErrorToast } from '../useStorageErrorToast';
import { setItem } from '../../storage/local-storage';

describe('useStorageErrorToast', () => {
  let originalSetItem: typeof Storage.prototype.setItem;

  beforeEach(() => {
    originalSetItem = Storage.prototype.setItem;
  });

  afterEach(() => {
    Storage.prototype.setItem = originalSetItem;
  });

  it('initially returns null message', () => {
    const { result } = renderHook(() => useStorageErrorToast());
    expect(result.current.message).toBeNull();
  });

  it('sets quota-exceeded message when storage error fires', () => {
    const { result } = renderHook(() => useStorageErrorToast());

    act(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('quota exceeded', 'QuotaExceededError');
      };
      setItem('test-key', 'test-value');
    });

    expect(result.current.message).toBe(
      'Save failed \u2014 storage is full. Free up space in Settings.'
    );
  });

  it('sets unavailable message when storage is unavailable', () => {
    const { result } = renderHook(() => useStorageErrorToast());

    act(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('storage unavailable', 'SecurityError');
      };
      setItem('test-key', 'test-value');
    });

    expect(result.current.message).toBe(
      'Cannot save \u2014 storage is unavailable in this browsing mode.'
    );
  });

  it('clearMessage resets message to null', () => {
    const { result } = renderHook(() => useStorageErrorToast());

    act(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('quota exceeded', 'QuotaExceededError');
      };
      setItem('test-key', 'test-value');
    });

    expect(result.current.message).not.toBeNull();

    act(() => {
      result.current.clearMessage();
    });

    expect(result.current.message).toBeNull();
  });

  it('unsubscribes from storage errors on unmount', () => {
    const { result, unmount } = renderHook(() => useStorageErrorToast());

    unmount();

    // After unmount, triggering an error should not update state
    Storage.prototype.setItem = () => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    };
    setItem('test-key', 'test-value');

    // Message should still be null since hook unmounted
    expect(result.current.message).toBeNull();
  });

  it('does not interfere with successful writes (no message set)', () => {
    const { result } = renderHook(() => useStorageErrorToast());

    act(() => {
      // Use real setItem with working localStorage
      setItem('test-key', 'test-value');
    });

    expect(result.current.message).toBeNull();

    // Clean up
    localStorage.removeItem('test-key');
  });
});
