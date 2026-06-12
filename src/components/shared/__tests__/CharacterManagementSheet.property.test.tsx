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
    createPortal: (node: React.ReactNode) => node,
  };
});

// Mock useFocusTrap to avoid side effects in tests
vi.mock('../../../hooks/useFocusTrap', () => ({
  useFocusTrap: vi.fn(),
}));

// Mock useBodyScrollLock to avoid side effects in tests
vi.mock('../../../hooks/useBodyScrollLock', () => ({
  useBodyScrollLock: vi.fn(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Pencil: ({ size, ...props }: Record<string, unknown>) => (
    <svg data-testid="pencil-icon" data-size={size} {...props} />
  ),
  Copy: ({ size, ...props }: Record<string, unknown>) => (
    <svg data-testid="copy-icon" data-size={size} {...props} />
  ),
  Trash2: ({ size, ...props }: Record<string, unknown>) => (
    <svg data-testid="trash-icon" data-size={size} {...props} />
  ),
}));

// Mock CSS module
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

/**
 * Arbitrary for generating a CharacterSummary with a specific lastModified timestamp.
 */
const characterSummaryArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
  species: fc.constantFrom('Human', 'Dwarf', 'Elf', 'Halfling'),
  career: fc.constantFrom('Soldier', 'Wizard', 'Thief', 'Priest', 'Noble', 'Ranger'),
  careerLevel: fc.constantFrom('Level 1', 'Level 2', 'Level 3', 'Level 4'),
  lastModified: fc.integer({ min: 1000000000000, max: 2000000000000 }),
});

/**
 * Arbitrary for generating arrays of CharacterSummary with distinct lastModified timestamps.
 */
const characterListArb = fc
  .array(characterSummaryArb, { minLength: 2, maxLength: 10 })
  .map((chars) => {
    // Ensure distinct lastModified timestamps by adding index offset
    return chars.map((c, i) => ({ ...c, lastModified: c.lastModified + i * 1000 }));
  });

describe('CharacterManagementSheet Property Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  /**
   * Feature: mobile-character-management, Property 2: Character list is sorted by most recently modified first
   * **Validates: Requirements 3.1**
   */
  describe('Property 2: Character list is sorted by most recently modified first', () => {
    it('renders characters in strictly descending lastModified order', () => {
      const triggerRef = { current: document.createElement('button') };
      const noOp = vi.fn();

      fc.assert(
        fc.property(characterListArb, (characters) => {
          cleanup();

          // Render with isOpen=true
          render(
            <CharacterManagementSheet
              isOpen={true}
              onClose={noOp}
              characters={characters}
              activeId={characters[0].id}
              onSwitchCharacter={noOp}
              onCreateCharacter={noOp}
              onRenameCharacter={noOp}
              onDuplicateCharacter={noOp}
              onDeleteCharacter={noOp}
              triggerRef={triggerRef}
            />
          );

          // Flush requestAnimationFrame calls for the open animation
          act(() => {
            vi.advanceTimersByTime(100);
          });

          // Get all rendered listitem elements in DOM order
          const listItems = screen.getAllByRole('listitem');

          // Expected order: sorted by lastModified descending
          const expectedOrder = [...characters].sort(
            (a, b) => b.lastModified - a.lastModified
          );

          // Verify the number of items matches
          expect(listItems.length).toBe(expectedOrder.length);

          // Verify each rendered item matches expected order by checking name text
          listItems.forEach((item, index) => {
            const nameEl = item.querySelector('.characterName');
            expect(nameEl).not.toBeNull();
            expect(nameEl!.textContent).toBe(expectedOrder[index].name);
          });
        }),
        { numRuns: 100 }
      );
    });
  });
});
