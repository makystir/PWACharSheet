import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FortuneResolvePanel } from '../shared/FortuneResolvePanel';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character } from '../../types/character';

/** Create a test character with specific fate/fortune/resilience/resolve values. */
function makeChar(overrides: Partial<Character> = {}): Character {
  return { ...BLANK_CHARACTER, fate: 3, fortune: 2, resilience: 2, resolve: 1, ...overrides };
}

function renderPanel(charOverrides: Partial<Character> = {}) {
  const character = makeChar(charOverrides);
  const update = vi.fn();
  const updateCharacter = vi.fn();
  render(
    <FortuneResolvePanel character={character} update={update} updateCharacter={updateCharacter} />,
  );
  return { character, update, updateCharacter };
}

// ─── 8.1 Renders fate/fortune and resilience/resolve values correctly ────────

describe('FortuneResolvePanel — renders values correctly', () => {
  it('displays all four labels', () => {
    renderPanel({ fate: 5, fortune: 4, resilience: 3, resolve: 2 });
    expect(screen.getByText('Fate')).toBeInTheDocument();
    expect(screen.getByText('Fortune')).toBeInTheDocument();
    expect(screen.getByText('Resilience')).toBeInTheDocument();
    expect(screen.getByText('Resolve')).toBeInTheDocument();
  });

  it('displays all four numeric values (using unique values to avoid ambiguity)', () => {
    renderPanel({ fate: 5, fortune: 4, resilience: 3, resolve: 2 });
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders section headers for Fate/Fortune and Resilience/Resolve', () => {
    renderPanel();
    expect(screen.getByText('Fate / Fortune')).toBeInTheDocument();
    expect(screen.getByText('Resilience / Resolve')).toBeInTheDocument();
  });
});


// ─── 8.2 Fortune spend button click decrements displayed fortune value ───────

describe('FortuneResolvePanel — Fortune spend buttons', () => {
  it('clicking "Reroll" calls updateCharacter with a mutator that decrements fortune', () => {
    const { character, updateCharacter } = renderPanel({ fate: 3, fortune: 2 });
    fireEvent.click(screen.getByText('Reroll'));
    expect(updateCharacter).toHaveBeenCalledTimes(1);

    const mutator = updateCharacter.mock.calls[0][0];
    const updated = mutator(character);
    expect(updated.fortune).toBe(1);
  });

  it('clicking "Add +1 SL" calls updateCharacter with a mutator that decrements fortune', () => {
    const { character, updateCharacter } = renderPanel({ fate: 3, fortune: 3 });
    fireEvent.click(screen.getByText('Add +1 SL'));
    expect(updateCharacter).toHaveBeenCalledTimes(1);

    const mutator = updateCharacter.mock.calls[0][0];
    const updated = mutator(character);
    expect(updated.fortune).toBe(2);
  });

  it('clicking "Special Ability" (fortune) calls updateCharacter with a mutator that decrements fortune', () => {
    const { character, updateCharacter } = renderPanel({ fate: 3, fortune: 1 });
    // There are two "Special Ability" buttons (fortune + resolve), grab the first one
    const specialButtons = screen.getAllByText('Special Ability');
    fireEvent.click(specialButtons[0]);
    expect(updateCharacter).toHaveBeenCalledTimes(1);

    const mutator = updateCharacter.mock.calls[0][0];
    const updated = mutator(character);
    expect(updated.fortune).toBe(0);
  });
});

// ─── 8.3 Resolve spend button click decrements displayed resolve value ───────

describe('FortuneResolvePanel — Resolve spend buttons', () => {
  it('clicking "Immunity to Psychology" calls updateCharacter with a mutator that decrements resolve', () => {
    const { character, updateCharacter } = renderPanel({ resilience: 2, resolve: 2 });
    fireEvent.click(screen.getByText('Immunity to Psychology'));
    expect(updateCharacter).toHaveBeenCalledTimes(1);

    const mutator = updateCharacter.mock.calls[0][0];
    const updated = mutator(character);
    expect(updated.resolve).toBe(1);
  });

  it('clicking "Remove Conditions" calls updateCharacter with a mutator that decrements resolve', () => {
    const { character, updateCharacter } = renderPanel({ resilience: 2, resolve: 1 });
    fireEvent.click(screen.getByText('Remove Conditions'));
    expect(updateCharacter).toHaveBeenCalledTimes(1);

    const mutator = updateCharacter.mock.calls[0][0];
    const updated = mutator(character);
    expect(updated.resolve).toBe(0);
  });

  it('clicking "Special Ability" (resolve) calls updateCharacter with a mutator that decrements resolve', () => {
    const { character, updateCharacter } = renderPanel({ resilience: 3, resolve: 3 });
    // Second "Special Ability" button is the resolve one
    const specialButtons = screen.getAllByText('Special Ability');
    fireEvent.click(specialButtons[1]);
    expect(updateCharacter).toHaveBeenCalledTimes(1);

    const mutator = updateCharacter.mock.calls[0][0];
    const updated = mutator(character);
    expect(updated.resolve).toBe(2);
  });
});


