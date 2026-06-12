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

// Mock CSS modules - include characterNameButton for the focus query selector
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

// Mock ConfirmDialog CSS module
vi.mock('../ConfirmDialog.module.css', () => ({
  default: {
    overlay: 'overlay',
    dialog: 'dialog',
    message: 'message',
    actions: 'actions',
    cancelBtn: 'cancelBtn',
    confirmBtn: 'confirmBtn',
  },
}));

/**
 * Arbitrary for generating a delete scenario with N characters (1-10)
 * and a valid deletion index. Characters have unique names to avoid
 * aria-label collisions during button lookup.
 */
const deleteScenarioArb = fc
  .integer({ min: 1, max: 10 })
  .chain((count) => {
    return fc.tuple(
      fc.constant(count),
      fc.integer({ min: 0, max: count - 1 })
    );
  })
  .map(([count, deleteIndex]) => {
    // Generate characters with unique names and distinct timestamps
    const characters: CharacterSummary[] = Array.from({ length: count }, (_, i) => ({
      id: `char-${i}`,
      name: `Character ${i + 1}`,
      species: 'Human',
      career: ['Soldier', 'Wizard', 'Thief', 'Priest', 'Noble', 'Ranger'][i % 6],
      careerLevel: `Level ${(i % 4) + 1}`,
      // Descending timestamps so position 0 has the latest
      lastModified: 2000000000000 - i * 100000,
    }));
    return [characters, deleteIndex] as [CharacterSummary[], number];
  });

describe('CharacterManagementSheet Focus After Deletion Property Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  /**
   * Feature: mobile-character-management, Property 7: Focus moves to correct element after card deletion
   * **Validates: Requirements 9.7**
   */
  describe('Property 7: Focus moves to correct element after card deletion', () => {
    it('focus moves to the correct element based on deletion position', { timeout: 30000 }, () => {
      fc.assert(
        fc.property(deleteScenarioArb, ([characters, deleteIndex]) => {
          cleanup();

          // Characters are already sorted by lastModified descending
          const characterToDelete = characters[deleteIndex];
          const remainingAfterDelete = characters.filter(
            (c) => c.id !== characterToDelete.id
          );

          const triggerRef = { current: document.createElement('button') };
          const onDeleteCharacter = vi.fn();
          const onClose = vi.fn();

          const { rerender } = render(
            <CharacterManagementSheet
              isOpen={true}
              onClose={onClose}
              characters={characters}
              activeId={characters[0].id}
              onSwitchCharacter={vi.fn()}
              onCreateCharacter={vi.fn()}
              onRenameCharacter={vi.fn()}
              onDuplicateCharacter={vi.fn()}
              onDeleteCharacter={onDeleteCharacter}
              triggerRef={triggerRef}
            />
          );

          // Flush double requestAnimationFrame for sheet open animation
          act(() => {
            vi.runAllTimers();
          });

          // Click the delete button for the character at deleteIndex
          const deleteButton = screen.getByLabelText(`Delete ${characterToDelete.name}`);
          act(() => {
            fireEvent.click(deleteButton);
          });

          // The ConfirmDialog should now be displayed - click the confirm button labeled "Delete"
          // ConfirmDialog renders two buttons: Cancel and the confirmLabel (which is "Delete")
          const dialogButtons = screen.getAllByRole('button');
          const confirmButton = dialogButtons.find(
            (btn) => btn.textContent === 'Delete' && btn.className.includes('confirmBtn')
          );
          expect(confirmButton).toBeDefined();
          act(() => {
            fireEvent.click(confirmButton!);
          });

          // Verify onDeleteCharacter was called
          expect(onDeleteCharacter).toHaveBeenCalledWith(characterToDelete.id);

          // Simulate the parent removing the deleted character from the list
          const newActiveId = remainingAfterDelete.length > 0 ? remainingAfterDelete[0].id : '';
          rerender(
            <CharacterManagementSheet
              isOpen={true}
              onClose={onClose}
              characters={remainingAfterDelete}
              activeId={newActiveId}
              onSwitchCharacter={vi.fn()}
              onCreateCharacter={vi.fn()}
              onRenameCharacter={vi.fn()}
              onDuplicateCharacter={vi.fn()}
              onDeleteCharacter={onDeleteCharacter}
              triggerRef={triggerRef}
            />
          );

          // Flush any timers/effects after rerender
          act(() => {
            vi.runAllTimers();
          });

          // Verify focus landed on the correct element
          if (remainingAfterDelete.length === 0) {
            // No cards remain → focus should be on the "New Character" button
            const newCharButton = screen.getByRole('button', { name: 'New Character' });
            expect(document.activeElement).toBe(newCharButton);
          } else {
            // Determine which card should receive focus
            let expectedIndex: number;
            if (deleteIndex < remainingAfterDelete.length) {
              // Next card exists at same position
              expectedIndex = deleteIndex;
            } else {
              // Was last card, focus previous
              expectedIndex = deleteIndex - 1;
            }

            // Get all character name buttons (they have class characterNameButton)
            const nameButtons = screen.getAllByRole('listitem')
              .map((item) => item.querySelector('button[class*="characterNameButton"]'))
              .filter(Boolean) as HTMLElement[];

            expect(nameButtons.length).toBe(remainingAfterDelete.length);
            expect(document.activeElement).toBe(nameButtons[expectedIndex]);
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
