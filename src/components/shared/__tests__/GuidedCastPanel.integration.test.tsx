import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpellCastingPanel } from '../SpellCastingPanel';
import { CastResultDisplay } from '../CastResultDisplay';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, SpellItem } from '../../../types/character';
import type { CastingResult } from '../../../logic/spell-casting';
import { DICE_ENTRY_MODE_KEY } from '../../../hooks/useDiceEntryMode';

/**
 * Full hand-off integration through SpellCastingPanel + GuidedCastPanel
 * (guided-spellcasting FEAT-003 ACs). All casting d100 rolls go through the
 * EXISTING RollDialog (manual entry for determinism); the guide renders no dice.
 * The miscast d100 stays on the panel's Math.random handler. Exactly one
 * aria-modal dialog focus-traps at a time (RollDialog-yield + CastResultDisplay
 * suppression).
 */

// Magic missile, CN 8 — a passed-but-under-CN critical case when SL < CN.
const boltCN8: SpellItem = {
  name: 'Bolt',
  cn: '8',
  range: 'WP yards',
  target: '1',
  duration: 'Instant',
  effect: 'Magic missile Dmg +4',
  memorized: true,
};

// Magic missile, CN 1 — a low CN so a double success yields overcast surplus.
const boltCN1: SpellItem = {
  name: 'Dart',
  cn: '1',
  range: 'WP yards',
  target: '1',
  duration: 'Instant',
  effect: 'Magic missile Dmg +4',
  memorized: true,
};

// Touch spell, CN 1 — range column disabled by computeOvercastOptions.
const touchCN1: SpellItem = {
  name: 'Mend',
  cn: '1',
  range: 'Touch',
  target: '1',
  duration: 'Instant',
  effect: 'Magic missile Dmg +2',
  memorized: true,
};

function makeChar(spells: SpellItem[]): Character {
  const base = structuredClone(BLANK_CHARACTER);
  return {
    ...base,
    chars: {
      ...base.chars,
      Int: { i: 35, a: 0, b: 0 }, // casting target 35 + 5 = 40
      WP: { i: 30, a: 5, b: 0 },
      T: { i: 30, a: 5, b: 0 },
    },
    talents: [{ n: 'Arcane Magic (Fire)', lvl: 1, desc: '' }],
    aSkills: [
      { n: 'Language (Magick)', c: 'Int', a: 5 },
      { n: 'Channelling', c: 'WP', a: 10 },
    ],
    spells,
  };
}

interface Harness {
  character: Character;
  updateCharacter: ReturnType<typeof vi.fn>;
  onCastResolved: ReturnType<typeof vi.fn>;
}

function renderPanel(spells: SpellItem[]): Harness {
  const character = makeChar(spells);
  const updateCharacter = vi.fn();
  const onCastResolved = vi.fn();
  render(
    <SpellCastingPanel
      character={character}
      update={vi.fn()}
      updateCharacter={updateCharacter}
      addRoll={vi.fn()}
      onCastResolved={onCastResolved}
    />,
  );
  return { character, updateCharacter, onCastResolved };
}

/** Open the guide for a spell row. */
function openGuide(spellName: string) {
  fireEvent.click(screen.getByText(spellName));
  fireEvent.click(screen.getByTestId('guided-cast-trigger'));
}

/** Resolve the open RollDialog with a manual d100 value. */
function resolveManualRoll(value: number) {
  const dialog = screen.getByRole('dialog', { name: 'Roll Dialog' });
  const input = within(dialog).getByLabelText('Your d100 roll');
  fireEvent.change(input, { target: { value: String(value) } });
  fireEvent.click(within(dialog).getByText('Resolve'));
}

function guideDialog() {
  return screen.getByRole('dialog', { name: 'Guide my spell' });
}

beforeEach(() => {
  localStorage.setItem(DICE_ENTRY_MODE_KEY, 'manual');
});

afterEach(() => {
  localStorage.removeItem(DICE_ENTRY_MODE_KEY);
  vi.restoreAllMocks();
});

