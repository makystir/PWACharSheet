import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SettingsPage } from '../SettingsPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints } from '../../../types/character';

/**
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 *
 * Property 2: Preservation - Invalid File and Export Behavior Unchanged
 *
 * These tests observe and lock in the CURRENT behavior of the unfixed code.
 * They must PASS on unfixed code, confirming the baseline behavior to preserve.
 */

// --- Constants ---

const defaultArmourPoints: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

const TEST_CHARACTER: Character = {
  ...structuredClone(BLANK_CHARACTER),
  name: 'TestHero',
  species: 'Human',
};

// --- Generators ---

/**
 * Generator for malformed JSON strings that will fail JSON.parse.
 * Covers: truncated, missing braces, random garbage, empty strings.
 */
const arbitraryMalformedJSON: fc.Arbitrary<string> = fc.oneof(
  // Truncated JSON
  fc.json().map(s => s.slice(0, Math.max(1, Math.floor(s.length / 2)))),
  // Missing closing brace
  fc.record({
    _v: fc.integer({ min: 1, max: 7 }),
    name: fc.string({ minLength: 1, maxLength: 20 }),
  }).map(obj => JSON.stringify(obj).slice(0, -1)),
  // Random non-JSON strings
  fc.string({ minLength: 1, maxLength: 100 }).filter(s => {
    try { JSON.parse(s); return false; } catch { return true; }
  }),
  // Empty string
  fc.constant(''),
  // Just an opening brace
  fc.constant('{'),
  // Array instead of valid JSON object (will parse but fail validation)
  fc.constant('[1,2,3'),
);

/**
 * Generator for JSON objects missing required Character fields.
 * Required keys: _v, name, species, chars
 * We generate objects with at least one required key missing.
 */
const arbitraryMissingFieldsJSON: fc.Arbitrary<string> = fc.oneof(
  // Missing _v
  fc.record({
    name: fc.string({ minLength: 1, maxLength: 20 }),
    species: fc.string({ minLength: 1, maxLength: 20 }),
    chars: fc.constant({}),
  }).map(obj => JSON.stringify(obj)),
  // Missing name
  fc.record({
    _v: fc.integer({ min: 1, max: 7 }),
    species: fc.string({ minLength: 1, maxLength: 20 }),
    chars: fc.constant({}),
  }).map(obj => JSON.stringify(obj)),
  // Missing species
  fc.record({
    _v: fc.integer({ min: 1, max: 7 }),
    name: fc.string({ minLength: 1, maxLength: 20 }),
    chars: fc.constant({}),
  }).map(obj => JSON.stringify(obj)),
  // Missing chars
  fc.record({
    _v: fc.integer({ min: 1, max: 7 }),
    name: fc.string({ minLength: 1, maxLength: 20 }),
    species: fc.string({ minLength: 1, maxLength: 20 }),
  }).map(obj => JSON.stringify(obj)),
);

/**
 * Generator for JSON with unsupported version (> 7).
 */
const arbitraryUnsupportedVersionJSON: fc.Arbitrary<string> = fc.integer({ min: 8, max: 999 }).map(v =>
  JSON.stringify({ _v: v, name: 'Test', species: 'Human', chars: {} })
);

/**
 * Combined generator for all invalid JSON inputs.
 */
const arbitraryInvalidJSON: fc.Arbitrary<string> = fc.oneof(
  arbitraryMalformedJSON,
  arbitraryMissingFieldsJSON,
  arbitraryUnsupportedVersionJSON,
);

// --- Helpers ---

let originalFileReader: typeof FileReader;

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

function renderSettingsPage(overrides: Partial<{
  character: Character;
  updateCharacter: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
}> = {}) {
  const updateCharacterMock = overrides.updateCharacter ?? vi.fn();
  const updateMock = overrides.update ?? vi.fn();
  const character = overrides.character ?? TEST_CHARACTER;

  return {
    updateCharacterMock,
    updateMock,
    ...render(
      <SettingsPage
        character={character}
        update={updateMock}
        updateCharacter={updateCharacterMock}
        totalWounds={12}
        armourPoints={defaultArmourPoints}
        maxEncumbrance={30}
        coinWeight={0}
      />
    ),
  };
}

