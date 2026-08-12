import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUndoStack } from '../useUndoStack';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useUndoStack — push and undo', () => {
  it('starts with canUndo false and empty stack', () => {
    const { result } = renderHook(() => useUndoStack());
    expect(result.current.canUndo).toBe(false);
  });

  it('canUndo becomes true after pushing an entry', () => {
    const { result } = renderHook(() => useUndoStack());

    act(() => {
      result.current.push({ field: 'chars.WS.a', previousValue: 30, newValue: 35 });
    });

    expect(result.current.canUndo).toBe(true);
  });

  it('undo returns the most recently pushed entry', () => {
    const { result } = renderHook(() => useUndoStack());

    act(() => {
      result.current.push({ field: 'chars.WS.a', previousValue: 30, newValue: 35 });
    });
    act(() => {
      result.current.push({ field: 'chars.BS.a', previousValue: 25, newValue: 30 });
    });

    let entry: ReturnType<typeof result.current.undo>;
    act(() => {
      entry = result.current.undo();
    });

    expect(entry!).not.toBeNull();
    expect(entry!.field).toBe('chars.BS.a');
    expect(entry!.previousValue).toBe(25);
    expect(entry!.newValue).toBe(30);
  });

  it('undo returns null when stack is empty', () => {
    const { result } = renderHook(() => useUndoStack());

    let entry: ReturnType<typeof result.current.undo>;
    act(() => {
      entry = result.current.undo();
    });

    expect(entry!).toBeNull();
  });

  it('undo removes entry from stack (LIFO order)', () => {
    const { result } = renderHook(() => useUndoStack());

    act(() => {
      result.current.push({ field: 'a', previousValue: 1, newValue: 2 });
    });
    act(() => {
      result.current.push({ field: 'b', previousValue: 3, newValue: 4 });
    });
    act(() => {
      result.current.push({ field: 'c', previousValue: 5, newValue: 6 });
    });

    let entry: ReturnType<typeof result.current.undo>;

    act(() => { entry = result.current.undo(); });
    expect(entry!.field).toBe('c');

    act(() => { entry = result.current.undo(); });
    expect(entry!.field).toBe('b');

    act(() => { entry = result.current.undo(); });
    expect(entry!.field).toBe('a');

    act(() => { entry = result.current.undo(); });
    expect(entry!).toBeNull();

    expect(result.current.canUndo).toBe(false);
  });

  it('push adds a timestamp to the entry', () => {
    const now = 1700000000000;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const { result } = renderHook(() => useUndoStack());

    act(() => {
      result.current.push({ field: 'test', previousValue: 'old', newValue: 'new' });
    });

    let entry: ReturnType<typeof result.current.undo>;
    act(() => {
      entry = result.current.undo();
    });

    expect(entry!.timestamp).toBe(now);
  });
});

describe('useUndoStack — maxSize eviction', () => {
  it('defaults to max size of 10', () => {
    const { result } = renderHook(() => useUndoStack());

    // Push 15 entries
    for (let i = 0; i < 15; i++) {
      act(() => {
        result.current.push({ field: `field-${i}`, previousValue: i, newValue: i + 1 });
      });
    }

    // Undo should only return 10 entries (the 10 most recent)
    let count = 0;
    let entry: ReturnType<typeof result.current.undo>;
    do {
      act(() => { entry = result.current.undo(); });
      if (entry !== null) count++;
    } while (entry !== null);

    expect(count).toBe(10);
  });

  it('evicts oldest entries when exceeding maxSize', () => {
    const { result } = renderHook(() => useUndoStack(3));

    act(() => { result.current.push({ field: 'a', previousValue: 1, newValue: 2 }); });
    act(() => { result.current.push({ field: 'b', previousValue: 3, newValue: 4 }); });
    act(() => { result.current.push({ field: 'c', previousValue: 5, newValue: 6 }); });
    act(() => { result.current.push({ field: 'd', previousValue: 7, newValue: 8 }); });

    // Only 3 entries should remain: d, c, b (oldest 'a' evicted)
    let entry: ReturnType<typeof result.current.undo>;

    act(() => { entry = result.current.undo(); });
    expect(entry!.field).toBe('d');

    act(() => { entry = result.current.undo(); });
    expect(entry!.field).toBe('c');

    act(() => { entry = result.current.undo(); });
    expect(entry!.field).toBe('b');

    act(() => { entry = result.current.undo(); });
    expect(entry!).toBeNull();
  });

  it('accepts a custom maxSize parameter', () => {
    const { result } = renderHook(() => useUndoStack(5));

    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current.push({ field: `f-${i}`, previousValue: i, newValue: i + 1 });
      });
    }

    // Only 5 entries should remain
    let count = 0;
    let entry: ReturnType<typeof result.current.undo>;
    do {
      act(() => { entry = result.current.undo(); });
      if (entry !== null) count++;
    } while (entry !== null);

    expect(count).toBe(5);
  });

  it('most recent entries survive eviction', () => {
    const { result } = renderHook(() => useUndoStack(2));

    act(() => { result.current.push({ field: 'old', previousValue: 0, newValue: 1 }); });
    act(() => { result.current.push({ field: 'mid', previousValue: 2, newValue: 3 }); });
    act(() => { result.current.push({ field: 'new', previousValue: 4, newValue: 5 }); });

    // Only 'new' and 'mid' should remain
    let entry: ReturnType<typeof result.current.undo>;

    act(() => { entry = result.current.undo(); });
    expect(entry!.field).toBe('new');

    act(() => { entry = result.current.undo(); });
    expect(entry!.field).toBe('mid');

    act(() => { entry = result.current.undo(); });
    expect(entry!).toBeNull();
  });
});

describe('useUndoStack — clear', () => {
  it('empties the stack and sets canUndo to false', () => {
    const { result } = renderHook(() => useUndoStack());

    act(() => { result.current.push({ field: 'a', previousValue: 1, newValue: 2 }); });
    act(() => { result.current.push({ field: 'b', previousValue: 3, newValue: 4 }); });
    expect(result.current.canUndo).toBe(true);

    act(() => { result.current.clear(); });

    expect(result.current.canUndo).toBe(false);
  });

  it('undo returns null after clear', () => {
    const { result } = renderHook(() => useUndoStack());

    act(() => { result.current.push({ field: 'a', previousValue: 1, newValue: 2 }); });
    act(() => { result.current.clear(); });

    let entry: ReturnType<typeof result.current.undo>;
    act(() => { entry = result.current.undo(); });
    expect(entry!).toBeNull();
  });

  it('pushing after clear works normally', () => {
    const { result } = renderHook(() => useUndoStack());

    act(() => { result.current.push({ field: 'a', previousValue: 1, newValue: 2 }); });
    act(() => { result.current.clear(); });
    act(() => { result.current.push({ field: 'b', previousValue: 3, newValue: 4 }); });

    expect(result.current.canUndo).toBe(true);

    let entry: ReturnType<typeof result.current.undo>;
    act(() => { entry = result.current.undo(); });
    expect(entry!.field).toBe('b');
  });
});
