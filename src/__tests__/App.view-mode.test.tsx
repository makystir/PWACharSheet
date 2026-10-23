import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';
import { BLANK_CHARACTER, type Character } from '../types/character';
import { encodeSharePayload } from '../logic/share-codec';

/**
 * App-level view-mode tests.
 *
 * (1) Mounting on a `#view/…` hash in a clean environment must perform NO
 *     localStorage.setItem and NO IndexedDB open/init (AC1/AC4) — startup
 *     migrations are skipped entirely in view mode.
 * (2) A fresh `#view/…` visit -> "Back to my characters" -> create character
 *     initialises the shell and persists the created character.
 */

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    ...structuredClone(BLANK_CHARACTER),
    name: 'Shared One',
    species: 'Human / Reiklander',
    ...overrides,
  };
}

function setHash(hash: string) {
  window.location.hash = hash;
}

beforeEach(() => {
  localStorage.clear();
  setHash('');
});

afterEach(() => {
  vi.restoreAllMocks();
  setHash('');
});

describe('App — view mode performs no storage work', () => {
  it('mounts on #view/ without any localStorage.setItem or IndexedDB open', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const idbOpenSpy = vi.spyOn(indexedDB, 'open');

    const encoded = await encodeSharePayload(JSON.stringify(makeCharacter()));
    setHash(`#view/${encoded}`);

    render(<App />);

    // The read-only viewer renders (not the welcome screen / shell).
    expect(await screen.findByText('Characteristics')).toBeInTheDocument();

    expect(setItemSpy).not.toHaveBeenCalled();
    expect(idbOpenSpy).not.toHaveBeenCalled();
  });
});

describe('App — Back to my characters transitions to the shell', () => {
  it('leaves view mode and persists a newly created character', async () => {
    const encoded = await encodeSharePayload(JSON.stringify(makeCharacter()));
    setHash(`#view/${encoded}`);

    render(<App />);
    await screen.findByText('Characteristics');

    // Navigate Back to my characters: the viewer clears the hash and fires a
    // synthetic hashchange, re-running App's init before the shell renders.
    act(() => {
      fireEvent.click(screen.getByText('Back to my characters'));
    });

    // With no characters, the welcome screen appears after real init runs.
    const quickStart = await screen.findByRole('button', { name: 'Quick Start' }, { timeout: 3000 });
    fireEvent.click(quickStart);

    const createInput = await screen.findByPlaceholderText('Character name');
    fireEvent.change(createInput, { target: { value: 'Freshly Made' } });

    // Submit the quick-create form.
    const createButton = screen.getByRole('button', { name: 'Create Character' });
    fireEvent.click(createButton);

    // The created character is persisted to localStorage.
    await waitFor(() => {
      const wroteCharacter = Object.keys(localStorage).some((k) =>
        (localStorage.getItem(k) ?? '').includes('Freshly Made'),
      );
      expect(wroteCharacter).toBe(true);
    });
  });
});
