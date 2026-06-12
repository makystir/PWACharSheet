import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
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
  },
}));

describe('CharacterManagementSheet Accessibility Property Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  /**
   * Feature: mobile-character-management, Property 6: Action button accessible names include action type and character name
   * **Validates: Requirements 9.5**
   */
  describe('Property 6: Action button accessible names include action type and character name', () => {
    it('each action button aria-label contains the action word and the character name', () => {
      // Generate random character names including special characters, unicode, etc.
      // Filter out empty/whitespace-only names since real character names always have content
      const characterNameArb = fc.oneof(
        // Basic alphanumeric names
        fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
        // Names with special characters
        fc.stringMatching(/^[a-zA-Z0-9!@#$%^&*()\-_=+\[\]{};:'",.<>/?\\|`~]+$/, { minLength: 1, maxLength: 30 }),
        // Names with unicode characters (accented, CJK, Cyrillic)
        fc.stringMatching(/^[\u00C0-\u024F\u4E00-\u9FFF\u0400-\u04FF\w]+$/, { minLength: 1, maxLength: 30 })
      );

      fc.assert(
        fc.property(characterNameArb, (name) => {
          cleanup();

          const character: CharacterSummary = {
            id: 'test-char-1',
            name,
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
              activeId="test-char-1"
              onSwitchCharacter={vi.fn()}
              onCreateCharacter={vi.fn()}
              onRenameCharacter={vi.fn()}
              onDuplicateCharacter={vi.fn()}
              onDeleteCharacter={vi.fn()}
              triggerRef={triggerRef}
            />
          );

          // Flush the double requestAnimationFrame to make the sheet visible
          act(() => {
            vi.runAllTimers();
          });

          // Find all buttons within the rendered output
          const allButtons = screen.getAllByRole('button');

          // Find buttons by their aria-label attribute
          const renameButton = allButtons.find(
            (btn) => btn.getAttribute('aria-label') === `Rename ${name}`
          );
          const duplicateButton = allButtons.find(
            (btn) => btn.getAttribute('aria-label') === `Duplicate ${name}`
          );
          const deleteButton = allButtons.find(
            (btn) => btn.getAttribute('aria-label') === `Delete ${name}`
          );

          // Verify rename button exists and its label contains both action and name
          expect(renameButton).toBeDefined();
          expect(renameButton!.getAttribute('aria-label')).toContain('Rename');
          expect(renameButton!.getAttribute('aria-label')).toContain(name);

          // Verify duplicate button exists and its label contains both action and name
          expect(duplicateButton).toBeDefined();
          expect(duplicateButton!.getAttribute('aria-label')).toContain('Duplicate');
          expect(duplicateButton!.getAttribute('aria-label')).toContain(name);

          // Verify delete button exists and its label contains both action and name
          expect(deleteButton).toBeDefined();
          expect(deleteButton!.getAttribute('aria-label')).toContain('Delete');
          expect(deleteButton!.getAttribute('aria-label')).toContain(name);
        }),
        { numRuns: 100 }
      );
    });
  });
});
