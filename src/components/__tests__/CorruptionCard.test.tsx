import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CorruptionCard } from '../shared/CorruptionCard';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character } from '../../types/character';

/** Create a test character with overrides. */
function makeChar(overrides: Partial<Character> = {}): Character {
  return { ...BLANK_CHARACTER, species: 'Human', ...overrides };
}

function renderCard(charOverrides: Partial<Character> = {}) {
  const character = makeChar(charOverrides);
  const update = vi.fn();
  const updateCharacter = vi.fn();
  render(<CorruptionCard character={character} update={update} updateCharacter={updateCharacter} />);
  return { character, update, updateCharacter };
}

// ─── 1. Renders corruption counter in "X / Y" format ────────────────────────

describe('CorruptionCard — corruption counter display', () => {
  it('displays corruption as "3 / 7" when corr=3, T=40, WP=30', () => {
    renderCard({
      corr: 3,
      chars: {
        ...BLANK_CHARACTER.chars,
        T: { i: 40, a: 0, b: 0 },
        WP: { i: 30, a: 0, b: 0 },
      },
    });
    expect(screen.getByText('3 / 7')).toBeInTheDocument();
  });
});

// ─── 2. Renders sin counter with increment/decrement buttons ─────────────────

describe('CorruptionCard — sin counter', () => {
  it('displays sin value', () => {
    renderCard({ sin: 2 });
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('has Decrease sin and Increase sin buttons', () => {
    renderCard({ sin: 2 });
    expect(screen.getByLabelText('Decrease sin')).toBeInTheDocument();
    expect(screen.getByLabelText('Increase sin')).toBeInTheDocument();
  });
});


// ─── 3. Shows "Corruption Test Required" when corr >= threshold ──────────────

describe('CorruptionCard — corruption test required notification', () => {
  it('shows notification when corr equals threshold (corr=7, threshold=7)', () => {
    renderCard({
      corr: 7,
      chars: {
        ...BLANK_CHARACTER.chars,
        T: { i: 40, a: 0, b: 0 },
        WP: { i: 30, a: 0, b: 0 },
      },
    });
    expect(screen.getByText(/Corruption Test Required/)).toBeInTheDocument();
  });
});

// ─── 4. Does NOT show "Corruption Test Required" when corr < threshold ───────

describe('CorruptionCard — no notification below threshold', () => {
  it('does not show notification when corr=3, threshold=7', () => {
    renderCard({
      corr: 3,
      chars: {
        ...BLANK_CHARACTER.chars,
        T: { i: 40, a: 0, b: 0 },
        WP: { i: 30, a: 0, b: 0 },
      },
    });
    expect(screen.queryByText(/Corruption Test Required/)).not.toBeInTheDocument();
  });
});

// ─── 5. Shows physical and mental mutation lists separately ──────────────────

describe('CorruptionCard — mutation lists', () => {
  it('shows Physical Mutations and Mental Mutations labels', () => {
    renderCard({
      mutations: [
        { id: 1, type: 'physical', name: 'Tentacle', effect: 'Gain tentacles' },
        { id: 2, type: 'mental', name: 'Hollow Heart', effect: '+10 WP, -10 Fel' },
      ],
    });
    expect(screen.getByText(/Physical Mutations/)).toBeInTheDocument();
    expect(screen.getByText(/Mental Mutations/)).toBeInTheDocument();
  });
});

// ─── 6. Shows mutation count/limit for each type ─────────────────────────────

describe('CorruptionCard — mutation count and limit', () => {
  it('shows "2 / 4" for physical and "1 / 3" for mental', () => {
    renderCard({
      chars: {
        ...BLANK_CHARACTER.chars,
        T: { i: 40, a: 0, b: 0 },
        WP: { i: 30, a: 0, b: 0 },
      },
      mutations: [
        { id: 1, type: 'physical', name: 'Tentacle', effect: 'Gain tentacles' },
        { id: 2, type: 'physical', name: 'Iron Skin', effect: '+2 AP' },
        { id: 3, type: 'mental', name: 'Hollow Heart', effect: '+10 WP' },
      ],
    });
    expect(screen.getByText(/2 \/ 4/)).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();
  });
});

// ─── 7. Shows danger indicator when mutations at limit ───────────────────────

describe('CorruptionCard — Lost to Chaos indicator', () => {
  it('shows danger text when physical mutations equal TB', () => {
    renderCard({
      chars: {
        ...BLANK_CHARACTER.chars,
        T: { i: 30, a: 0, b: 0 },
        WP: { i: 30, a: 0, b: 0 },
      },
      mutations: [
        { id: 1, type: 'physical', name: 'A', effect: 'a' },
        { id: 2, type: 'physical', name: 'B', effect: 'b' },
        { id: 3, type: 'physical', name: 'C', effect: 'c' },
      ],
    });
    expect(screen.getByText(/Lost to Chaos/)).toBeInTheDocument();
  });
});

// ─── 8. Roll buttons exist for physical and mental tables ────────────────────

describe('CorruptionCard — roll buttons', () => {
  it('has Roll Physical and Roll Mental buttons', () => {
    renderCard();
    expect(screen.getByText('Roll Physical')).toBeInTheDocument();
    expect(screen.getByText('Roll Mental')).toBeInTheDocument();
  });
});

// ─── 9. Species probability split is displayed ──────────────────────────────

describe('CorruptionCard — species probability split', () => {
  it('shows species name and physical range for Dwarf', () => {
    renderCard({ species: 'Dwarf' });
    expect(screen.getByText(/Dwarf/)).toBeInTheDocument();
    expect(screen.getByText(/Physical 1–5/)).toBeInTheDocument();
  });
});

// ─── 10. Wrath risk indicator shows correct values for current sin ───────────

describe('CorruptionCard — Wrath risk indicator', () => {
  it('shows wrath range and trigger values for sin=3', () => {
    renderCard({ sin: 3 });
    expect(screen.getByText(/1–3/)).toBeInTheDocument();
    expect(screen.getByText(/1, 2, 3/)).toBeInTheDocument();
  });
});

// ─── 11. Increment/decrement buttons update values correctly ─────────────────

describe('CorruptionCard — increment/decrement buttons', () => {
  it('clicking "Increase corruption" calls update with corr incremented', () => {
    const { update } = renderCard({ corr: 0 });
    fireEvent.click(screen.getByLabelText('Increase corruption'));
    expect(update).toHaveBeenCalledWith('corr', 1);
  });

  it('clicking "Decrease corruption" with corr=3 calls update with corr=2', () => {
    const { update } = renderCard({ corr: 3 });
    fireEvent.click(screen.getByLabelText('Decrease corruption'));
    expect(update).toHaveBeenCalledWith('corr', 2);
  });
});

// ─── 12. Corruption cannot go below 0 via decrement ─────────────────────────

describe('CorruptionCard — corruption floor at 0', () => {
  it('clicking "Decrease corruption" with corr=0 calls update with corr=0', () => {
    const { update } = renderCard({ corr: 0 });
    fireEvent.click(screen.getByLabelText('Decrease corruption'));
    expect(update).toHaveBeenCalledWith('corr', 0);
  });
});

// ─── 13. Sin cannot go below 0 via decrement ────────────────────────────────

describe('CorruptionCard — sin floor at 0', () => {
  it('clicking "Decrease sin" with sin=0 calls update with sin=0', () => {
    const { update } = renderCard({ sin: 0 });
    fireEvent.click(screen.getByLabelText('Decrease sin'));
    expect(update).toHaveBeenCalledWith('sin', 0);
  });
});
