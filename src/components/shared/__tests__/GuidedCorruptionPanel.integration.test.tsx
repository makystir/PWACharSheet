import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CorruptionCard } from '../CorruptionCard';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';
import { DICE_ENTRY_MODE_KEY } from '../../../hooks/useDiceEntryMode';

/**
 * Full hand-off integration through CorruptionCard + GuidedCorruptionPanel
 * (FEAT-002 ACs). The single seeded roll (the Challenging (+0) Endurance Test)
 * goes through the EXISTING shared RollDialog (manual entry for determinism);
 * the guide renders no dice and reads no result. The mutation d100s are NEVER
 * seeded — Step 3 hands off to the existing in-card Mutation Roller. Exactly one
 * aria-modal dialog focus-traps at a time (RollDialog-yield).
 */

function makeChar(overrides: Partial<Character> = {}): Character {
  const base = structuredClone(BLANK_CHARACTER);
  return {
    ...base,
    species: 'Human',
    chars: {
      ...base.chars,
      T: { i: 35, a: 5, b: 0 }, // Endurance base target = T total 40, TB 4
      WP: { i: 30, a: 0, b: 0 }, // WPB 3
    },
    ...overrides,
  };
}

function renderCard(overrides: Partial<Character> = {}) {
  const character = makeChar(overrides);
  const update = vi.fn();
  const updateCharacter = vi.fn();
  const onRoll = vi.fn();
  render(
    <CorruptionCard
      character={character}
      update={update}
      updateCharacter={updateCharacter}
      onRoll={onRoll}
    />,
  );
  return { character, update, updateCharacter, onRoll };
}

function openGuide() {
  fireEvent.click(screen.getByTestId('guided-corruption-trigger'));
}

function guideDialog() {
  return screen.getByRole('dialog', { name: 'Guide me through corruption' });
}

function gotoStep(label: 'Threshold' | 'Resistance' | 'Mutation') {
  fireEvent.click(within(guideDialog()).getByLabelText(new RegExp(`Go to step .*: ${label}`)));
}

function resolveManualRoll(value: number) {
  const dialog = screen.getByRole('dialog', { name: 'Roll Dialog' });
  const input = within(dialog).getByLabelText('Your d100 roll');
  fireEvent.change(input, { target: { value: String(value) } });
  fireEvent.click(within(dialog).getByText('Resolve'));
}

beforeEach(() => {
  localStorage.setItem(DICE_ENTRY_MODE_KEY, 'manual');
});

afterEach(() => {
  localStorage.removeItem(DICE_ENTRY_MODE_KEY);
  vi.restoreAllMocks();
});

describe('Guided corruption — Step 2 resistance seeds a Challenging Endurance Test (AC-12)', () => {
  it('seeds a RollDialog with the base target and Challenging difficulty; rolling fires onRoll and mutates nothing', () => {
    const { updateCharacter, onRoll } = renderCard({ corr: 7 });
    openGuide();
    gotoStep('Resistance');

    fireEvent.click(within(guideDialog()).getByTestId('guided-corruption-seed-resistance'));

    const roll = screen.getByRole('dialog', { name: 'Roll Dialog' });
    // Base target = Endurance off T total 40 (untrained characteristic-only).
    expect(within(roll).getByText('Base Target')).toBeInTheDocument();
    expect(within(roll).getAllByText('40').length).toBeGreaterThanOrEqual(1);
    // Difficulty defaults to Challenging (+0) (Core p.183).
    expect((within(roll).getByLabelText('Difficulty') as HTMLSelectElement).value).toBe('Challenging');

    resolveManualRoll(11);
    // The roll is recorded in history but the character is never mutated.
    expect(onRoll).toHaveBeenCalledTimes(1);
    expect(updateCharacter).not.toHaveBeenCalled();
  });
});