// --- Test Suite ---

describe('Feature: import-overwrite-guard — Preservation Properties', () => {
  beforeEach(() => {
    originalFileReader = globalThis.FileReader;
  });

  afterEach(() => {
    globalThis.FileReader = originalFileReader;
    vi.restoreAllMocks();
  });

  /**
   * Validates: Requirements 3.1
   *
   * Property 2a: For all invalid JSON strings (malformed syntax, missing required
   * Character fields, unsupported versions), selecting the file via "Import from File"
   * produces an error message, does NOT render a ConfirmDialog, and does NOT modify
   * the active character.
   */
  it('Property 2a: Invalid file imports show error, no ConfirmDialog, no character modification', () => {
    fc.assert(
      fc.property(
        arbitraryInvalidJSON,
        (invalidJson) => {
          const updateCharacterMock = vi.fn();
          mockFileReaderWithContent(invalidJson);

          const { container, unmount } = render(
            <SettingsPage
              character={TEST_CHARACTER}
              update={vi.fn()}
              updateCharacter={updateCharacterMock}
              totalWounds={12}
              armourPoints={defaultArmourPoints}
              maxEncumbrance={30}
              coinWeight={0}
            />
          );

          // Find the file input
          const fileInput = container.querySelector('input[type="file"][accept=".json"]') as HTMLInputElement;
          expect(fileInput).not.toBeNull();

          // Simulate file selection
          const file = new File([invalidJson], 'bad.json', { type: 'application/json' });
          Object.defineProperty(fileInput, 'files', {
            value: [file],
            writable: true,
            configurable: true,
          });
          fireEvent.change(fileInput);

          // ASSERT 1: No ConfirmDialog rendered
          const dialog = container.querySelector('[role="dialog"]');
          expect(dialog).toBeNull();

          // ASSERT 2: updateCharacter was NOT called
          expect(updateCharacterMock).not.toHaveBeenCalled();

          // ASSERT 3: An error message is displayed
          const errorMsg = container.querySelector('[class*="errorMsg"]');
          expect(errorMsg).not.toBeNull();
          expect(errorMsg!.textContent).toBeTruthy();

          unmount();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Validates: Requirements 3.5
   *
   * Property 2b: For all export actions (clipboard, file), the action executes
   * immediately without any confirmation dialog and does not modify the active character.
   */
  it('Property 2b: Export actions execute without confirmation dialog and do not modify character', () => {
    // Mock clipboard API
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    // Mock URL and DOM methods for file export
    const revokeObjectURLMock = vi.fn();
    const createObjectURLMock = vi.fn().mockReturnValue('blob:test');
    globalThis.URL.createObjectURL = createObjectURLMock;
    globalThis.URL.revokeObjectURL = revokeObjectURLMock;

    // Capture the real createElement before mocking to avoid recursion
    const realCreateElement = document.createElement.bind(document);
    const clickMock = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return { href: '', download: '', click: clickMock, setAttribute: vi.fn() } as unknown as HTMLElement;
      }
      return realCreateElement(tag);
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

    const updateCharacterMock = vi.fn();
    const { container } = render(
      <SettingsPage
        character={TEST_CHARACTER}
        update={vi.fn()}
        updateCharacter={updateCharacterMock}
        totalWounds={12}
        armourPoints={defaultArmourPoints}
        maxEncumbrance={30}
        coinWeight={0}
      />
    );

    // Open the Export dropdown first (task 7.2 consolidated buttons into dropdown)
    const buttons = container.querySelectorAll('button');
    const exportDropdownBtn = Array.from(buttons).find(b => b.textContent?.includes('Export'));
    expect(exportDropdownBtn).toBeDefined();
    fireEvent.click(exportDropdownBtn!);

    // Now find export action buttons within the dropdown
    const allButtons = container.querySelectorAll('button');
    const clipboardBtn = Array.from(allButtons).find(b => b.textContent?.includes('Copy to Clipboard'));
    const downloadBtn = Array.from(allButtons).find(b => b.textContent?.includes('Download File'));

    expect(clipboardBtn).toBeDefined();
    expect(downloadBtn).toBeDefined();

    // Click "Copy to Clipboard"
    fireEvent.click(clipboardBtn!);

    // No ConfirmDialog after clipboard export
    let dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeNull();

    // Re-open dropdown for download test
    fireEvent.click(exportDropdownBtn!);
    const updatedButtons = container.querySelectorAll('button');
    const downloadBtn2 = Array.from(updatedButtons).find(b => b.textContent?.includes('Download File'));
    expect(downloadBtn2).toBeDefined();

    // Click "Download File"
    fireEvent.click(downloadBtn2!);

    // No ConfirmDialog after file export
    dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeNull();

    // updateCharacter was never called by export actions
    expect(updateCharacterMock).not.toHaveBeenCalled();
  });

  /**
   * Validates: Requirements 3.2
   *
   * Unit test: "Clear Sheet" button continues to show its own ConfirmDialog
   * and resets data on confirm.
   */
  it('Unit: Clear Sheet shows ConfirmDialog and resets character data on confirm', () => {
    const updateCharacterMock = vi.fn();
    const { container } = render(
      <SettingsPage
        character={TEST_CHARACTER}
        update={vi.fn()}
        updateCharacter={updateCharacterMock}
        totalWounds={12}
        armourPoints={defaultArmourPoints}
        maxEncumbrance={30}
        coinWeight={0}
      />
    );

    // Find "Clear Sheet" button
    const buttons = container.querySelectorAll('button');
    const clearBtn = Array.from(buttons).find(b => b.textContent?.includes('Clear Sheet'));
    expect(clearBtn).toBeDefined();

    // No dialog initially
    let dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeNull();

    // Click Clear Sheet
    fireEvent.click(clearBtn!);

    // ConfirmDialog should appear
    dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog!.textContent).toContain('Clear all character data');

    // Find and click the confirm button inside the dialog
    const confirmBtn = dialog!.querySelector('button:last-child');
    expect(confirmBtn).not.toBeNull();
    fireEvent.click(confirmBtn!);

    // updateCharacter should have been called (to reset data)
    expect(updateCharacterMock).toHaveBeenCalledTimes(1);

    // Dialog should be dismissed
    dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeNull();
  });

  /**
   * Validates: Requirements 3.1
   *
   * Property 2c: For randomly generated invalid JSON strings (truncated, missing closing
   * braces, null values for required fields, empty strings), error messages appear
   * without any dialog or character modification.
   */
  it('Property 2c: Randomly generated malformed JSON always produces error without dialog', () => {
    fc.assert(
      fc.property(
        arbitraryMalformedJSON,
        (malformedJson) => {
          const updateCharacterMock = vi.fn();
          mockFileReaderWithContent(malformedJson);

          const { container, unmount } = render(
            <SettingsPage
              character={TEST_CHARACTER}
              update={vi.fn()}
              updateCharacter={updateCharacterMock}
              totalWounds={12}
              armourPoints={defaultArmourPoints}
              maxEncumbrance={30}
              coinWeight={0}
            />
          );

          const fileInput = container.querySelector('input[type="file"][accept=".json"]') as HTMLInputElement;
          const file = new File([malformedJson], 'invalid.json', { type: 'application/json' });
          Object.defineProperty(fileInput, 'files', {
            value: [file],
            writable: true,
            configurable: true,
          });
          fireEvent.change(fileInput);

          // No dialog shown
          const dialog = container.querySelector('[role="dialog"]');
          expect(dialog).toBeNull();

          // Character not modified
          expect(updateCharacterMock).not.toHaveBeenCalled();

          // Error message displayed
          const errorMsg = container.querySelector('[class*="errorMsg"]');
          expect(errorMsg).not.toBeNull();

          unmount();
        }
      ),
      { numRuns: 30 }
    );
  });
});
