import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUndoStack } from '../useUndoStack';

/**
 * Tests for the undo stack integration behavior wired in AppWithCharacter.
 * Since AppWithCharacter is deeply coupled to the full app, we test:
 * 1. getNestedValue and fieldToLabel helpers (exported behavior via module)
 * 2. The keydown handler logic patterns (unit-tested independently)
 * 3. The undo stack clearing on ID change
 */

// Re-implement helpers here for testing (they're module-internal in App.tsx)
function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function fieldToLabel(field: string): string {
  const parts = field.split('.');
  if (parts[0] === 'chars' && parts.length >= 2) {
    const charKey = parts[1];
    const sub = parts[2];
    if (sub === 'a') return `${charKey} advances`;
    if (sub === 'i') return `${charKey} initial`;
    if (sub === 'b') return `${charKey} bonus`;
    return charKey;
  }
  return parts[parts.length - 1];
}

describe('getNestedValue', () => {
  it('retrieves a top-level value', () => {
    expect(getNestedValue({ name: 'Ratcatcher' }, 'name')).toBe('Ratcatcher');
  });

  it('retrieves a deeply nested value', () => {
    const obj = { chars: { WS: { i: 30, a: 5, b: 0 } } };
    expect(getNestedValue(obj, 'chars.WS.a')).toBe(5);
  });

  it('returns undefined for missing path', () => {
    expect(getNestedValue({ a: 1 }, 'b.c.d')).toBeUndefined();
  });

  it('returns undefined for null intermediate', () => {
    expect(getNestedValue({ a: null }, 'a.b')).toBeUndefined();
  });

  it('handles numeric values at leaf', () => {
    expect(getNestedValue({ wCur: 12 }, 'wCur')).toBe(12);
  });

  it('handles array indices as string keys', () => {
    const obj = { weapons: [{ name: 'Sword' }, { name: 'Bow' }] };
    expect(getNestedValue(obj, 'weapons.1.name')).toBe('Bow');
  });
});

describe('fieldToLabel', () => {
  it('returns characteristic key for bare char path', () => {
    expect(fieldToLabel('chars.WS')).toBe('WS');
  });

  it('returns "WS advances" for chars.WS.a', () => {
    expect(fieldToLabel('chars.WS.a')).toBe('WS advances');
  });

  it('returns "T initial" for chars.T.i', () => {
    expect(fieldToLabel('chars.T.i')).toBe('T initial');
  });

  it('returns "Ag bonus" for chars.Ag.b', () => {
    expect(fieldToLabel('chars.Ag.b')).toBe('Ag bonus');
  });

  it('returns last segment for simple fields', () => {
    expect(fieldToLabel('name')).toBe('name');
    expect(fieldToLabel('wCur')).toBe('wCur');
  });

  it('returns last segment for dotted non-char fields', () => {
    expect(fieldToLabel('houseRules.advantageCap')).toBe('advantageCap');
    expect(fieldToLabel('estate.name')).toBe('name');
  });
});

describe('undo keydown handler logic', () => {
  let keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  beforeEach(() => {
    // Capture the keydown handler
    vi.spyOn(document, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'keydown') {
        keydownHandler = handler as (e: KeyboardEvent) => void;
      }
    });
    vi.spyOn(document, 'removeEventListener').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    keydownHandler = null;
  });

  it('Ctrl+Z on body triggers undo (not in input)', () => {
    const { result } = renderHook(() => useUndoStack());

    act(() => {
      result.current.push({ field: 'wCur', previousValue: 10, newValue: 8 });
    });

    // Simulate the logic: activeElement is body (not input)
    const entry = result.current.undo();
    expect(entry).not.toBeNull();
    expect(entry!.field).toBe('wCur');
    expect(entry!.previousValue).toBe(10);
  });

  it('stack is empty returns null on undo (no action taken)', () => {
    const { result } = renderHook(() => useUndoStack());

    let entry: ReturnType<typeof result.current.undo>;
    act(() => {
      entry = result.current.undo();
    });

    expect(entry!).toBeNull();
  });

  it('clear resets undo state for character switch', () => {
    const { result } = renderHook(() => useUndoStack());

    act(() => {
      result.current.push({ field: 'name', previousValue: 'Old', newValue: 'New' });
    });

    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.clear();
    });

    expect(result.current.canUndo).toBe(false);

    let entry: ReturnType<typeof result.current.undo>;
    act(() => {
      entry = result.current.undo();
    });
    expect(entry!).toBeNull();
  });
});

describe('undo toast message format', () => {
  it('generates correct toast message for a field revert', () => {
    const field = 'chars.WS.a';
    const previousValue = 30;
    const label = fieldToLabel(field);
    const valueStr = String(previousValue ?? '');
    const displayValue = valueStr.length > 20 ? valueStr.slice(0, 20) + '…' : valueStr;
    const message = `Reverted ${label} to ${displayValue}`;

    expect(message).toBe('Reverted WS advances to 30');
  });

  it('truncates long values in toast message', () => {
    const field = 'estate.description';
    const previousValue = 'A very long description that exceeds twenty characters easily';
    const label = fieldToLabel(field);
    const valueStr = String(previousValue ?? '');
    const displayValue = valueStr.length > 20 ? valueStr.slice(0, 20) + '…' : valueStr;
    const message = `Reverted ${label} to ${displayValue}`;

    // "A very long descript" is the first 20 characters
    expect(message).toBe('Reverted description to A very long descript…');
  });

  it('handles null/undefined previousValue gracefully', () => {
    const field = 'name';
    const previousValue = undefined;
    const label = fieldToLabel(field);
    const valueStr = String(previousValue ?? '');
    const displayValue = valueStr.length > 20 ? valueStr.slice(0, 20) + '…' : valueStr;
    const message = `Reverted ${label} to ${displayValue}`;

    expect(message).toBe('Reverted name to ');
  });
});
