import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CorruptionCard } from '../CorruptionCard';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';

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

describe('GuidedCorruptionPanel — opt-in default off (AC-2 / Finding 1)', () => {
  it('CorruptionCard renders exactly one trigger and no overlay by default', () => {
    renderCard();
    expect(screen.getAllByTestId('guided-corruption-trigger')).toHaveLength(1);
    expect(
      screen.queryByRole('dialog', { name: 'Guide me through corruption' }),
    ).not.toBeInTheDocument();
  });
});

describe('GuidedCorruptionPanel — open / step order (AC-3 / AC-10)', () => {
  it('opens at Step 1 Threshold', () => {
    renderCard();
    openGuide();
    const dialog = guideDialog();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByRole('heading', { level: 2 })).toHaveTextContent(
      /Step 1 of 3: Corruption threshold/,
    );
  });

  it('presents exactly, in order: Threshold -> Resistance -> Mutation', () => {
    renderCard();
    openGuide();
    const heading = () => within(guideDialog()).getByRole('heading', { level: 2 });
    expect(heading()).toHaveTextContent(/Step 1 of 3: Corruption threshold/);
    fireEvent.click(screen.getByTestId('guided-corruption-next'));
    expect(heading()).toHaveTextContent(/Step 2 of 3: Resist the corruption/);
    fireEvent.click(screen.getByTestId('guided-corruption-next'));
    expect(heading()).toHaveTextContent(/Step 3 of 3: Resolve the mutation/);
  });
});

describe('GuidedCorruptionPanel — Step 1 shows the threshold and cites Core p.183 (AC-11)', () => {
  it('shows corr / getCorruptionThreshold and cites Core p.183', () => {
    renderCard({ corr: 5 });
    openGuide();
    const dialog = guideDialog();
    // corr 5 / threshold 7 (TB 4 + WPB 3 + Pure Soul 0).
    expect(within(dialog).getByText('5 / 7')).toBeInTheDocument();
    expect(within(dialog).getAllByText(/Core p\.183/).length).toBeGreaterThanOrEqual(1);
    // The 'more than vs >=' note is present.
    expect(within(dialog).getAllByText(/MORE THAN/).length).toBeGreaterThanOrEqual(1);
  });
});
