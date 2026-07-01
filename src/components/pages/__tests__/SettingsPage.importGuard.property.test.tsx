import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SettingsPage } from '../SettingsPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { CharacteristicKey, CharacteristicValue } from '../../../types/character';

/**
 * Validates: Requirements 1.1, 1.2, 2.1
 *
 * Property 1: Bug Condition - Valid Import Overwrites Character Without Confirmation Dialog
 *
 * This test encodes the EXPECTED behavior: when a valid character JSON file is selected
 * via "Import from File", the system should display a ConfirmDialog and NOT call
 * updateCharacter until the user explicitly confirms.
 *
 * On UNFIXED code, this test is EXPECTED TO FAIL — failure confirms the bug exists
 * (handleFileImport calls updateCharacter immediately without showing a dialog).
 */

// --- Generators ---

const CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

const arbitraryCharacteristicValue: fc.Arbitrary<CharacteristicValue> = fc.record({
  i: fc.integer({ min: 0, max: 99 }),
  a: fc.integer({ min: 0, max: 99 }),
  b: fc.integer({ min: 0, max: 9 }),
});

const arbitraryCharacteristics: fc.Arbitrary<Record<CharacteristicKey, CharacteristicValue>> =
  fc.tuple(
    arbitraryCharacteristicValue,
    arbitraryCharacteristicValue,
    arbitraryCharacteristicValue,
    arbitraryCharacteristicValue,
    arbitraryCharacteristicValue,
    arbitraryCharacteristicValue,
    arbitraryCharacteristicValue,
    arbitraryCharacteristicValue,
    arbitraryCharacteristicValue,
    arbitraryCharacteristicValue,
  ).map(([WS, BS, S, T, I, Ag, Dex, Int, WP, Fel]) => ({
    WS, BS, S, T, I, Ag, Dex, Int, WP, Fel,
  }));

/**
 * Generator for character names with various edge cases:
 * - Empty string
 * - Special characters
 * - Long names
 * - Unicode characters
 */
const arbitraryCharacterName: fc.Arbitrary<string> = fc.oneof(
  fc.constant(''),
  fc.string({ minLength: 1, maxLength: 50 }),
  fc.constantFrom('Brünhilde', '日本語', '<script>alert("x")</script>', "O'Malley", '"Quoted"'),
  fc.string({ minLength: 51, maxLength: 100 }),
);

/**
 * Generator for valid Character JSON strings that will pass importFromJSON validation.
 * Required top-level keys: _v, name, species, chars
 */
const arbitraryValidCharacterJSON: fc.Arbitrary<string> = fc.tuple(
  arbitraryCharacterName,
  fc.string({ minLength: 0, maxLength: 30 }), // species
  arbitraryCharacteristics,
).map(([name, species, chars]) => {
  const character = {
    _v: 7,
    name,
    species,
    chars,
  };
  return JSON.stringify(character);
});

// --- Test Suite ---

describe('Feature: import-overwrite-guard — Bug Condition Exploration', () => {
  let updateCharacterMock: ReturnType<typeof vi.fn>;
  let updateMock: ReturnType<typeof vi.fn>;
  let originalFileReader: typeof FileReader;

  beforeEach(() => {
    updateCharacterMock = vi.fn();
    updateMock = vi.fn();
    originalFileReader = globalThis.FileReader;
  });

  afterEach(() => {
    globalThis.FileReader = originalFileReader;
    vi.restoreAllMocks();
  });

  /**
   * Creates a mock FileReader that synchronously delivers content via onload.
   */
  function mockFileReaderWithContent(content: string) {
    class MockFileReader {
      onload: ((ev: ProgressEvent<FileReader>) => void) | null = null;
      onerror: ((ev: ProgressEvent<FileReader>) => void) | null = null;
      result: string | null = null;
      readyState = 0;
      EMPTY = 0;
      LOADING = 1;
      DONE = 2;

      readAsText() {
        this.result = content;
        this.readyState = 2;
        if (this.onload) {
          this.onload({ target: { result: content } } as unknown as ProgressEvent<FileReader>);
        }
      }

      readAsArrayBuffer() {}
      readAsDataURL() {}
      readAsBinaryString() {}
      abort() {}
      addEventListener() {}
      removeEventListener() {}
      dispatchEvent() { return false; }
    }

    globalThis.FileReader = MockFileReader as unknown as typeof FileReader;
  }

  /**
   * Validates: Requirements 1.1, 1.2, 2.1
   *
   * Property 1: Bug Condition - For any valid character JSON file selected via "Import from File",
   * the system displays a ConfirmDialog and does NOT call updateCharacter until the user
   * explicitly confirms.
   *
   * On UNFIXED code this will FAIL because handleFileImport calls updateCharacter immediately.
   */
  it('Property 1: Valid import shows ConfirmDialog and does NOT call updateCharacter before confirmation', () => {
    fc.assert(
      fc.property(
        arbitraryValidCharacterJSON,
        (jsonString) => {
          // Reset mocks for each property iteration
          updateCharacterMock = vi.fn();

          // Mock FileReader to synchronously deliver the JSON content
          mockFileReaderWithContent(jsonString);

          const { container, unmount } = render(
            <SettingsPage
              character={BLANK_CHARACTER}
              update={updateMock}
              updateCharacter={updateCharacterMock}
              totalWounds={12}
              armourPoints={{ head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 }}
              maxEncumbrance={30}
              coinWeight={0}
            />
          );

          // Find the file input for "Import from File"
          const fileInput = container.querySelector('input[type="file"][accept=".json"]') as HTMLInputElement;
          expect(fileInput).not.toBeNull();

          // Create a File object and trigger the change event
          const file = new File([jsonString], 'character.json', { type: 'application/json' });
          Object.defineProperty(fileInput, 'files', {
            value: [file],
            writable: true,
            configurable: true,
          });
          fireEvent.change(fileInput);

          // ASSERT 1: A ConfirmDialog should be rendered (role="dialog")
          const dialog = container.querySelector('[role="dialog"]');
          expect(dialog).not.toBeNull();

          // ASSERT 2: updateCharacter should NOT have been called yet (before confirmation)
          expect(updateCharacterMock).not.toHaveBeenCalled();

          // Cleanup
          unmount();
        }
      ),
      { numRuns: 20 }
    );
  });
});