describe('Guided cast — Cast route + RollDialog hand-off (AC-5)', () => {
  it('Cast opens the existing RollDialog (Language (Magick), base target 40); the guide renders no dice', () => {
    renderPanel([boltCN8]);
    openGuide('Bolt');
    fireEvent.click(screen.getByTestId('guided-cast-next')); // → Route

    fireEvent.click(within(guideDialog()).getByText('Cast now'));

    const roll = screen.getByRole('dialog', { name: 'Roll Dialog' });
    expect(within(roll).getByText('Language (Magick)')).toBeInTheDocument();
    // Base target 40 (Int total 35 + Language advances 5); also the Challenging
    // (+0) modified target, so the value appears for both Base and Modified.
    expect(within(roll).getByText('Base Target')).toBeInTheDocument();
    expect(within(roll).getAllByText('40').length).toBeGreaterThanOrEqual(1);
  });

  it('while the Cast roll is open EXACTLY ONE aria-modal dialog is mounted (RollDialog); the guide yields (MEDIUM-2)', () => {
    renderPanel([boltCN8]);
    openGuide('Bolt');
    fireEvent.click(screen.getByTestId('guided-cast-next'));
    fireEvent.click(within(guideDialog()).getByText('Cast now'));

    const modals = screen.getAllByRole('dialog').filter((d) => d.getAttribute('aria-modal') === 'true');
    expect(modals).toHaveLength(1);
    expect(modals[0]).toHaveAttribute('aria-label', 'Roll Dialog');
    // The guide overlay is not mounted while the dialog is open.
    expect(screen.queryByRole('dialog', { name: 'Guide my spell' })).not.toBeInTheDocument();
  });
});

describe('Guided cast — resolve + critical choice (AC-6)', () => {
  it('after a seeded roll, Step 3 shows SL/CN and the critical choice renders on isCriticalCast ALONE (passed-but-under-CN)', () => {
    renderPanel([boltCN8]);
    openGuide('Bolt');
    fireEvent.click(screen.getByTestId('guided-cast-next'));
    fireEvent.click(within(guideDialog()).getByText('Cast now'));
    // Roll 11 vs target 40 → SL 3, double → critical; SL 3 < CN 8 → cast FAILS.
    resolveManualRoll(11);

    const dialog = guideDialog();
    expect(within(dialog).getByLabelText('SL achieved breakdown')).toHaveTextContent('+3');
    expect(within(dialog).getByLabelText('SL vs CN breakdown')).toHaveTextContent('+3 vs 8');
    // Failed to reach CN, yet the Critical Cast choices render (isCriticalCast alone).
    expect(within(dialog).getByText(/Failed to reach CN/)).toBeInTheDocument();
    expect(within(dialog).getByText('Total Power')).toBeInTheDocument();
    expect(within(dialog).getByText('Unstoppable Force')).toBeInTheDocument();
  });

  it('choosing Critical Wound does NOT fire onCastResolved again (display-only branch)', () => {
    const { onCastResolved } = renderPanel([boltCN8]);
    openGuide('Bolt');
    fireEvent.click(screen.getByTestId('guided-cast-next'));
    fireEvent.click(within(guideDialog()).getByText('Cast now'));
    resolveManualRoll(11);
    expect(onCastResolved).toHaveBeenCalledTimes(1); // initial resolve

    fireEvent.click(within(guideDialog()).getByText('Critical Wound'));
    expect(onCastResolved).toHaveBeenCalledTimes(1); // no re-resolve
  });
});

