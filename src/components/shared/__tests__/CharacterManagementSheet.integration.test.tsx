import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterManagementSheet } from '../CharacterManagementSheet';
import type { CharacterSummary } from '../../../types/character';

/**
 * CharacterManagementSheet - Integration Tests
 * Tests full user flows through the character management sheet.
 *
 * **Validates: Requirements 4.1, 5.2, 8.4**
 *
 * Test flows:
 * - Open sheet → switch character → verify callbacks fired
 * - Open sheet → create via wizard → verify onCreateCharacter called
 * - Open sheet → delete active character → verify switch to next
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

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

// ─── Test data ───────────────────────────────────────────────────────────────

const characters: CharacterSummary[] = [
  {
    id: 'char-1',
    name: 'Brunhilde',
    species: 'Human',
    career: 'Warrior Priest',
    careerLevel: 'Tier 2',
    lastModified: 3000,
  },
  {
    id: 'char-2',
    name: 'Gottfried',
    species: 'Human',
    career: 'Witch Hunter',
    careerLevel: 'Tier 1',
    lastModified: 2000,
  },
  {
    id: 'char-3',
    name: 'Elara',
    species: 'Elf',
    career: 'Mage',
    careerLevel: 'Tier 3',
    lastModified: 1000,
  },
];

function getDefaultProps(overrides: Partial<Parameters<typeof CharacterManagementSheet>[0]> = {}) {
  return {
    isOpen: true,
    onClose: vi.fn(),
    characters,
    activeId: 'char-1',
    onSwitchCharacter: vi.fn(),
    onCreateCharacter: vi.fn(),
    onRenameCharacter: vi.fn(),
    onDuplicateCharacter: vi.fn(),
    onDeleteCharacter: vi.fn(),
    triggerRef: { current: document.createElement('button') } as React.RefObject<HTMLButtonElement | null>,
    ...overrides,
  };
}

// ─── Integration Tests ───────────────────────────────────────────────────────

describe('CharacterManagementSheet - Integration Flows', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  describe('Flow 1: Open sheet → switch character → verify page updates (Requirement 4.1)', () => {
    it('full flow: renders sheet with characters, switches to non-active character, sheet closes', () => {
      const props = getDefaultProps();
      render(<CharacterManagementSheet {...props} />);

      // Flush animation frames for sheet open
      act(() => {
        vi.runAllTimers();
      });

      // Verify the sheet is open with all characters rendered
      expect(screen.getByRole('dialog', { name: 'Character management' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Brunhilde (active)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Switch to Gottfried' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Switch to Elara' })).toBeInTheDocument();

      // Click a non-active character to switch
      fireEvent.click(screen.getByRole('button', { name: 'Switch to Gottfried' }));

      // Verify onSwitchCharacter was called with the correct id
      expect(props.onSwitchCharacter).toHaveBeenCalledWith('char-2');

      // Verify onClose was called (sheet closes after switch)
      expect(props.onClose).toHaveBeenCalledTimes(1);

      // Verify ARIA live region announces the switch
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveTextContent('Switched to Gottfried');
    });

    it('full flow: switching calls onSwitchCharacter before onClose', () => {
      const callOrder: string[] = [];
      const props = getDefaultProps({
        onSwitchCharacter: vi.fn(() => callOrder.push('switch')),
        onClose: vi.fn(() => callOrder.push('close')),
      });
      render(<CharacterManagementSheet {...props} />);

      act(() => {
        vi.runAllTimers();
      });

      // Switch to Elara
      fireEvent.click(screen.getByRole('button', { name: 'Switch to Elara' }));

      expect(callOrder).toEqual(['switch', 'close']);
      expect(props.onSwitchCharacter).toHaveBeenCalledWith('char-3');
    });

    it('full flow: tapping active character closes sheet without switching', () => {
      const props = getDefaultProps();
      render(<CharacterManagementSheet {...props} />);

      act(() => {
        vi.runAllTimers();
      });

      // Tap the active character
      fireEvent.click(screen.getByRole('button', { name: 'Brunhilde (active)' }));

      // Should close without switching
      expect(props.onSwitchCharacter).not.toHaveBeenCalled();
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Flow 2: Open sheet → create via wizard → verify button triggers (Requirement 5.2)', () => {
    it('full flow: renders sheet, clicks New Character button, onCreateCharacter is called', () => {
      const props = getDefaultProps();
      render(<CharacterManagementSheet {...props} />);

      act(() => {
        vi.runAllTimers();
      });

      // Verify sheet is open and New Character button is visible
      expect(screen.getByRole('dialog', { name: 'Character management' })).toBeInTheDocument();
      const newCharButton = screen.getByRole('button', { name: 'New Character' });
      expect(newCharButton).toBeInTheDocument();

      // Click the "New Character" button
      fireEvent.click(newCharButton);

      // Verify onCreateCharacter was called (parent handles closing sheet + opening wizard)
      expect(props.onCreateCharacter).toHaveBeenCalledTimes(1);
    });

    it('full flow: new character button is positioned below the character list', () => {
      const props = getDefaultProps();
      render(<CharacterManagementSheet {...props} />);

      act(() => {
        vi.runAllTimers();
      });

      // Verify the character list exists and the new character button exists
      const list = screen.getByRole('list');
      const newCharButton = screen.getByRole('button', { name: 'New Character' });

      expect(list).toBeInTheDocument();
      expect(newCharButton).toBeInTheDocument();

      // Both should be siblings within the content area
      expect(list.parentElement).toBe(newCharButton.parentElement);
    });

    it('full flow: with no characters, New Character button is available alongside empty message', () => {
      const props = getDefaultProps({ characters: [], activeId: '' });
      render(<CharacterManagementSheet {...props} />);

      act(() => {
        vi.runAllTimers();
      });

      // Verify the empty state message is shown
      expect(screen.getByText('No characters saved')).toBeInTheDocument();

      // New Character button should still be available
      const newCharButton = screen.getByRole('button', { name: 'New Character' });
      expect(newCharButton).toBeInTheDocument();

      // Click it
      fireEvent.click(newCharButton);
      expect(props.onCreateCharacter).toHaveBeenCalledTimes(1);
    });
  });

  describe('Flow 3: Open sheet → delete active character → verify switch to next (Requirement 8.4)', () => {
    it('full flow: delete active character with others remaining, onDeleteCharacter called, sheet stays open', () => {
      const props = getDefaultProps();
      const { rerender } = render(<CharacterManagementSheet {...props} />);

      act(() => {
        vi.runAllTimers();
      });

      // Verify sheet is open with the active character
      expect(screen.getByRole('button', { name: 'Brunhilde (active)' })).toBeInTheDocument();

      // Click the delete button for the active character (Brunhilde)
      const deleteButton = screen.getByLabelText('Delete Brunhilde');
      fireEvent.click(deleteButton);

      // ConfirmDialog should appear with character name
      expect(screen.getByText('Are you sure you want to delete Brunhilde?')).toBeInTheDocument();

      // Click the confirm button (labeled "Delete")
      const confirmButton = screen.getAllByRole('button').find(
        (btn) => btn.textContent === 'Delete' && btn.className.includes('confirmBtn')
      );
      expect(confirmButton).toBeDefined();
      fireEvent.click(confirmButton!);

      // Verify onDeleteCharacter was called with the active character id
      expect(props.onDeleteCharacter).toHaveBeenCalledWith('char-1');

      // Verify onClose was NOT called (sheet stays open after deletion)
      expect(props.onClose).not.toHaveBeenCalled();

      // Simulate parent removing the deleted character and switching to the next one
      const remainingCharacters = characters.filter((c) => c.id !== 'char-1');
      rerender(
        <CharacterManagementSheet
          {...props}
          characters={remainingCharacters}
          activeId="char-2" // switched to first in updated list (sorted by lastModified desc → char-2)
        />
      );

      act(() => {
        vi.runAllTimers();
      });

      // Verify the sheet is still open (no onClose call) with updated list
      expect(props.onClose).not.toHaveBeenCalled();

      // Verify Brunhilde is no longer in the list
      expect(screen.queryByText('Brunhilde')).not.toBeInTheDocument();

      // Verify Gottfried is now the active character
      expect(screen.getByRole('button', { name: 'Gottfried (active)' })).toBeInTheDocument();

      // Verify Elara is still in the list
      expect(screen.getByRole('button', { name: 'Switch to Elara' })).toBeInTheDocument();

      // Verify deletion was announced
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveTextContent('Deleted Brunhilde');
    });

    it('full flow: cancel delete keeps character in list and sheet open', () => {
      const props = getDefaultProps();
      render(<CharacterManagementSheet {...props} />);

      act(() => {
        vi.runAllTimers();
      });

      // Click the delete button for Brunhilde
      fireEvent.click(screen.getByLabelText('Delete Brunhilde'));

      // ConfirmDialog appears
      expect(screen.getByText('Are you sure you want to delete Brunhilde?')).toBeInTheDocument();

      // Click cancel
      const cancelButton = screen.getAllByRole('button').find(
        (btn) => btn.textContent === 'Cancel' && btn.className.includes('cancelBtn')
      );
      expect(cancelButton).toBeDefined();
      fireEvent.click(cancelButton!);

      // onDeleteCharacter should NOT have been called
      expect(props.onDeleteCharacter).not.toHaveBeenCalled();

      // Sheet stays open, character still in list
      expect(props.onClose).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Brunhilde (active)' })).toBeInTheDocument();
    });

    it('full flow: delete non-active character does not trigger switch, sheet stays open', () => {
      const props = getDefaultProps();
      const { rerender } = render(<CharacterManagementSheet {...props} />);

      act(() => {
        vi.runAllTimers();
      });

      // Delete Gottfried (non-active)
      fireEvent.click(screen.getByLabelText('Delete Gottfried'));

      // Confirm
      const confirmButton = screen.getAllByRole('button').find(
        (btn) => btn.textContent === 'Delete' && btn.className.includes('confirmBtn')
      );
      fireEvent.click(confirmButton!);

      // Verify onDeleteCharacter was called with Gottfried's id
      expect(props.onDeleteCharacter).toHaveBeenCalledWith('char-2');

      // Sheet stays open, no switch triggered
      expect(props.onClose).not.toHaveBeenCalled();

      // Rerender without Gottfried - active stays the same
      const remainingCharacters = characters.filter((c) => c.id !== 'char-2');
      rerender(
        <CharacterManagementSheet
          {...props}
          characters={remainingCharacters}
          activeId="char-1"
        />
      );

      act(() => {
        vi.runAllTimers();
      });

      // Brunhilde is still active
      expect(screen.getByRole('button', { name: 'Brunhilde (active)' })).toBeInTheDocument();
      // Gottfried is gone
      expect(screen.queryByText('Gottfried')).not.toBeInTheDocument();
      // Elara is still there
      expect(screen.getByRole('button', { name: 'Switch to Elara' })).toBeInTheDocument();
    });
  });
});
