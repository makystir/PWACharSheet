import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCharacterManager } from '../useCharacterManager';

// In-memory localStorage mock
let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
  });
  let uuidCounter = 0;
  vi.stubGlobal('crypto', {
    randomUUID: () => `hook-uuid-${++uuidCounter}`,
  });
});

/**
 * Validates: Requirements 3.1, 3.2, 4.1, 4.2
 */
describe('useCharacterManager.deleteCharacter — active character with others remaining', () => {
  it('switches activeCharacter to the new active character', () => {
    const { result } = renderHook(() => useCharacterManager());

    // Create two characters
    let idA: string;
    let idB: string;
    act(() => { idA = result.current.createCharacter('Alpha'); });
    act(() => { idB = result.current.createCharacter('Beta'); });
    // Switch to Alpha so it's active
    act(() => { result.current.switchCharacter(idA!); });

    expect(result.current.activeId).toBe(idA!);
    expect(result.current.activeCharacter?.name).toBe('Alpha');

    // Delete the active character
    let deleted: boolean;
    act(() => { deleted = result.current.deleteCharacter(idA!); });

    expect(deleted!).toBe(true);
    expect(result.current.activeId).toBe(idB!);
    expect(result.current.activeCharacter).not.toBeNull();
    expect(result.current.activeCharacter?.name).toBe('Beta');
    expect(result.current.characters).toHaveLength(1);
  });

  it('updates the character list to exclude the deleted character', () => {
    const { result } = renderHook(() => useCharacterManager());

    let idA: string;
    act(() => { idA = result.current.createCharacter('Alpha'); });
    act(() => { result.current.createCharacter('Beta'); });
    act(() => { result.current.switchCharacter(idA!); });

    act(() => { result.current.deleteCharacter(idA!); });

    const ids = result.current.characters.map((c) => c.id);
    expect(ids).not.toContain(idA!);
    expect(result.current.characters).toHaveLength(1);
  });
});

/**
 * Validates: Requirements 4.1, 4.2
 */
describe('useCharacterManager.deleteCharacter — last remaining character', () => {
  it('sets activeCharacter to null when no characters remain', () => {
    const { result } = renderHook(() => useCharacterManager());

    let id: string;
    act(() => { id = result.current.createCharacter('Only One'); });

    expect(result.current.activeCharacter).not.toBeNull();

    act(() => { result.current.deleteCharacter(id!); });

    expect(result.current.activeCharacter).toBeNull();
    expect(result.current.activeId).toBe('');
    expect(result.current.characters).toHaveLength(0);
  });

  it('transitions to empty state after deleting the last of multiple characters', () => {
    const { result } = renderHook(() => useCharacterManager());

    let idA: string;
    let idB: string;
    act(() => { idA = result.current.createCharacter('Alpha'); });
    act(() => { idB = result.current.createCharacter('Beta'); });

    // Delete first, then the remaining one
    act(() => { result.current.deleteCharacter(idA!); });
    expect(result.current.characters).toHaveLength(1);
    expect(result.current.activeCharacter).not.toBeNull();

    act(() => { result.current.deleteCharacter(idB!); });
    expect(result.current.activeCharacter).toBeNull();
    expect(result.current.activeId).toBe('');
    expect(result.current.characters).toHaveLength(0);
  });
});

describe('useCharacterManager.deleteCharacter — non-active character', () => {
  it('keeps the active character loaded and unchanged', () => {
    const { result } = renderHook(() => useCharacterManager());

    let idA: string;
    let idB: string;
    act(() => { idA = result.current.createCharacter('Active'); });
    act(() => { idB = result.current.createCharacter('Other'); });
    act(() => { result.current.switchCharacter(idA!); });

    const activeBefore = result.current.activeCharacter;

    act(() => { result.current.deleteCharacter(idB!); });

    expect(result.current.activeId).toBe(idA!);
    expect(result.current.activeCharacter?.name).toBe(activeBefore?.name);
    expect(result.current.characters).toHaveLength(1);
  });
});