describe('Guided corruption — Step 3 mutation hand-off (AC-13)', () => {
  it('opens no RollDialog for the d100 and its hand-off button closes the guide', () => {
    renderCard({ corr: 7 });
    openGuide();
    gotoStep('Mutation');
    const dialog = guideDialog();

    // No RollDialog is seeded for the mutation d100.
    expect(screen.queryByRole('dialog', { name: 'Roll Dialog' })).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByTestId('guided-corruption-mutation-handoff'));
    expect(
      screen.queryByRole('dialog', { name: 'Guide me through corruption' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Roll Dialog' })).not.toBeInTheDocument();

    // The existing in-card Mutation Roller is still available for the hand-off.
    expect(screen.getByText('Roll Physical')).toBeInTheDocument();
    expect(screen.getByText('Roll Mental')).toBeInTheDocument();
  });
});

describe('Guided corruption — calculated-total tooltips (AC-14)', () => {
  it('the corruption-threshold Tooltip shows TB / WPB / Pure Soul lines', () => {
    renderCard({ corr: 7 });
    openGuide();
    gotoStep('Threshold');
    fireEvent.click(within(guideDialog()).getByLabelText('Corruption breakdown'));
    const tip = screen.getAllByRole('tooltip').at(-1)!;
    expect(tip).toHaveTextContent('TB 4');
    expect(tip).toHaveTextContent('WPB 3');
    expect(tip).toHaveTextContent('Pure Soul 0');
  });

  it('the mutation-limit and corruption-loss tooltips show their TB/WPB components', () => {
    renderCard({ corr: 7 });
    openGuide();
    gotoStep('Mutation');
    const dialog = guideDialog();

    fireEvent.click(within(dialog).getByLabelText('Physical mutation limit breakdown'));
    expect(screen.getAllByRole('tooltip').at(-1)!).toHaveTextContent('TB 4');

    fireEvent.click(within(dialog).getByLabelText('Mental mutation limit breakdown'));
    expect(screen.getAllByRole('tooltip').at(-1)!).toHaveTextContent('WPB 3');

    fireEvent.click(within(dialog).getByLabelText('Corruption lost on mutating breakdown'));
    expect(screen.getAllByRole('tooltip').at(-1)!).toHaveTextContent('WPB 3');
  });
});

describe('Guided corruption — no-auto invariants (AC-15)', () => {
  it('mount, Next/Back, open a seeded roll, and roll never mutate the character and never auto-advance', () => {
    const { updateCharacter, onRoll } = renderCard({ corr: 7 });
    openGuide();
    // Mount at Step 1, no mutation.
    expect(updateCharacter).not.toHaveBeenCalled();

    const heading = () => within(guideDialog()).getByRole('heading', { level: 2 });
    fireEvent.click(screen.getByTestId('guided-corruption-next'));
    expect(heading()).toHaveTextContent(/Step 2 of 3/);
    fireEvent.click(screen.getByTestId('guided-corruption-back'));
    expect(heading()).toHaveTextContent(/Step 1 of 3/);

    gotoStep('Resistance');
    fireEvent.click(within(guideDialog()).getByTestId('guided-corruption-seed-resistance'));
    resolveManualRoll(11);
    // Rolling records to history but never mutates the character, and the guide
    // does not auto-advance after the roll (it resumes on Step 2).
    expect(onRoll).toHaveBeenCalledTimes(1);
    expect(updateCharacter).not.toHaveBeenCalled();
    expect(within(guideDialog()).getByRole('heading', { level: 2 })).toHaveTextContent(/Step 2 of 3/);
  });
});

describe('Guided corruption — one aria-modal at a time (AC-18/19)', () => {
  it('while the seeded RollDialog is open exactly one aria-modal exists; the guide resumes after close', () => {
    renderCard({ corr: 7 });
    openGuide();
    gotoStep('Resistance');
    fireEvent.click(within(guideDialog()).getByTestId('guided-corruption-seed-resistance'));

    const modals = screen.getAllByRole('dialog').filter((d) => d.getAttribute('aria-modal') === 'true');
    expect(modals).toHaveLength(1);
    expect(modals[0]).toHaveAttribute('aria-label', 'Roll Dialog');
    // The guide yields while the dialog is open.
    expect(
      screen.queryByRole('dialog', { name: 'Guide me through corruption' }),
    ).not.toBeInTheDocument();

    resolveManualRoll(11);
    const resumed = screen.getAllByRole('dialog').filter((d) => d.getAttribute('aria-modal') === 'true');
    expect(resumed).toHaveLength(1);
    expect(resumed[0]).toHaveAttribute('aria-label', 'Guide me through corruption');
  });

  it('Esc closes the guide', () => {
    renderCard({ corr: 7 });
    openGuide();
    fireEvent.keyDown(guideDialog(), { key: 'Escape' });
    expect(
      screen.queryByRole('dialog', { name: 'Guide me through corruption' }),
    ).not.toBeInTheDocument();
  });
});
