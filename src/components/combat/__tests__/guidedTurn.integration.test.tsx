import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CombatPage } from '../../pages/CombatPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints } from '../../../types/character';
import { deriveAllReminders } from '../../../logic/reminders';

// Force a desktop viewport so the full CombatDashboard (which owns the
// end-turn-btn + combat-dashboard testid) renders in every mode, matching the
// real desktop layout. The guide's own mobile branch (max-width: 767px) stays
// false, i.e. desktop slide-over.
vi.mock('../../../hooks/useMediaQuery', () => ({
  useMediaQuery: (query: string) => query === '(min-width: 1025px)',
}));

beforeEach(() => {
  localStorage.setItem('wfrp-hint-dismissed-advantage-tracking', '3');
  localStorage.setItem('wfrp-hint-dismissed-fortune-resolve-spending', '3');
  localStorage.setItem('wfrp-hint-dismissed-weapon-damage-formula', '3');
});

afterEach(() => localStorage.clear());

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

const activeCombat = { inCombat: true, initiative: 0, currentRound: 1, engaged: false, surprised: false };

function renderCombatPage(overrides: Partial<Character> = {}) {
  const char = makeCharacter(overrides);
  const updateCharacter = vi.fn();
  const update = vi.fn();
  const utils = render(
    <CombatPage
      character={char}
      characterId="test-char-id"
      update={update}
      updateCharacter={updateCharacter}
      totalWounds={10}
      armourPoints={defaultAP}
      maxEncumbrance={5}
      coinWeight={0}
    />,
  );
  const rerender = (next: Partial<Character>) => {
    const c = makeCharacter({ ...char, ...next });
    utils.rerender(
      <CombatPage
        character={c}
        characterId="test-char-id"
        update={update}
        updateCharacter={updateCharacter}
        totalWounds={10}
        armourPoints={defaultAP}
        maxEncumbrance={5}
        coinWeight={0}
      />,
    );
  };
  return { update, updateCharacter, rerender };
}

function openGuide() {
  fireEvent.click(screen.getByTestId('guided-turn-trigger'));
}

/** The guide dialog (distinct from any RollDialog that may also be a dialog). */
function guideDialog() {
  return screen.getByRole('dialog', { name: 'Guide my turn' });
}

/** The step heading text, the single authoritative "Step N of 4" source. */
function stepHeadingText() {
  return within(guideDialog()).getByRole('heading', { level: 2 }).textContent ?? '';
}

describe('Guided Combat Turn — no-regression DOM contract (AC-3, AC-19)', () => {
  it('with the guide off, the segmented tablist has exactly three tabs and the dashboard renders', () => {
    renderCombatPage({ combatState: activeCombat });
    const tablist = screen.getByRole('tablist', { name: 'Combat mode' });
    expect(within(tablist).getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByTestId('combat-dashboard')).toBeInTheDocument();
  });
});

describe('Guided Combat Turn — opening & no mutation (AC-4, AC-12)', () => {
  it('opening shows Step 1 and fires zero character mutations', () => {
    const { update, updateCharacter } = renderCombatPage({ combatState: activeCombat });
    openGuide();
    expect(stepHeadingText()).toMatch(/Step 1 of 4/);
    expect(update).not.toHaveBeenCalled();
    expect(updateCharacter).not.toHaveBeenCalled();
  });
});

describe('Guided Combat Turn — Step 1 reminders match source (AC-5, AC-6)', () => {
  it('renders the deriveAllReminders items in order and opens a seeded RollDialog without rolling', () => {
    const char = makeCharacter({
      combatState: activeCombat,
      conditions: [{ name: 'Stunned', level: 1 }, { name: 'Poisoned', level: 1 }],
    });
    const expected = deriveAllReminders({
      conditions: char.conditions,
      psychologyTraits: char.psychologyTraits ?? [],
      psychologyEnabled: char.houseRules?.usePsychologyTracker ?? false,
    });
    const update = vi.fn();
    const updateCharacter = vi.fn();
    render(
      <CombatPage
        character={char}
        characterId="c"
        update={update}
        updateCharacter={updateCharacter}
        totalWounds={10}
        armourPoints={defaultAP}
        maxEncumbrance={5}
        coinWeight={0}
      />,
    );
    openGuide();
    const strip = within(guideDialog()).getByTestId('combat-reminders');
    for (const r of expected) {
      expect(within(strip).getByTestId(`reminder-${r.id}`)).toBeInTheDocument();
    }
    const firstRoll = expected.find((r) => r.test);
    expect(firstRoll).toBeTruthy();
    fireEvent.click(within(strip).getByRole('button', { name: `Roll ${firstRoll!.test!.rollName}` }));
    // The shared RollDialog opened seeded; nothing was applied to the character.
    expect(screen.getByText(firstRoll!.test!.rollName)).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
    expect(updateCharacter).not.toHaveBeenCalled();
  });
});

