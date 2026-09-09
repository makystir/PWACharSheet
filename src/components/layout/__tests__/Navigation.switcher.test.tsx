import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Navigation } from '../Navigation';
import { CommandPaletteProvider } from '../../command-palette/CommandPaletteContext';
import { CharacterManagementSheet } from '../../shared/CharacterManagementSheet';
import type { CharacterSummary } from '../../../types/character';

/**
 * Character switcher consolidation tests (Task 20.2)
 * **Validates: Requirements 15.1, 15.2, 15.3, 15.4**
 *
 * Req 15.1 — quick-switch and full management affordances are textually distinct
 * Req 15.2 — the quick-switch affordance switches the active character
 * Req 15.3 — the full management affordance provides create/rename/duplicate/delete
 * Req 15.4 — the consolidation removes no existing character-management capability
 */

// --- Desktop viewport (non-mobile) so the sidebar quick-switch renders ---
function mockDesktopViewport() {
  Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    // useMediaQuery('(max-width: 767px)') → false on desktop
    matches: query.includes('min-width: 768px'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

const characters: CharacterSummary[] = [
  {
    id: 'char-1',
    name: 'Brunhilde',
    species: 'Human',
    career: 'Warrior Priest',
    careerLevel: 'Tier 2',
    lastModified: 2000,
  },
  {
    id: 'char-2',
    name: 'Gottfried',
    species: 'Human',
    career: 'Witch Hunter',
    careerLevel: 'Tier 1',
    lastModified: 1000,
  },
];

const renderWithProvider = (ui: React.ReactElement) =>
  render(<CommandPaletteProvider>{ui}</CommandPaletteProvider>);

function renderNavigation(overrides: Partial<Parameters<typeof Navigation>[0]> = {}) {
  const props = {
    activePage: 'character' as const,
    onPageChange: vi.fn(),
    characterName: 'Brunhilde',
    characters,
    activeId: 'char-1',
    onSwitchCharacter: vi.fn(),
    onCreateCharacter: vi.fn(),
    onRenameCharacter: vi.fn(),
    onDuplicateCharacter: vi.fn(),
    onDeleteCharacter: vi.fn(),
    onManageCharacters: vi.fn(),
    ...overrides,
  };
  const utils = renderWithProvider(<Navigation {...props} />);
  return { props, ...utils };
}

function openSwitcher() {
  // The switcher toggle button shows the active character name
  const toggle = screen.getByRole('button', { name: /Brunhilde/ });
  fireEvent.click(toggle);
}

function managementSheetProps(
  overrides: Partial<Parameters<typeof CharacterManagementSheet>[0]> = {}
) {
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
    triggerRef: { current: null } as React.RefObject<HTMLButtonElement | null>,
    ...overrides,
  };
}

describe('Character switcher consolidation (Task 20.2)', () => {
  beforeEach(() => {
    mockDesktopViewport();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Req 15.2: quick-switch switches the active character ---
  describe('Req 15.2: quick-switch switches the active character', () => {
    it('calls onSwitchCharacter with the id of a non-active character when picked', () => {
      const { props } = renderNavigation();
      openSwitcher();

      // Gottfried is the non-active character (activeId is char-1)
      const switchBtn = screen.getByRole('button', { name: /Gottfried/ });
      fireEvent.click(switchBtn);

      expect(props.onSwitchCharacter).toHaveBeenCalledWith('char-2');
    });

    it('does not switch when the already-active character is clicked', () => {
      const { props } = renderNavigation();
      openSwitcher();

      // The active character's switch button lives in the char list (not the toggle)
      const list = screen.getByText('Switch Character').parentElement as HTMLElement;
      const activeBtn = within(list).getByRole('button', { name: 'Brunhilde' });
      fireEvent.click(activeBtn);

      expect(props.onSwitchCharacter).not.toHaveBeenCalled();
    });

    it('renders the "Switch Character" heading in the quick-switch list', () => {
      renderNavigation();
      openSwitcher();

      expect(screen.getByText('Switch Character')).toBeInTheDocument();
    });
  });

  // --- Req 15.1: labels are distinct between quick-switch and management ---
  describe('Req 15.1: quick-switch and management labels are distinct', () => {
    it('quick-switch shows a "Switch Character" heading and a distinct "Manage Characters" affordance', () => {
      renderNavigation();
      openSwitcher();

      expect(screen.getByText('Switch Character')).toBeInTheDocument();

      const manageBtn = screen.getByRole('button', { name: /manage characters/i });
      expect(manageBtn).toBeInTheDocument();

      // The two labels are textually distinct
      expect(manageBtn.textContent).not.toBe('Switch Character');
    });

    it('the management sheet shows a visible "Manage Characters" title', () => {
      render(<CharacterManagementSheet {...managementSheetProps()} />);

      expect(
        screen.getByRole('heading', { name: 'Manage Characters' })
      ).toBeInTheDocument();
    });

    it('opening management from the quick-switch invokes onManageCharacters', () => {
      const { props } = renderNavigation();
      openSwitcher();

      fireEvent.click(screen.getByRole('button', { name: /manage characters/i }));
      expect(props.onManageCharacters).toHaveBeenCalledTimes(1);
    });
  });

  // --- Req 15.3: management affordance exposes create/rename/duplicate/delete ---
  describe('Req 15.3: management affordance exposes create/rename/duplicate/delete', () => {
    it('exposes rename/duplicate/delete controls per character and a create action', () => {
      render(<CharacterManagementSheet {...managementSheetProps()} />);

      // Per-character rename/duplicate/delete controls
      expect(screen.getByRole('button', { name: 'Rename Brunhilde' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Duplicate Brunhilde' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete Brunhilde' })).toBeInTheDocument();

      expect(screen.getByRole('button', { name: 'Rename Gottfried' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Duplicate Gottfried' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete Gottfried' })).toBeInTheDocument();

      // Create action
      expect(screen.getByRole('button', { name: 'New Character' })).toBeInTheDocument();
    });

    it('invokes create/rename/duplicate/delete callbacks from the management sheet', () => {
      const props = managementSheetProps();
      render(<CharacterManagementSheet {...props} />);

      fireEvent.click(screen.getByRole('button', { name: 'New Character' }));
      expect(props.onCreateCharacter).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: 'Duplicate Brunhilde' }));
      expect(props.onDuplicateCharacter).toHaveBeenCalledWith('char-1');

      // Delete opens a confirmation dialog, then confirm calls the callback
      fireEvent.click(screen.getByRole('button', { name: 'Delete Gottfried' }));
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      expect(props.onDeleteCharacter).toHaveBeenCalledWith('char-2');
    });
  });

  // --- Req 15.4: no existing capability removed ---
  describe('Req 15.4: no character-management capability removed', () => {
    it('the quick-switch still exposes inline rename/duplicate/delete controls', () => {
      renderNavigation();
      openSwitcher();

      // Inline per-character actions use title attributes in the quick-switch dropdown
      const list = screen.getByText('Switch Character').parentElement as HTMLElement;
      expect(within(list).getAllByTitle('Rename').length).toBeGreaterThanOrEqual(2);
      expect(within(list).getAllByTitle('Duplicate').length).toBeGreaterThanOrEqual(2);
      expect(within(list).getAllByTitle('Delete').length).toBeGreaterThanOrEqual(2);
    });

    it('the quick-switch still exposes a create action ("New")', () => {
      renderNavigation();
      // The "New" character button is always visible alongside the switcher toggle
      expect(
        screen.getByRole('button', { name: /create new character/i })
      ).toBeInTheDocument();
    });

    it('the management sheet also exposes rename/duplicate/delete (both affordances retain the capabilities)', () => {
      render(<CharacterManagementSheet {...managementSheetProps()} />);

      expect(screen.getByRole('button', { name: 'Rename Brunhilde' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Duplicate Brunhilde' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete Brunhilde' })).toBeInTheDocument();
    });
  });
});
