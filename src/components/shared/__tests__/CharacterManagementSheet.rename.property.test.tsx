import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as fc from 'fast-check';
import { CharacterManagementSheet } from '../CharacterManagementSheet';
import type { CharacterSummary } from '../../../types/character';

// Mock createPortal to render inline instead of into document.body
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  };
});

// Mock useFocusTrap to avoid focus side effects in tests
vi.mock('../../../hooks/useFocusTrap', () => ({
  useFocusTrap: vi.fn(),
}));

// Mock useBodyScrollLock to avoid DOM side effects in tests
vi.mock('../../../hooks/useBodyScrollLock', () => ({
  useBodyScrollLock: vi.fn(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Pencil: (props: Record<string, unknown>) => <svg data-testid="pencil-icon" {...props} />,
  Copy: (props: Record<string, unknown>) => <svg data-testid="copy-icon" {...props} />,
  Trash2: (props: Record<string, unknown>) => <svg data-testid="trash-icon" {...props} />,
}));

// Mock CSS modules
vi.mock('../CharacterManagementSheet.module.css', () => ({
  default: {
    backdrop: 'backdrop',
    open: 'open',
    sheet: 'sheet',
    dragHandleArea: 'dragHandleArea',
    dragHandle: 'dragHandle',
    content: 'content',
    liveRegion: 'liveRegion',
    characterList: 'characterList',
    emptyMessage: 'emptyMessage',
    characterCard: 'characterCard',
    characterCardActive: 'characterCardActive',
    characterNameButton: 'characterNameButton',
    characterName: 'characterName',
    characterCareer: 'characterCareer',
    actionButtons: 'actionButtons',
    actionButton: 'actionButton',
    actionButtonDanger: 'actionButtonDanger',
    renameInputWrapper: 'renameInputWrapper',
    renameInput: 'renameInput',
    newCharacterButton: 'newCharacterButton',
    errorBanner: 'errorBanner',
  },
}));

describe('CharacterManagementSheet Rename Validation Property Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  /**
   * Feature: mobile-character-management, Property 3: Rename validation accepts trimmed values of 1–50 characters
   * **Validates: Requirements 6.3, 6.4, 6.6**
   */
  describe('Property 3: Rename validation accepts trimmed values of 1–50 characters', () => {
    it('trimmed strings of 1-50 chars result in onRenameCharacter being called with the trimmed value', () => {
      // Generate strings whose trimmed length is between 1 and 50 characters
      // Include leading/trailing whitespace to verify trimming behavior
      const validRenameInputArb = fc
        .tuple(
          fc.string({ minLength: 0, maxLength: 10 }).map((s) => s.replace(/\S/g, ' ')), // leading whitespace
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length >= 1 && s.trim().length <= 50),
          fc.string({ minLength: 0, maxLength: 10 }).map((s) => s.replace(/\S/g, ' ')) // trailing whitespace
        )
        .map(([leading, core, trailing]) => {
          const trimmedCore = core.trim();
          // Build a string with whitespace padding around a valid trimmed core
          if (trimmedCore.length === 0) return 'a'; // fallback: single char
          if (trimmedCore.length > 50) return trimmedCore.slice(0, 50);
          return leading + trimmedCore + trailing;
        })
        .filter((s) => {
          const trimmed = s.trim();
          return trimmed.length >= 1 && trimmed.length <= 50;
        });

      fc.assert(
        fc.property(validRenameInputArb, (inputValue) => {
          cleanup();

          const onRenameCharacter = vi.fn();
          const character: CharacterSummary = {
            id: 'char-1',
            name: 'Original Name',
            species: 'Human',
            career: 'Soldier',
            careerLevel: 'Silver 2',
            lastModified: Date.now(),
          };

          const triggerRef = { current: document.createElement('button') };

          render(
            <CharacterManagementSheet
              isOpen={true}
              onClose={vi.fn()}
              characters={[character]}
              activeId="char-1"
              onSwitchCharacter={vi.fn()}
              onCreateCharacter={vi.fn()}
              onRenameCharacter={onRenameCharacter}
              onDuplicateCharacter={vi.fn()}
              onDeleteCharacter={vi.fn()}
              triggerRef={triggerRef}
            />
          );

          // Flush animation frames to make the sheet visible
          act(() => {
            vi.advanceTimersByTime(100);
          });

          // Click the rename button to enter edit mode
          const renameButton = screen.getByLabelText('Rename Original Name');
          act(() => {
            fireEvent.click(renameButton);
          });

          // Find the rename input and change its value
          const input = screen.getByLabelText('Rename character');

          // Simulate clearing and typing the new value
          act(() => {
            fireEvent.change(input, { target: { value: inputValue } });
          });

          // Press Enter to confirm the rename
          act(() => {
            fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
          });

          const trimmed = inputValue.trim();

          // Verify onRenameCharacter was called with the character id and trimmed value
          expect(onRenameCharacter).toHaveBeenCalledWith('char-1', trimmed);
        }),
        { numRuns: 100 }
      );
    });

    it('empty or whitespace-only strings result in rename being cancelled (onRenameCharacter not called)', () => {
      // Generate strings that are empty or whitespace-only
      const whitespaceCharArb = fc.constantFrom(' ', '\t', '\n', '\r');
      const emptyOrWhitespaceArb = fc.oneof(
        fc.constant(''),
        fc.array(whitespaceCharArb, { minLength: 1, maxLength: 20 }).map((chars) => chars.join(''))
      );

      fc.assert(
        fc.property(emptyOrWhitespaceArb, (inputValue) => {
          cleanup();

          const onRenameCharacter = vi.fn();
          const character: CharacterSummary = {
            id: 'char-1',
            name: 'Original Name',
            species: 'Human',
            career: 'Soldier',
            careerLevel: 'Silver 2',
            lastModified: Date.now(),
          };

          const triggerRef = { current: document.createElement('button') };

          render(
            <CharacterManagementSheet
              isOpen={true}
              onClose={vi.fn()}
              characters={[character]}
              activeId="char-1"
              onSwitchCharacter={vi.fn()}
              onCreateCharacter={vi.fn()}
              onRenameCharacter={onRenameCharacter}
              onDuplicateCharacter={vi.fn()}
              onDeleteCharacter={vi.fn()}
              triggerRef={triggerRef}
            />
          );

          // Flush animation frames to make the sheet visible
          act(() => {
            vi.advanceTimersByTime(100);
          });

          // Click the rename button to enter edit mode
          const renameButton = screen.getByLabelText('Rename Original Name');
          act(() => {
            fireEvent.click(renameButton);
          });

          // Find the rename input and change its value to whitespace/empty
          const input = screen.getByLabelText('Rename character');

          act(() => {
            fireEvent.change(input, { target: { value: inputValue } });
          });

          // Press Enter to attempt confirm — should cancel
          act(() => {
            fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
          });

          // Verify onRenameCharacter was NOT called (rename cancelled)
          expect(onRenameCharacter).not.toHaveBeenCalled();
        }),
        { numRuns: 100 }
      );
    });
  });
});