describe('Guided cast — Total Power / Unstoppable Force re-resolve (AC-6/7)', () => {
  it('Total Power raises overcast budget and Step 4 availableSlots; budget tooltip sums under Total Power', () => {
    const { onCastResolved } = renderPanel([boltCN1]);
    openGuide('Dart');
    fireEvent.click(screen.getByTestId('guided-cast-next'));
    fireEvent.click(within(guideDialog()).getByText('Cast now'));
    // Roll 11 vs 40 → SL 3, double → critical, success (3 ≥ CN 1). overcastSlots = 2.
    resolveManualRoll(11);
    expect(onCastResolved).toHaveBeenCalledTimes(1);

    // Choose Total Power → re-resolve (adds tens digit of 11 = 1 to SL budget).
    fireEvent.click(within(guideDialog()).getByText('Total Power'));
    expect(onCastResolved).toHaveBeenCalledTimes(2);

    // Go to the Overcast step and check the budget total = 3 (2 + Total Power 1).
    fireEvent.click(within(guideDialog()).getByLabelText(/Go to step .*: Overcast/));
    const budget = within(guideDialog()).getByLabelText('Overcast budget (surplus SL) breakdown');
    expect(budget).toHaveTextContent('3');

    // Budget tooltip: SL 3 + Total Power +1 − CN 1 = 3.
    fireEvent.click(budget);
    const tip = screen.getAllByRole('tooltip').find((t) => /Total Power bonus/.test(t.textContent ?? ''))!;
    expect(tip).toHaveTextContent('SL achieved 3');
    expect(tip).toHaveTextContent('Total Power bonus +1');
    expect(tip).toHaveTextContent('= 3 surplus SL');

    // Allocator reflects the raised budget (3 slots).
    expect(within(guideDialog()).getByText(/Allocated: 0 \/ 3/)).toBeInTheDocument();
  });

  it('Unstoppable Force marks the outcome undispellable in Step 6', () => {
    renderPanel([boltCN1]);
    openGuide('Dart');
    fireEvent.click(screen.getByTestId('guided-cast-next'));
    fireEvent.click(within(guideDialog()).getByText('Cast now'));
    resolveManualRoll(11);
    fireEvent.click(within(guideDialog()).getByText('Unstoppable Force'));

    fireEvent.click(within(guideDialog()).getByLabelText(/Go to step .*: Outcome/));
    expect(within(guideDialog()).getByText(/Unstoppable Force/)).toBeInTheDocument();
  });
});

describe('Guided cast — in-body controls, no CastResultDisplay (MEDIUM-2 / AC-8)', () => {
  it('while the guide is open NO CastResultDisplay overlay is mounted; the in-body allocator is reachable', () => {
    renderPanel([boltCN1]);
    openGuide('Dart');
    fireEvent.click(screen.getByTestId('guided-cast-next'));
    fireEvent.click(within(guideDialog()).getByText('Cast now'));
    resolveManualRoll(11);

    // The guide is the single aria-modal; CastResultDisplay is suppressed.
    expect(screen.queryByRole('dialog', { name: 'Cast Result' })).not.toBeInTheDocument();
    const modals = screen.getAllByRole('dialog').filter((d) => d.getAttribute('aria-modal') === 'true');
    expect(modals).toHaveLength(1);
    expect(modals[0]).toHaveAttribute('aria-label', 'Guide my spell');

    // The in-body OvercastAllocator (Step 4) is reachable.
    fireEvent.click(within(guideDialog()).getByLabelText(/Go to step .*: Overcast/));
    expect(within(guideDialog()).getByText('Confirm')).toBeInTheDocument();
  });

  it('Overcast appears only when castSuccess && overcastSlots > 0, and disables Touch range column', () => {
    renderPanel([touchCN1]);
    openGuide('Mend');
    fireEvent.click(screen.getByTestId('guided-cast-next'));
    fireEvent.click(within(guideDialog()).getByText('Cast now'));
    resolveManualRoll(11); // SL 3 ≥ CN 1 → success, surplus > 0

    fireEvent.click(within(guideDialog()).getByLabelText(/Go to step .*: Overcast/));
    // Touch disables the Range column (computeOvercastOptions) → "N/A (Touch)".
    expect(within(guideDialog()).getByText(/N\/A \(Touch\)/)).toBeInTheDocument();
  });
});

