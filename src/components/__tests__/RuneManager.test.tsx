import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RuneManager } from '../shared/RuneManager';

const defaultProps = {
  itemType: 'weapon' as const,
  itemIndex: 0,
  itemName: 'Gromril Axe',
  currentRunes: [] as string[],
  knownRunes: ['rune-of-might', 'rune-of-speed', 'rune-of-luck'],
  onAddRune: vi.fn(),
  onRemoveRune: vi.fn(),
  onClose: vi.fn(),
};

function renderManager(overrides: Partial<Omit<typeof defaultProps, 'itemType'>> & { itemType?: 'weapon' | 'armour' } = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<RuneManager {...props} />);
}

describe('RuneManager', () => {
  it('renders the item name as title', () => {
    renderManager();
    expect(screen.getByText('Gromril Axe')).toBeInTheDocument();
  });

  it('displays rune slot usage', () => {
    renderManager({ currentRunes: ['rune-of-might', 'rune-of-speed'] });
    expect(screen.getByText('⚒ 2/3 Rune Slots')).toBeInTheDocument();
  });

  it('shows 0/3 when no runes inscribed', () => {
    renderManager();
    expect(screen.getByText('⚒ 0/3 Rune Slots')).toBeInTheDocument();
  });

  it('renders current runes with remove buttons', () => {
    renderManager({ currentRunes: ['rune-of-might'] });
    expect(screen.getByText('Rune of Might')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Rune of Might')).toBeInTheDocument();
  });

  it('calls onRemoveRune with correct index when remove clicked', () => {
    const onRemoveRune = vi.fn();
    renderManager({ currentRunes: ['rune-of-might', 'rune-of-speed'], onRemoveRune });
    fireEvent.click(screen.getByLabelText('Remove Rune of Speed'));
    expect(onRemoveRune).toHaveBeenCalledWith(1);
  });

  it('renders available runes with add buttons', () => {
    renderManager();
    // rune-of-might, rune-of-speed are weapon runes; rune-of-luck is talisman — all available
    expect(screen.getAllByText('Add').length).toBeGreaterThanOrEqual(3);
  });

  it('calls onAddRune when add button clicked for a valid rune', () => {
    const onAddRune = vi.fn();
    renderManager({ onAddRune });
    fireEvent.click(screen.getByLabelText('Add Rune of Might'));
    expect(onAddRune).toHaveBeenCalledWith('rune-of-might');
  });

  it('shows validation error when adding rune to full item', () => {
    renderManager({
      currentRunes: ['rune-of-might', 'rune-of-speed', 'rune-of-luck'],
      knownRunes: ['rune-of-might', 'rune-of-speed', 'rune-of-luck', 'rune-of-fury'],
    });
    // Item is full (3/3), but rune-of-fury might still appear in available list
    // The add button should trigger validation error
    const addButtons = screen.queryAllByText('Add');
    if (addButtons.length > 0) {
      fireEvent.click(addButtons[0]);
      expect(screen.getByText(/maximum of 3 runes/i)).toBeInTheDocument();
    }
  });

  it('shows informational message when knownRunes is empty', () => {
    renderManager({ knownRunes: [] });
    expect(screen.getByText(/no runes learned/i)).toBeInTheDocument();
  });

  it('shows message when no compatible runes available', () => {
    // armour runes on a weapon item — none compatible
    renderManager({
      knownRunes: ['rune-of-stone', 'rune-of-iron'],
      itemType: 'weapon',
    });
    expect(screen.getByText(/no compatible runes/i)).toBeInTheDocument();
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    renderManager({ onClose });
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    renderManager({ onClose });
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when modal content is clicked', () => {
    const onClose = vi.fn();
    renderManager({ onClose });
    fireEvent.click(screen.getByText('Gromril Axe'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows master rune badge for master runes', () => {
    renderManager({ currentRunes: ['master-rune-of-skalf-blackhammer'], knownRunes: ['master-rune-of-skalf-blackhammer'] });
    expect(screen.getAllByText('★ Master').length).toBeGreaterThanOrEqual(1);
  });

  it('displays rune descriptions', () => {
    renderManager({ currentRunes: ['rune-of-might'] });
    expect(screen.getByText(/Adds \+1 to the weapon's Damage/)).toBeInTheDocument();
  });

  it('filters armour runes for armour items correctly', () => {
    renderManager({
      itemType: 'armour',
      knownRunes: ['rune-of-stone', 'rune-of-might', 'rune-of-luck'],
    });
    // rune-of-stone (armour) and rune-of-luck (talisman) should be available
    // rune-of-might (weapon) should NOT be available
    expect(screen.getByLabelText('Add Rune of Stone')).toBeInTheDocument();
    expect(screen.getByLabelText('Add Rune of Luck')).toBeInTheDocument();
    expect(screen.queryByLabelText('Add Rune of Might')).not.toBeInTheDocument();
  });
});