describe('Guided Combat Turn — Step 2 (AC-7, AC-8, AC-13)', () => {
  it('Step 2 shows the one-Move-one-Action copy citing Core p.156-157 with the action options', () => {
    renderCombatPage({ combatState: activeCombat });
    openGuide();
    fireEvent.click(screen.getByTestId('guide-next'));
    const dialog = guideDialog();
    expect(within(dialog).getByText(/one Move and one Action/)).toBeInTheDocument();
    expect(within(dialog).getAllByText(/Core p\.156-157/).length).toBeGreaterThan(0);
    expect(within(dialog).getByTestId('guide-option-attack')).toBeInTheDocument();
    expect(within(dialog).getByTestId('guide-option-cast')).toBeInTheDocument();
    expect(within(dialog).getByTestId('guide-option-defend')).toBeInTheDocument();
  });

  it('choosing Attack switches to Attack mode and reveals the Attack Flow without mutation (AC-8, AC-9)', () => {
    const { update, updateCharacter } = renderCombatPage({ combatState: activeCombat });
    openGuide();
    fireEvent.click(screen.getByTestId('guide-next'));
    fireEvent.click(within(guideDialog()).getByTestId('guide-option-attack'));
    // Attack tab is now selected (mode switched to attack).
    expect(screen.getByRole('tab', { name: 'Attack' })).toHaveAttribute('aria-selected', 'true');
    // AttackFlow section is revealed on the page (its collapsible heading is present).
    expect(screen.getAllByText('Attack Flow').length).toBeGreaterThan(0);
    // The guide applied nothing itself.
    expect(update).not.toHaveBeenCalled();
    expect(updateCharacter).not.toHaveBeenCalled();
    // Advanced to the resolve step.
    expect(stepHeadingText()).toMatch(/Step 3 of 4/);
  });

  it('Cast option is disabled when the character cannot cast', () => {
    renderCombatPage({ combatState: activeCombat });
    openGuide();
    fireEvent.click(screen.getByTestId('guide-next'));
    expect(within(guideDialog()).getByTestId('guide-option-cast')).toBeDisabled();
  });

  it('marking Move done is guidance only and does not disable or block anything (AC-13)', () => {
    renderCombatPage({ combatState: activeCombat });
    openGuide();
    fireEvent.click(screen.getByTestId('guide-next'));
    fireEvent.click(within(guideDialog()).getByTestId('guide-mark-move'));
    expect(within(guideDialog()).getByTestId('guide-option-attack')).not.toBeDisabled();
    expect(screen.getByTestId('guide-next')).not.toBeDisabled();
  });
});

describe('Guided Combat Turn — Step 4 End Turn hand-off (AC-10, AC-11)', () => {
  it('the "Go to End Turn" control focuses the existing dashboard end-turn button (no guide-owned button)', () => {
    renderCombatPage({ combatState: activeCombat });
    openGuide();
    fireEvent.click(within(guideDialog()).getByRole('button', { name: /Go to step 4/ }));
    const endBtn = document.querySelector('[data-testid="end-turn-btn"]') as HTMLButtonElement;
    expect(endBtn).toBeTruthy();
    fireEvent.click(within(guideDialog()).getByTestId('guide-goto-end-turn'));
    expect(document.activeElement).toBe(endBtn);
  });
});

describe('Guided Combat Turn — reset boundaries (AC-14)', () => {
  it('changing currentRound resets the guide to Step 1', () => {
    const { rerender } = renderCombatPage({ combatState: activeCombat });
    openGuide();
    fireEvent.click(screen.getByTestId('guide-next'));
    expect(stepHeadingText()).toMatch(/Step 2 of 4/);
    rerender({ combatState: { ...activeCombat, currentRound: 2 } });
    expect(stepHeadingText()).toMatch(/Step 1 of 4/);
  });

  it('changing activeInitiativeIndex resets the guide to Step 1', () => {
    const { rerender } = renderCombatPage({ combatState: activeCombat, activeInitiativeIndex: 0 });
    openGuide();
    fireEvent.click(screen.getByTestId('guide-next'));
    expect(stepHeadingText()).toMatch(/Step 2 of 4/);
    rerender({ combatState: activeCombat, activeInitiativeIndex: 1 });
    expect(stepHeadingText()).toMatch(/Step 1 of 4/);
  });

  it('ending combat closes the guide panel (AC-14 / END COMBAT)', () => {
    const { rerender } = renderCombatPage({ combatState: activeCombat });
    openGuide();
    expect(screen.getByRole('dialog', { name: 'Guide my turn' })).toBeInTheDocument();
    rerender({ combatState: { ...activeCombat, inCombat: false, currentRound: 0 } });
    expect(screen.queryByRole('dialog', { name: 'Guide my turn' })).not.toBeInTheDocument();
  });
});

describe('Guided Combat Turn — accessibility (AC-17)', () => {
  it('Escape closes the panel; arrow keys navigate steps', () => {
    renderCombatPage({ combatState: activeCombat });
    openGuide();
    fireEvent.keyDown(guideDialog(), { key: 'ArrowRight' });
    expect(stepHeadingText()).toMatch(/Step 2 of 4/);
    fireEvent.keyDown(guideDialog(), { key: 'ArrowLeft' });
    expect(stepHeadingText()).toMatch(/Step 1 of 4/);
    fireEvent.keyDown(guideDialog(), { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Guide my turn' })).not.toBeInTheDocument();
  });
});
