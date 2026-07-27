import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
  effect: 'Deals 1d10+4 damage to targets in a 4-yard radius.',
  lore: 'Lore of Fire',
};

const fireSpell2: SpellData = {
  name: 'Flame Storm',
  cn: '12',
  range: '24 yards',
  target: 'AoE (6 yards)',
  duration: '1 Round',
  effect: 'A raging storm of fire engulfs the target area.',
  lore: 'Lore of Fire',
};

const deathSpell: SpellData = {
  name: 'Spirit Leech',
  cn: '6',
  range: '24 yards',
  target: '1',
  duration: 'Instant',
  effect: 'Drains the life force of a single target.',
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

describe('SpellPicker', () => {
  // **Validates: Requirements 3.1, 3.2**
  it('opens with lore tabs visible', () => {
    render(<SpellPicker {...defaultProps} />);

    const tabs = screen.getAllByRole('tab');
    // Should have "All" + one tab per unique lore in the spell list
    expect(tabs.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Lore of Fire' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Lore of Death' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Petty' })).toBeInTheDocument();
  });

  // **Validates: Requirements 3.2**
  it('clicking a tab shows only matching spells', () => {
    render(<SpellPicker {...defaultProps} />);

    const fireTab = screen.getByRole('tab', { name: 'Lore of Fire' });
    fireEvent.click(fireTab);

    // Fire spells should be visible
    expect(screen.getByText('Fireball')).toBeInTheDocument();
    expect(screen.getByText('Flame Storm')).toBeInTheDocument();

    // Non-fire spells should not be visible
    expect(screen.queryByText('Spirit Leech')).not.toBeInTheDocument();
    expect(screen.queryByText('Light')).not.toBeInTheDocument();
  });

  // **Validates: Requirements 7.2**
  it('expanding a spell shows detail fields', () => {
    render(<SpellPicker {...defaultProps} />);

    // Click on a spell to expand it
    const fireballButton = screen.getByRole('button', { name: /Fireball/ });
    fireEvent.click(fireballButton);

    // Verify detail fields are shown
    expect(screen.getByText('Range:')).toBeInTheDocument();
    expect(screen.getByText('Target:')).toBeInTheDocument();
    expect(screen.getByText('Duration:')).toBeInTheDocument();
    expect(screen.getByText('Effect:')).toBeInTheDocument();
    expect(screen.getByText('48 yards')).toBeInTheDocument();
  });

  // **Validates: Requirements 8.1**
  it('already-known spells display with disabled styling', () => {
    const knownSpells = new Set<string>(['Fireball']);
    render(<SpellPicker {...defaultProps} knownSpellNames={knownSpells} />);

    const fireballButton = screen.getByRole('button', { name: /Fireball/ });
    expect(fireballButton).toHaveAttribute('aria-disabled', 'true');
  });

  // **Validates: Requirements 8.2**
  it('tapping known spell does not fire onSelect', () => {
    const onSelect = vi.fn();
    const knownSpells = new Set<string>(['Fireball']);
    render(
      <SpellPicker
        {...defaultProps}
        knownSpellNames={knownSpells}
        onSelect={onSelect}
      />
    );

    const fireballButton = screen.getByRole('button', { name: /Fireball/ });
    fireEvent.click(fireballButton);

    expect(onSelect).not.toHaveBeenCalled();
  });

  // **Validates: Requirements 4.2**
  it('search input filters displayed spells', () => {
    render(<SpellPicker {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search spells...');
    fireEvent.change(searchInput, { target: { value: 'fire' } });

    // Only spells containing "fire" in name should appear
    expect(screen.getByText('Fireball')).toBeInTheDocument();
    // "Spirit Leech" should not match "fire"
    expect(screen.queryByText('Spirit Leech')).not.toBeInTheDocument();
    // "Light" should not match "fire"
    expect(screen.queryByText('Light')).not.toBeInTheDocument();
  });

  // **Validates: Requirements 4.2**
  it('empty results show "No spells found" message', () => {
    render(<SpellPicker {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search spells...');
    fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } });

    expect(screen.getByText('No spells found')).toBeInTheDocument();
  });

  // **Validates: Requirements 5.1**
  it('pre-selects correct lore tab based on character talents', () => {
    const talents: Talent[] = [
      { n: 'Arcane Magic (Fire)', lvl: 1, desc: 'You can cast fire spells' },
    ];

    render(
      <SpellPicker
        {...defaultProps}
        characterTalents={talents}
      />
    );

    const fireTab = screen.getByRole('tab', { name: 'Lore of Fire' });
    expect(fireTab).toHaveAttribute('aria-selected', 'true');

    // "All" tab should not be selected
    const allTab = screen.getByRole('tab', { name: 'All' });
    expect(allTab).toHaveAttribute('aria-selected', 'false');
  });
});
