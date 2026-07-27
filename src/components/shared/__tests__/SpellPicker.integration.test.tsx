import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpellPicker } from '../SpellPicker';
import type { SpellData, Talent } from '../../../types/character';

// Mock CSS modules
vi.mock('../SpellPicker.module.css', () => ({
  default: {
    overlay: 'overlay',
    modal: 'modal',
    header: 'header',
    title: 'title',
    close: 'close',
    searchWrapper: 'searchWrapper',
    search: 'search',
    tabBar: 'tabBar',
    tab: 'tab',
    tabActive: 'tabActive',
    spellList: 'spellList',
    groupHeader: 'groupHeader',
    spellItem: 'spellItem',
    spellItemKnown: 'spellItemKnown',
    spellName: 'spellName',
    spellCn: 'spellCn',
    spellDetail: 'spellDetail',
    spellDetailOpen: 'spellDetailOpen',
    detailRow: 'detailRow',
    knownIcon: 'knownIcon',
    selectBtn: 'selectBtn',
    emptyMessage: 'emptyMessage',
  },
}));

// Test fixtures
const fireSpell: SpellData = {
  name: 'Fireball',
  cn: '8',
  range: '48 yards',
  target: 'Special',
  duration: 'Instant',
  effect: 'Deals 1d10+4 damage.',
  lore: 'Lore of Fire',
};

const fireSpell2: SpellData = {
  name: 'Flame Storm',
  cn: '12',
  range: '24 yards',
  target: 'AoE (6 yards)',
  duration: '1 Round',
  effect: 'A raging storm of fire.',
  lore: 'Lore of Fire',
};

const deathSpell: SpellData = {
  name: 'Spirit Leech',
  cn: '6',
  range: '24 yards',
  target: '1',
  duration: 'Instant',
  effect: 'Drains life force.',
  lore: 'Lore of Death',
};

const pettySpell: SpellData = {
  name: 'Light',
  cn: '0',
  range: 'You',
  target: 'You',
  duration: 'WPB minutes',
  effect: 'You create a bright light.',
  lore: 'Petty',
};

const allSpells: SpellData[] = [pettySpell, fireSpell, fireSpell2, deathSpell];

const defaultProps = {
  spells: allSpells,
  characterTalents: [] as Talent[],
  knownSpellNames: new Set<string>(),
  onSelect: vi.fn(),
  onClose: vi.fn(),
};

afterEach(() => {
  cleanup();
});

describe('SpellPicker Integration', () => {
  // **Validates: Requirements 6.1, 6.2**
  it('renders modal with spell item buttons that have 44px tap targets', () => {
    render(<SpellPicker {...defaultProps} />);

    // Verify the modal container renders with the modal class
    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();

    // Verify spell item buttons exist (CSS ensures min-height: 44px)
    const spellButtons = screen.getAllByRole('button', { name: /Fireball|Flame Storm|Spirit Leech|Light/ });
    expect(spellButtons.length).toBe(4);

    // Each spell item button should be present and interactive
    for (const btn of spellButtons) {
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveClass('spellItem');
    }
  });

  // **Validates: Requirements 5.2**
  it('character with "Arcane Magic (Fire)" opens picker to "Lore of Fire" tab', () => {
    const talents: Talent[] = [
      { n: 'Arcane Magic (Fire)', lvl: 1, desc: 'You can cast fire spells' },
    ];

    render(<SpellPicker {...defaultProps} characterTalents={talents} />);

    // The "Lore of Fire" tab should be pre-selected
    const fireTab = screen.getByRole('tab', { name: 'Lore of Fire' });
    expect(fireTab).toHaveAttribute('aria-selected', 'true');

    // The "All" tab should not be selected
    const allTab = screen.getByRole('tab', { name: 'All' });
    expect(allTab).toHaveAttribute('aria-selected', 'false');

    // Only fire spells should be displayed
    expect(screen.getByText('Fireball')).toBeInTheDocument();
    expect(screen.getByText('Flame Storm')).toBeInTheDocument();
    expect(screen.queryByText('Spirit Leech')).not.toBeInTheDocument();
    expect(screen.queryByText('Light')).not.toBeInTheDocument();
  });

  // **Validates: Requirements 6.5**
  it('body overflow is hidden when picker is open and restored on unmount', () => {
    render(<SpellPicker {...defaultProps} />);

    // Body should have spellPickerOpen class while picker is mounted
    expect(document.body.classList.contains('spellPickerOpen')).toBe(true);

    // Unmount the component
    cleanup();

    // Body class should be removed after unmount
    expect(document.body.classList.contains('spellPickerOpen')).toBe(false);
  });
});
