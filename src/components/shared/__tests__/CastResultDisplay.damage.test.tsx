import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CastResultDisplay } from '../CastResultDisplay';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';
import type { CastingResult } from '../../../logic/spell-casting';

/**
 * Validates: Requirements 2.1, 2.2, 2.3
 *
 * 2.1 — Magic missile cast result shows damage breakdown with components
 * 2.2 — Breakdown format: "Modifier + SL(X) = Total"
 * 2.3 — Overcast bonus included: "Modifier + SL(X) + Overcast(Y) = Total"
 */

/** Build a character with WP set so WPB = 4 (i.e., WP total = 40) */
function makeTestCharacter(): Character {
  const base = structuredClone(BLANK_CHARACTER);
  return {
    ...base,
    chars: {
      ...base.chars,
      WP: { i: 40, a: 0, b: 0 },
      T: { i: 30, a: 0, b: 0 },
    },
  };
}

/** Build a minimal successful magic missile CastingResult */
function makeMagicMissileCastResult(overrides: Partial<CastingResult> = {}): CastingResult {
  return {
    rollResult: {
      roll: 25,
      targetNumber: 50,
      ones: 5,
      tens: 2,
      isDouble: false,
      isUnderTarget: true,
      passed: true,
      isCritical: false,
      isFumble: false,
      sl: 3,
    },
    spell: {
      name: 'Bolt',
      cn: '4',
      range: 'WP yards',
      target: '1',
      duration: 'Instant',
      effect: 'Magic missile Dmg +4',
      memorized: true,
    },
    cn: 4,
    slAchieved: 3,
    castSuccess: true,
    surplusSL: 0,
    overcastSlots: 0,
    overcastAllocation: null,
    isCriticalCast: false,
    isFumbledCast: false,
    triggerMinorMiscast: false,
    triggerMajorMiscast: false,
    isMagicMissile: true,
    hitLocation: 'Body',
    damage: 7, // 4 (modifier) + 3 (SL) = 7
    isFullyChannelled: false,
    isUndispellable: false,
    ...overrides,
  };
}

describe('CastResultDisplay damage breakdown', () => {
  it('renders breakdown string instead of plain number for magic missile results', () => {
    const character = makeTestCharacter();
    const castingResult = makeMagicMissileCastResult();

    render(
      <CastResultDisplay
        castingResult={castingResult}
        character={character}
        onClose={vi.fn()}
      />,
    );

    // Should show "4 + SL(3) = 7" breakdown instead of just "7"
    expect(screen.getByText(/4 \+ SL\(3\) = 7/)).toBeInTheDocument();
  });

  it('includes overcast bonus in breakdown when allocated', () => {
    const character = makeTestCharacter();
    // damage = 9 means: modifier(4) + SL(3) + overcast(2) = 9
    const castingResult = makeMagicMissileCastResult({
      damage: 9,
    });

    render(
      <CastResultDisplay
        castingResult={castingResult}
        character={character}
        onClose={vi.fn()}
      />,
    );

    // Should show "4 + SL(3) + Overcast(2) = 9"
    expect(screen.getByText(/4 \+ SL\(3\) \+ Overcast\(2\) = 9/)).toBeInTheDocument();
  });
});