describe('Guided cast — overcast confirm keeps result alive, Step 6 shows effects (AC-7)', () => {
  it('confirm fires onOvercastResolved (result stays mounted) and Step 6 lists resolved effects', () => {
    renderPanel([boltCN1]);
    openGuide('Dart');
    fireEvent.click(screen.getByTestId('guided-cast-next'));
    fireEvent.click(within(guideDialog()).getByText('Cast now'));
    resolveManualRoll(11); // success, overcastSlots 2

    fireEvent.click(within(guideDialog()).getByLabelText(/Go to step .*: Overcast/));
    // Allocate 1 SL to Targets then confirm.
    fireEvent.click(within(guideDialog()).getByLabelText('Increase Targets'));
    fireEvent.click(within(guideDialog()).getByText('Confirm'));

    // Result still mounted (guide open); step 6 shows the resolved effect.
    fireEvent.click(within(guideDialog()).getByLabelText(/Go to step .*: Outcome/));
    expect(within(guideDialog()).getByText(/Overcast effects/)).toBeInTheDocument();
    expect(within(guideDialog()).getByText(/targets:/)).toBeInTheDocument();
  });
});

describe('Guided cast — miscast via Math.random, no RollDialog (AC-9)', () => {
  it('a triggered miscast shows a cited reason and rolls via the Math.random handler (no RollDialog)', () => {
    // Deterministic miscast d100 → 50 ("Driven to Distraction", no escalation).
    vi.spyOn(Math, 'random').mockReturnValue(0.49);

    renderPanel([boltCN1]);
    openGuide('Dart');
    fireEvent.click(screen.getByTestId('guided-cast-next'));
    fireEvent.click(within(guideDialog()).getByText('Cast now'));
    resolveManualRoll(11); // critical success → triggerMinorMiscast

    fireEvent.click(within(guideDialog()).getByLabelText(/Go to step .*: Miscast/));
    // Cited reason for the critical-triggered Minor Miscast.
    expect(
      within(guideDialog()).getByText(/Critical Cast \(double on a successful/),
    ).toBeInTheDocument();

    fireEvent.click(within(guideDialog()).getByText('Roll Minor Miscast'));
    // The miscast result is shown and NO RollDialog was opened for it.
    expect(within(guideDialog()).getByText('Driven to Distraction')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Roll Dialog' })).not.toBeInTheDocument();
  });
});

describe('Guided cast — backdrop close resets (AC-6 reset)', () => {
  it('backdrop click dispatches reset and removes the overlay', () => {
    renderPanel([boltCN1]);
    openGuide('Dart');
    fireEvent.click(screen.getByTestId('guided-cast-backdrop'));
    expect(screen.queryByRole('dialog', { name: 'Guide my spell' })).not.toBeInTheDocument();
  });
});

describe('Default-off regression — CastResultDisplay nulls + closes on only onOvercastAllocated', () => {
  it('without the guide, the allocator confirm invokes onOvercastAllocated (close-on-confirm path)', () => {
    const onOvercastAllocated = vi.fn();
    const result: CastingResult = {
      rollResult: {
        roll: 11, targetNumber: 40, baseTarget: 40, difficulty: 'Challenging',
        passed: true, isCritical: false, isFumble: false, isAutoSuccess: false,
        isAutoFailure: false, outcome: 'Success', skillOrCharName: 'Language (Magick)',
        timestamp: 0, sl: 3,
      },
      spell: boltCN1, cn: 1, slAchieved: 3, castSuccess: true, surplusSL: 2,
      overcastSlots: 2, overcastAllocation: null, isCriticalCast: false,
      isFumbledCast: false, triggerMinorMiscast: false, triggerMajorMiscast: false,
      isMagicMissile: true, hitLocation: 'Body', damage: 7, isFullyChannelled: false,
      isUndispellable: false,
    };
    render(
      <CastResultDisplay
        castingResult={result}
        character={makeChar([boltCN1])}
        onOvercastAllocated={onOvercastAllocated}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Confirm'));
    expect(onOvercastAllocated).toHaveBeenCalledTimes(1);
  });
});
