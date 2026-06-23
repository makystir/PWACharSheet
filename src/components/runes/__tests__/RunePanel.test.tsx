import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RunePanel from '../RunePanel';
import type { RunePanelProps } from '../RunePanel';
import DoomRuneSection from '../DoomRuneSection';
import ProtectionRuneSection from '../ProtectionRuneSection';
import EngineeringRuneSection from '../EngineeringRuneSection';
import type { ProtectionItem, EngineeringItem } from '../../../types/character';

/**
 * UI unit tests for RunePanel and sub-sections
 * Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */

function getMinimalRunePanelProps(): RunePanelProps {
  return {
    knownRunes: [],
    protectionItems: [],
    engineeringItems: [],
    doomRuneActivations: [],
    forgingCharges: {},
    onAddProtectionItem: vi.fn(),
    onEditProtectionItem: vi.fn(),
    onRemoveProtectionItem: vi.fn(),
    onInscribeProtectionRune: vi.fn(),
    onRemoveProtectionRune: vi.fn(),
    onAddEngineeringItem: vi.fn(),
    onRemoveEngineeringItem: vi.fn(),
    onInscribeEngineeringRune: vi.fn(),
    onRemoveEngineeringRune: vi.fn(),
    onActivateForging: vi.fn(),
    onResetCharges: vi.fn(),
    onActivateDoomRune: vi.fn(),
  };
}

describe('RunePanel renders 6 tabs', () => {
  it('displays 6 tab buttons with correct labels', () => {
    render(<RunePanel {...getMinimalRunePanelProps()} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(6);

    expect(screen.getByRole('tab', { name: 'Weapon' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Armour' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Talisman' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Protection' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Engineering' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Doom' })).toBeInTheDocument();
  });
});

describe('DoomRuneSection shows locked state when no master rune known', () => {
  it('displays locked message when knownRunes has no master rune', () => {
    render(
      <DoomRuneSection
        knownRunes={[]}
        doomRuneActivations={[]}
        onActivate={vi.fn()}
      />
    );

    expect(screen.getByText(/Doom Runes are locked/)).toBeInTheDocument();
  });
});

describe('ProtectionRuneSection shows empty state message', () => {
  it('displays empty state when no runes known and no items', () => {
    render(
      <ProtectionRuneSection
        knownRunes={[]}
        protectionItems={[]}
        onAddItem={vi.fn()}
        onEditItem={vi.fn()}
        onRemoveItem={vi.fn()}
        onInscribeRune={vi.fn()}
        onRemoveRune={vi.fn()}
      />
    );

    expect(
      screen.getByText(/No Protection Runes known and no Protection Items added/)
    ).toBeInTheDocument();
  });
});

describe('EngineeringRuneSection displays forging charge counters', () => {
  it('shows forging label and charge count for item with Rune of Forging', () => {
    const item: EngineeringItem = {
      id: 'eng-1',
      name: 'Old Faithful',
      type: 'Grudge Thrower',
      runes: ['engineering-rune-of-forging'],
    };

    render(
      <EngineeringRuneSection
        knownRunes={['engineering-rune-of-forging']}
        engineeringItems={[item]}
        forgingCharges={{ 'eng-1': 1 }}
        onAddItem={vi.fn()}
        onRemoveItem={vi.fn()}
        onInscribeRune={vi.fn()}
        onRemoveRune={vi.fn()}
        onActivateForging={vi.fn()}
        onResetCharges={vi.fn()}
      />
    );

    expect(screen.getByText('Forging:')).toBeInTheDocument();
    expect(screen.getByText('1/1')).toBeInTheDocument();
  });
});

describe('Item removal confirmation dialog', () => {
  it('shows confirmation dialog with rune count when Remove is clicked', () => {
    const item: ProtectionItem = {
      id: 'prot-1',
      name: 'Clan Banner',
      type: 'banner',
      location: 'Great Hall',
      runes: ['protection-rune-of-alarm', 'protection-rune-of-battle'],
    };

    render(
      <ProtectionRuneSection
        knownRunes={['protection-rune-of-alarm', 'protection-rune-of-battle']}
        protectionItems={[item]}
        onAddItem={vi.fn()}
        onEditItem={vi.fn()}
        onRemoveItem={vi.fn()}
        onInscribeRune={vi.fn()}
        onRemoveRune={vi.fn()}
      />
    );

    const removeButton = screen.getByRole('button', { name: 'Remove' });
    fireEvent.click(removeButton);

    expect(
      screen.getByText(/Remove "Clan Banner"\? 2 inscribed rune\(s\) will be lost\./)
    ).toBeInTheDocument();
  });
});
