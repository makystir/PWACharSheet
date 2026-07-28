import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CombatDashboard } from '../combat/CombatDashboard';
import { ArmourMap } from '../combat/ArmourMap';
import { SpellCastingPanel } from '../shared/SpellCastingPanel';
import { SettingsPage } from '../pages/SettingsPage';
import { CharacterPage } from '../pages/CharacterPage';
import { BLANK_CHARACTER } from '../../types/character';
import type { CombatDashboardProps } from '../combat/CombatDashboard';
import type { ArmourMapProps } from '../combat/ArmourMap';
import type { Character, CombatState, ArmourPoints, ArmourItem, SpellItem } from '../../types/character';

/**
 * Interaction Consolidation Tests (Task 16.4)
 * Validates: Requirements 9.1, 9.2, 5.3, 9.4, 11.5, 12.1
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

function makeCombatDashboardProps(overrides: Partial<CombatDashboardProps> = {}): CombatDashboardProps {
  const combatState: CombatState = {
    inCombat: true,
    initiative: 0,
    currentRound: 1,
    engaged: false,
    surprised: false,
  };
  return {
    wCur: 10,
    totalWounds: 14,
    advantage: 2,
    combatState,
    conditions: [],
    fortune: 2,
    fate: 3,
    resolve: 1,
    resilience: 2,
    inCombat: true,
    onUpdateWounds: vi.fn(),
    onUpdateAdvantage: vi.fn(),
    onUpdateRound: vi.fn(),
    onToggleEngaged: vi.fn(),
    onRemoveCondition: vi.fn(),
    onSpendFortune: vi.fn(),
    onSpendResolve: vi.fn(),
    onOpenConditionPicker: vi.fn(),
    ...overrides,
  };
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

function makeArmourMapProps(overrides: Partial<ArmourMapProps> = {}): ArmourMapProps {
  return {
    armourPoints: defaultAP,
    armourList: [],
    onOpenRuneManager: vi.fn(),
    onOpenArmourPicker: vi.fn(),
    ...overrides,
  };
}

// ─── 9.1 & 9.2: Connected Button Bar — wound and advantage controls ─────────

describe('Interaction Consolidation — Connected Button Bar (Req 9.1, 9.2)', () => {
  it('wound −/+/Full buttons are siblings within a single buttonBar container', () => {
    render(<CombatDashboard {...makeCombatDashboardProps()} />);

    const decrease = screen.getByRole('button', { name: 'Decrease wounds' });
    const increase = screen.getByRole('button', { name: 'Increase wounds' });
    const full = screen.getByRole('button', { name: 'Full wounds' });

    // All three buttons share the same parent (the connected button bar)
    const buttonBar = decrease.parentElement;
    expect(buttonBar).not.toBeNull();
    expect(buttonBar).toContainElement(increase);
    expect(buttonBar).toContainElement(full);

    // The container uses the buttonBar CSS class (no gap between buttons)
    expect(buttonBar!.className).toContain('buttonBar');
  });

  it('advantage −/+/Reset buttons are siblings within a single buttonBar container', () => {
    render(<CombatDashboard {...makeCombatDashboardProps({ inCombat: true })} />);

    const decrease = screen.getByRole('button', { name: 'Decrease advantage' });
    const increase = screen.getByRole('button', { name: 'Increase advantage' });
    const reset = screen.getByRole('button', { name: 'Reset advantage' });

    // All three buttons share the same parent (the connected button bar)
    const buttonBar = decrease.parentElement;
    expect(buttonBar).not.toBeNull();
    expect(buttonBar).toContainElement(increase);
    expect(buttonBar).toContainElement(reset);

    // The container uses the buttonBar CSS class
    expect(buttonBar!.className).toContain('buttonBar');
  });

  it('wound button bar contains exactly 3 buttons (−, +, Full)', () => {
    render(<CombatDashboard {...makeCombatDashboardProps()} />);

    const decrease = screen.getByRole('button', { name: 'Decrease wounds' });
    const buttonBar = decrease.parentElement!;
    const buttons = buttonBar.querySelectorAll('button');
    expect(buttons).toHaveLength(3);
  });

  it('advantage button bar contains exactly 3 buttons (−, +, Reset)', () => {
    render(<CombatDashboard {...makeCombatDashboardProps({ inCombat: true })} />);

    const decrease = screen.getByRole('button', { name: 'Decrease advantage' });
    const buttonBar = decrease.parentElement!;
    const buttons = buttonBar.querySelectorAll('button');
    expect(buttons).toHaveLength(3);
  });
});

// ─── 5.3: Export dropdown opens on click ─────────────────────────────────────

describe('Interaction Consolidation — Export Dropdown (Req 5.3)', () => {
  it('Export button click reveals "Copy to Clipboard" and "Download File" options', () => {
    render(
      <SettingsPage
        character={makeCharacter({ name: 'Test' })}
        characterId="test-char"
        update={vi.fn()}
        updateCharacter={vi.fn()}
        totalWounds={10}
        armourPoints={defaultAP}
        maxEncumbrance={5}
        coinWeight={0}
      />,
    );

    // Options are hidden before clicking
    expect(screen.queryByText('Copy to Clipboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Download File')).not.toBeInTheDocument();

    // Click the Export dropdown button
    const exportBtn = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportBtn);

    // Options are now visible
    expect(screen.getByText('Copy to Clipboard')).toBeInTheDocument();
    expect(screen.getByText('Download File')).toBeInTheDocument();
  });
});

// ─── 9.4: "Add" dropdown menu on Character abilities tab ─────────────────────

describe('Interaction Consolidation — Add Dropdown (Req 9.4)', () => {
  it('"Add" button on abilities tab reveals "Add from Rulebook" and "Add Custom" options', () => {
    const char = makeCharacter({ aSkills: [{ n: 'Lore (Magic)', c: 'Int', a: 5 }] });

    render(
      <CharacterPage
        character={char}
        update={vi.fn()}
        updateCharacter={vi.fn()}
        totalWounds={10}
        armourPoints={defaultAP}
        maxEncumbrance={5}
        coinWeight={0}
      />,
    );

    // Navigate to Abilities tab
    fireEvent.click(screen.getByText('Abilities'));

    // Click the first "Add" dropdown button (for advanced skills)
    const addButtons = screen.getAllByText('Add');
    fireEvent.click(addButtons[0]);

    // Dropdown reveals the two menu options
    expect(screen.getByRole('menuitem', { name: 'Add from Rulebook' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Add Custom' })).toBeInTheDocument();
  });
});

// ─── 11.5: "Show all" toggle in armour list expands items ────────────────────

describe('Interaction Consolidation — Armour Show All Toggle (Req 11.5)', () => {
  it('when > 4 items, only 3 visible with "Show all (N)" toggle; clicking reveals all', () => {
    const armourList = [
      makeArmourItem({ name: 'Helmet', locations: 'Head', ap: 2 }),
      makeArmourItem({ name: 'Breastplate', locations: 'Body', ap: 3 }),
      makeArmourItem({ name: 'Greaves', locations: 'Legs', ap: 1 }),
      makeArmourItem({ name: 'Bracers', locations: 'Arms', ap: 1 }),
      makeArmourItem({ name: 'Cloak', locations: 'All', ap: 1 }),
    ];
    render(<ArmourMap {...makeArmourMapProps({ armourList })} />);

    // Only first 3 items visible initially
    expect(screen.getByTestId('armour-item-0')).toBeInTheDocument();
    expect(screen.getByTestId('armour-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('armour-item-2')).toBeInTheDocument();
    expect(screen.queryByTestId('armour-item-3')).not.toBeInTheDocument();
    expect(screen.queryByTestId('armour-item-4')).not.toBeInTheDocument();

    // Toggle button shows count
    const toggle = screen.getByTestId('armour-show-all-toggle');
    expect(toggle).toHaveTextContent('Show all (5)');

    // Click toggle to expand
    fireEvent.click(toggle);

    // All items now visible
    expect(screen.getByTestId('armour-item-3')).toBeInTheDocument();
    expect(screen.getByTestId('armour-item-4')).toBeInTheDocument();
    expect(toggle).toHaveTextContent('Show less');
  });
});

// ─── 12.1: Spell card expands on tap to show full details ────────────────────

describe('Interaction Consolidation — Spell Card Expand (Req 12.1)', () => {
  function makeSpellChar(): Character {
    const base = structuredClone(BLANK_CHARACTER);
    return {
      ...base,
      chars: {
        ...base.chars,
        Int: { i: 35, a: 10, b: 0 },
        WP: { i: 30, a: 5, b: 0 },
      },
      aSkills: [
        { n: 'Language (Magick)', c: 'Int', a: 15 },
        { n: 'Channelling', c: 'WP', a: 10 },
      ],
      talents: [{ n: 'Arcane Magic (Fire)', lvl: 1, desc: '' }],
      spells: [
        { name: 'Bolt', cn: '4', range: 'WP yards', target: '1', duration: 'Instant', effect: 'Magic missile Dmg +4', memorized: true },
      ],
      channellingProgress: [],
    };
  }

  it('spell row shows only name and CN by default', () => {
    render(
      <SpellCastingPanel
        character={makeSpellChar()}
        update={vi.fn()}
        updateCharacter={vi.fn()}
        addRoll={vi.fn()}
      />,
    );

    // Name and CN visible in compact view
    expect(screen.getByText('Bolt')).toBeInTheDocument();
    expect(screen.getByText('CN 4')).toBeInTheDocument();

    // Cast/Channel buttons NOT visible until expanded
    expect(screen.queryByLabelText('Cast Bolt')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Channel Bolt')).not.toBeInTheDocument();
  });

  it('tapping spell row expands to show Cast and Channel buttons', () => {
    render(
      <SpellCastingPanel
        character={makeSpellChar()}
        update={vi.fn()}
        updateCharacter={vi.fn()}
        addRoll={vi.fn()}
      />,
    );

    // Tap the spell row to expand
    fireEvent.click(screen.getByText('Bolt'));

    // Cast and Channel action buttons are now visible
    expect(screen.getByLabelText('Cast Bolt')).toBeInTheDocument();
    expect(screen.getByLabelText('Channel Bolt')).toBeInTheDocument();
  });

  it('expanded spell card shows metadata (range, target, duration)', () => {
    render(
      <SpellCastingPanel
        character={makeSpellChar()}
        update={vi.fn()}
        updateCharacter={vi.fn()}
        addRoll={vi.fn()}
      />,
    );

    // Tap to expand
    fireEvent.click(screen.getByText('Bolt'));

    // Metadata is revealed in the expanded details
    expect(screen.getByText('WP yards')).toBeInTheDocument();
    expect(screen.getByText('Instant')).toBeInTheDocument();
  });
});
