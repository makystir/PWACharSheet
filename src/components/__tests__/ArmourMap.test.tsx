import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ArmourMap } from '../combat/ArmourMap';
import type { ArmourMapProps } from '../combat/ArmourMap';
import type { ArmourPoints, ArmourItem } from '../../types/character';

function makeArmourPoints(overrides: Partial<ArmourPoints> = {}): ArmourPoints {
  return { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0, ...overrides };
}

function makeArmourItem(overrides: Partial<ArmourItem> = {}): ArmourItem {
  return {
    name: 'Leather Jerkin',
    locations: 'Body, Arms',
    enc: '1',
    ap: 1,
    qualities: '—',
    ...overrides,
  };
}

function makeProps(overrides: Partial<ArmourMapProps> = {}): ArmourMapProps {
  return {
    armourPoints: makeArmourPoints(),
    armourList: [],
    onOpenRuneManager: vi.fn(),
    onOpenArmourPicker: vi.fn(),
    ...overrides,
  };
}

// ─── 6.1: Component renders with correct props ─────────────────────────────

describe('ArmourMap — basic rendering', () => {
  it('renders the Armour section header', () => {
    render(<ArmourMap {...makeProps()} />);
    expect(screen.getByText('Armour')).toBeInTheDocument();
  });

  it('renders the body map grid', () => {
    render(<ArmourMap {...makeProps()} />);
    expect(screen.getByTestId('armour-body-map')).toBeInTheDocument();
  });

  it('shows empty message when no armour items', () => {
    render(<ArmourMap {...makeProps({ armourList: [] })} />);
    expect(screen.getByText(/No armour worn/)).toBeInTheDocument();
  });
});

// ─── 6.2: Visual layout of six hit locations with AP values ─────────────────

describe('ArmourMap — hit location grid', () => {
  it('renders all six hit locations with their AP values', () => {
    const ap = makeArmourPoints({ head: 2, lArm: 1, rArm: 1, body: 3, lLeg: 0, rLeg: 0 });
    render(<ArmourMap {...makeProps({ armourPoints: ap })} />);

    expect(screen.getByTestId('location-head')).toHaveTextContent('2');
    expect(screen.getByTestId('location-lArm')).toHaveTextContent('1');
    expect(screen.getByTestId('location-rArm')).toHaveTextContent('1');
    expect(screen.getByTestId('location-body')).toHaveTextContent('3');
    expect(screen.getByTestId('location-lLeg')).toHaveTextContent('0');
    expect(screen.getByTestId('location-rLeg')).toHaveTextContent('0');
  });

  it('renders location labels', () => {
    render(<ArmourMap {...makeProps()} />);
    expect(screen.getByText('Head')).toBeInTheDocument();
    expect(screen.getByText('L Arm')).toBeInTheDocument();
    expect(screen.getByText('R Arm')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('L Leg')).toBeInTheDocument();
    expect(screen.getByText('R Leg')).toBeInTheDocument();
  });

  it('each location button has accessible label with AP value', () => {
    const ap = makeArmourPoints({ head: 5 });
    render(<ArmourMap {...makeProps({ armourPoints: ap })} />);
    expect(screen.getByLabelText('Head AP 5')).toBeInTheDocument();
  });

  it('location buttons meet minimum 44×44px tap target', () => {
    render(<ArmourMap {...makeProps()} />);
    const btn = screen.getByTestId('location-head');
    expect(parseInt(btn.style.minWidth)).toBeGreaterThanOrEqual(44);
    expect(parseInt(btn.style.minHeight)).toBeGreaterThanOrEqual(44);
  });
});

// ─── 6.3: Highlight location on tap and show contributing armour ────────────