// ─── 8.4 Burn Fate button shows ConfirmDialog and on confirm decrements fate ─

describe('FortuneResolvePanel — Burn Fate', () => {
  it('clicking "Burn Fate" opens a confirmation dialog', () => {
    renderPanel({ fate: 3, fortune: 2 });
    fireEvent.click(screen.getByText('Burn Fate'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/permanently burn 1 fate point/i)).toBeInTheDocument();
  });

  it('confirming the burn calls updateCharacter with a mutator that decrements fate and clamps fortune', () => {
    const { character, updateCharacter } = renderPanel({ fate: 3, fortune: 3 });
    fireEvent.click(screen.getByText('Burn Fate'));
    fireEvent.click(screen.getByText('Burn'));
    expect(updateCharacter).toHaveBeenCalledTimes(1);

    const mutator = updateCharacter.mock.calls[0][0];
    const updated = mutator(character);
    expect(updated.fate).toBe(2);
    expect(updated.fortune).toBe(2); // clamped from 3 to new fate (2)
  });

  it('confirming the burn when fortune is already below new fate keeps fortune unchanged', () => {
    const { character, updateCharacter } = renderPanel({ fate: 3, fortune: 1 });
    fireEvent.click(screen.getByText('Burn Fate'));
    fireEvent.click(screen.getByText('Burn'));

    const mutator = updateCharacter.mock.calls[0][0];
    const updated = mutator(character);
    expect(updated.fate).toBe(2);
    expect(updated.fortune).toBe(1); // already below new fate, unchanged
  });

  it('cancelling the dialog does not call updateCharacter', () => {
    const { updateCharacter } = renderPanel({ fate: 3, fortune: 2 });
    fireEvent.click(screen.getByText('Burn Fate'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(updateCharacter).not.toHaveBeenCalled();
  });
});

// ─── 8.5 Burn Resilience button shows ConfirmDialog and on confirm decrements resilience ─

describe('FortuneResolvePanel — Burn Resilience', () => {
  it('clicking "Burn Resilience" opens a confirmation dialog', () => {
    renderPanel({ resilience: 2, resolve: 1 });
    fireEvent.click(screen.getByText('Burn Resilience'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/permanently burn 1 resilience point/i)).toBeInTheDocument();
  });

  it('confirming the burn calls updateCharacter with a mutator that decrements resilience and clamps resolve', () => {
    const { character, updateCharacter } = renderPanel({ resilience: 2, resolve: 2 });
    fireEvent.click(screen.getByText('Burn Resilience'));
    fireEvent.click(screen.getByText('Burn'));
    expect(updateCharacter).toHaveBeenCalledTimes(1);

    const mutator = updateCharacter.mock.calls[0][0];
    const updated = mutator(character);
    expect(updated.resilience).toBe(1);
    expect(updated.resolve).toBe(1); // clamped from 2 to new resilience (1)
  });

  it('confirming the burn when resolve is already below new resilience keeps resolve unchanged', () => {
    const { character, updateCharacter } = renderPanel({ resilience: 3, resolve: 1 });
    fireEvent.click(screen.getByText('Burn Resilience'));
    fireEvent.click(screen.getByText('Burn'));

    const mutator = updateCharacter.mock.calls[0][0];
    const updated = mutator(character);
    expect(updated.resilience).toBe(2);
    expect(updated.resolve).toBe(1); // already below new resilience, unchanged
  });

  it('cancelling the dialog does not call updateCharacter', () => {
    const { updateCharacter } = renderPanel({ resilience: 2, resolve: 1 });
    fireEvent.click(screen.getByText('Burn Resilience'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(updateCharacter).not.toHaveBeenCalled();
  });
});


// ─── 8.6 Session Reset button resets fortune and resolve to base values ──────

describe('FortuneResolvePanel — Session Reset', () => {
  it('clicking "Session Reset" opens a confirmation dialog', () => {
    renderPanel({ fate: 3, fortune: 1, resilience: 2, resolve: 0 });
    fireEvent.click(screen.getByText('Session Reset'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/reset fortune and resolve/i)).toBeInTheDocument();
  });

  it('confirming the reset calls updateCharacter with a mutator that sets fortune=fate and resolve=resilience', () => {
    const { character, updateCharacter } = renderPanel({ fate: 3, fortune: 1, resilience: 2, resolve: 0 });
    fireEvent.click(screen.getByText('Session Reset'));
    fireEvent.click(screen.getByText('Reset'));
    expect(updateCharacter).toHaveBeenCalledTimes(1);

    const mutator = updateCharacter.mock.calls[0][0];
    const updated = mutator(character);
    expect(updated.fortune).toBe(3); // reset to fate
    expect(updated.resolve).toBe(2); // reset to resilience
  });

  it('session reset when pools are already at base values keeps them the same', () => {
    const { character, updateCharacter } = renderPanel({ fate: 2, fortune: 2, resilience: 1, resolve: 1 });
    fireEvent.click(screen.getByText('Session Reset'));
    fireEvent.click(screen.getByText('Reset'));

    const mutator = updateCharacter.mock.calls[0][0];
    const updated = mutator(character);
    expect(updated.fortune).toBe(2);
    expect(updated.resolve).toBe(1);
  });

  it('cancelling the dialog does not call updateCharacter', () => {
    const { updateCharacter } = renderPanel({ fate: 3, fortune: 1, resilience: 2, resolve: 0 });
    fireEvent.click(screen.getByText('Session Reset'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(updateCharacter).not.toHaveBeenCalled();
  });
});

// ─── 8.7 Spend buttons show "no points remaining" message when pool is 0 ────

describe('FortuneResolvePanel — no points remaining messages', () => {
  it('shows "No Fortune points remaining" when fortune is 0', () => {
    renderPanel({ fate: 3, fortune: 0 });
    expect(screen.getByText('No Fortune points remaining')).toBeInTheDocument();
  });

  it('does not show "No Fortune points remaining" when fortune > 0', () => {
    renderPanel({ fate: 3, fortune: 1 });
    expect(screen.queryByText('No Fortune points remaining')).not.toBeInTheDocument();
  });

  it('shows "No Resolve points remaining" when resolve is 0', () => {
    renderPanel({ resilience: 2, resolve: 0 });
    expect(screen.getByText('No Resolve points remaining')).toBeInTheDocument();
  });

  it('does not show "No Resolve points remaining" when resolve > 0', () => {
    renderPanel({ resilience: 2, resolve: 1 });
    expect(screen.queryByText('No Resolve points remaining')).not.toBeInTheDocument();
  });

  it('fortune spend buttons are disabled when fortune is 0', () => {
    renderPanel({ fate: 3, fortune: 0 });
    expect(screen.getByText('Reroll')).toBeDisabled();
    expect(screen.getByText('Add +1 SL')).toBeDisabled();
    const specialButtons = screen.getAllByText('Special Ability');
    expect(specialButtons[0]).toBeDisabled();
  });

  it('resolve spend buttons are disabled when resolve is 0', () => {
    renderPanel({ resilience: 2, resolve: 0 });
    expect(screen.getByText('Immunity to Psychology')).toBeDisabled();
    expect(screen.getByText('Remove Conditions')).toBeDisabled();
    const specialButtons = screen.getAllByText('Special Ability');
    expect(specialButtons[1]).toBeDisabled();
  });

  it('fortune spend buttons do not call updateCharacter when fortune is 0', () => {
    const { updateCharacter } = renderPanel({ fate: 3, fortune: 0 });
    fireEvent.click(screen.getByText('Reroll'));
    expect(updateCharacter).not.toHaveBeenCalled();
  });

  it('resolve spend buttons do not call updateCharacter when resolve is 0', () => {
    const { updateCharacter } = renderPanel({ resilience: 2, resolve: 0 });
    fireEvent.click(screen.getByText('Immunity to Psychology'));
    expect(updateCharacter).not.toHaveBeenCalled();
  });
});