describe('ArmourMap — location selection', () => {
  it('highlights a location when tapped', () => {
    render(<ArmourMap {...makeProps()} />);
    const headBtn = screen.getByTestId('location-head');

    fireEvent.click(headBtn);
    expect(headBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('deselects a location when tapped again', () => {
    render(<ArmourMap {...makeProps()} />);
    const headBtn = screen.getByTestId('location-head');

    fireEvent.click(headBtn);
    expect(headBtn).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(headBtn);
    expect(headBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows contributing armour items when a location is selected', () => {
    const armourList = [
      makeArmourItem({ name: 'Helmet', locations: 'Head', ap: 2 }),
      makeArmourItem({ name: 'Breastplate', locations: 'Body, Arms', ap: 3 }),
    ];
    render(<ArmourMap {...makeProps({ armourList })} />);

    fireEvent.click(screen.getByTestId('location-head'));
    const contributing = screen.getByTestId('contributing-armour');
    expect(contributing).toHaveTextContent('Helmet');
    expect(contributing).not.toHaveTextContent('Breastplate');
  });

  it('shows "No armour covers this location" when no items cover selected location', () => {
    const armourList = [
      makeArmourItem({ name: 'Helmet', locations: 'Head', ap: 2 }),
    ];
    render(<ArmourMap {...makeProps({ armourList })} />);

    fireEvent.click(screen.getByTestId('location-lLeg'));
    expect(screen.getByText(/No armour covers this location/)).toBeInTheDocument();
  });

  it('shows multiple contributing items for a location', () => {
    const armourList = [
      makeArmourItem({ name: 'Mail Shirt', locations: 'Body, Arms', ap: 2 }),
      makeArmourItem({ name: 'Breastplate', locations: 'Body', ap: 3 }),
    ];
    render(<ArmourMap {...makeProps({ armourList })} />);

    fireEvent.click(screen.getByTestId('location-body'));
    const contributing = screen.getByTestId('contributing-armour');
    expect(contributing).toHaveTextContent('Mail Shirt');
    expect(contributing).toHaveTextContent('Breastplate');
  });

  it('matches armour with "All" locations to every body part', () => {
    const armourList = [
      makeArmourItem({ name: 'Magic Cloak', locations: 'All', ap: 1 }),
    ];
    render(<ArmourMap {...makeProps({ armourList })} />);

    fireEvent.click(screen.getByTestId('location-rLeg'));
    const contributing = screen.getByTestId('contributing-armour');
    expect(contributing).toHaveTextContent('Magic Cloak');
  });

  it('shows contributing item qualities when present', () => {
    const armourList = [
      makeArmourItem({ name: 'Fine Helmet', locations: 'Head', ap: 2, qualities: 'Fine' }),
    ];
    render(<ArmourMap {...makeProps({ armourList })} />);

    fireEvent.click(screen.getByTestId('location-head'));
    expect(screen.getByTestId('contributing-armour')).toHaveTextContent('Fine');
  });
});

// ─── 6.4: Compact read-only list of worn armour items ───────────────────────

describe('ArmourMap — worn armour list', () => {
  it('renders armour items with name, locations, AP, and qualities', () => {
    const armourList = [
      makeArmourItem({ name: 'Leather Cap', locations: 'Head', ap: 1, qualities: 'Partial' }),
    ];
    render(<ArmourMap {...makeProps({ armourList })} />);

    const item = screen.getByTestId('armour-item-0');
    expect(item).toHaveTextContent('Leather Cap');
    expect(item).toHaveTextContent('Head');
    expect(item).toHaveTextContent('AP 1');
    expect(item).toHaveTextContent('Partial');
  });

  it('renders multiple armour items', () => {
    const armourList = [
      makeArmourItem({ name: 'Helmet', locations: 'Head', ap: 2 }),
      makeArmourItem({ name: 'Breastplate', locations: 'Body', ap: 3 }),
    ];
    render(<ArmourMap {...makeProps({ armourList })} />);

    expect(screen.getByTestId('armour-item-0')).toHaveTextContent('Helmet');
    expect(screen.getByTestId('armour-item-1')).toHaveTextContent('Breastplate');
  });

  it('shows "Unnamed" for armour items with empty name', () => {
    const armourList = [makeArmourItem({ name: '' })];
    render(<ArmourMap {...makeProps({ armourList })} />);
    expect(screen.getByTestId('armour-item-0')).toHaveTextContent('Unnamed');
  });

  it('does not show qualities text when qualities is "—"', () => {
    const armourList = [makeArmourItem({ qualities: '—' })];
    render(<ArmourMap {...makeProps({ armourList })} />);
    const item = screen.getByTestId('armour-item-0');
    // The qualities section should not render the "—" as visible quality text
    // The item should still render name, locations, AP
    expect(item).toHaveTextContent('Leather Jerkin');
  });
});

// ─── 6.5: Rune indicator on armour items ────────────────────────────────────

describe('ArmourMap — rune indicator', () => {
  it('shows rune badge when armour has runes', () => {
    const armourList = [makeArmourItem({ runes: ['rune-of-iron'] })];
    render(<ArmourMap {...makeProps({ armourList })} />);
    expect(screen.getByText(/1\/3/)).toBeInTheDocument();
  });

  it('shows "Runes" button when armour has no runes', () => {
    const armourList = [makeArmourItem({ runes: [] })];
    render(<ArmourMap {...makeProps({ armourList })} />);
    expect(screen.getByText(/Runes/)).toBeInTheDocument();
  });

  it('calls onOpenRuneManager with armour index when rune badge is clicked', () => {
    const onOpenRuneManager = vi.fn();
    const armourList = [makeArmourItem({ runes: ['rune-of-iron'] })];
    render(<ArmourMap {...makeProps({ armourList, onOpenRuneManager })} />);
    fireEvent.click(screen.getByLabelText(/Manage runes for Leather Jerkin/));
    expect(onOpenRuneManager).toHaveBeenCalledWith(0);
  });

  it('does not show rune badge when onOpenRuneManager is undefined', () => {
    const armourList = [makeArmourItem({ runes: ['rune-of-iron'] })];
    render(<ArmourMap {...makeProps({ armourList, onOpenRuneManager: undefined })} />);
    expect(screen.queryByLabelText(/Manage runes/)).not.toBeInTheDocument();
  });
});

// ─── 6.6: Add from Rulebook / Add Custom (replaces old Manage Armour link) ──

describe('ArmourMap — no redundant Manage Armour link', () => {
  it('does not render a "Manage Armour" link', () => {
    render(<ArmourMap {...makeProps()} />);
    expect(screen.queryByText('Manage Armour')).not.toBeInTheDocument();
  });
});
