import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CastResultDisplay } from '../CastResultDisplay';
import { CriticalChoiceButtons } from '../castControls/CriticalChoiceButtons';
import { MiscastRollButtons } from '../castControls/MiscastRollButtons';
import { MiscastEscalation } from '../castControls/MiscastEscalation';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';
import type { CastingResult, MiscastResult } from '../../../logic/spell-casting';

/**
 * Design-loop MEDIUM-1 (MANDATORY no-drift test).
 *
 * The cast-control clusters are extracted into shared presentational components
 * so BOTH hosts (CastResultDisplay today, the guided-cast overlay later) wire
 * the SAME handlers. These tests prove the extracted controls reach the same
 * callbacks whether rendered standalone or inside CastResultDisplay — a single
 * wiring with no handler drift between surfaces.
 */

function makeChar(): Character {
  const base = structuredClone(BLANK_CHARACTER);
  return {
    ...base,
    chars: { ...base.chars, WP: { i: 40, a: 0, b: 0 }, T: { i: 30, a: 0, b: 0 } },
    // Arcane Magic (Fire) → getCharacterLore returns "Fire" (has an Arcane Marks table)
    talents: [{ n: 'Arcane Magic (Fire)', lvl: 1, desc: '' }],
  };
}

const BASE_SPELL = {
  name: 'Bolt',
  cn: '4',
  range: 'WP yards',
  target: '1',
  duration: 'Instant',
  effect: 'Magic missile Dmg +4',
  memorized: true,
};

function makeCastResult(overrides: Partial<CastingResult> = {}): CastingResult {
  return {
    rollResult: {
      roll: 1,
      targetNumber: 50,
      baseTarget: 50,
      difficulty: 'Average',
      passed: true,
      isCritical: true,
      isFumble: false,
      isAutoSuccess: false,
      isAutoFailure: false,
      outcome: 'Success',
      skillOrCharName: 'Language (Magick)',
      timestamp: 0,
      sl: 4,
    },
    spell: BASE_SPELL,
    cn: 4,
    slAchieved: 4,
    castSuccess: true,
    surplusSL: 0,
    overcastSlots: 0,
    overcastAllocation: null,
    isCriticalCast: true,
    isFumbledCast: false,
    triggerMinorMiscast: false,
    triggerMajorMiscast: false,
    isMagicMissile: false,
    hitLocation: 'Body',
    damage: null,
    isFullyChannelled: false,
    isUndispellable: false,
    ...overrides,
  };
}

const markedByMagic: MiscastResult = {
  roll: 88,
  entry: {
    min: 86,
    max: 90,
    name: 'Marked by Magic',
    effect: 'You gain an Arcane Mark.',
    special: 'marked_by_magic',
  },
};

const cascadingChaos: MiscastResult = {
  roll: 99,
  entry: {
    min: 96,
    max: 100,
    name: 'Cascading Chaos',
    effect: 'Roll on the Major Miscast Table.',
    special: 'cascading_chaos',
  },
};

// ─── CriticalChoiceButtons: same handler from both hosts ───

describe('no-drift: CriticalChoiceButtons', () => {
  it('standalone invokes onCriticalChoice with the chosen value', () => {
    const onCriticalChoice = vi.fn();
    render(<CriticalChoiceButtons onCriticalChoice={onCriticalChoice} />);

    fireEvent.click(screen.getByText('Total Power'));
    expect(onCriticalChoice).toHaveBeenCalledWith('total_power');
  });

  it('inside CastResultDisplay invokes the SAME onCriticalChoice', () => {
    const onCriticalChoice = vi.fn();
    render(
      <CastResultDisplay
        castingResult={makeCastResult({ isCriticalCast: true })}
        character={makeChar()}
        onCriticalChoice={onCriticalChoice}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Total Power'));
    expect(onCriticalChoice).toHaveBeenCalledWith('total_power');
  });
});

// ─── MiscastRollButtons: fumble → onMiscastRoll('minor') from both hosts ───

describe('no-drift: MiscastRollButtons', () => {
  it('standalone fumble invokes onMiscastRoll("minor")', () => {
    const onMiscastRoll = vi.fn();
    render(
      <MiscastRollButtons
        isFumbledCast
        triggerMinorMiscast={false}
        onMiscastRoll={onMiscastRoll}
      />,
    );

    fireEvent.click(screen.getByText('Roll Minor Miscast'));
    expect(onMiscastRoll).toHaveBeenCalledWith('minor');
  });

  it('inside CastResultDisplay a fumbled cast invokes the SAME onMiscastRoll', () => {
    const onMiscastRoll = vi.fn();
    render(
      <CastResultDisplay
        castingResult={makeCastResult({ isCriticalCast: false, isFumbledCast: true })}
        character={makeChar()}
        onMiscastRoll={onMiscastRoll}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Roll Minor Miscast'));
    expect(onMiscastRoll).toHaveBeenCalledWith('minor');
  });
});

// ─── MiscastEscalation: escalation + arcane mark from both hosts ───

describe('no-drift: MiscastEscalation', () => {
  it('standalone cascading_chaos invokes onMiscastRoll("major")', () => {
    const onMiscastRoll = vi.fn();
    render(
      <MiscastEscalation
        miscastResult={cascadingChaos}
        character={makeChar()}
        onMiscastRoll={onMiscastRoll}
        onArcaneMarkAcquired={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Roll Major Miscast'));
    expect(onMiscastRoll).toHaveBeenCalledWith('major');
  });

  it('standalone marked_by_magic rolls a mark then invokes onArcaneMarkAcquired', () => {
    const onArcaneMarkAcquired = vi.fn();
    render(
      <MiscastEscalation
        miscastResult={markedByMagic}
        character={makeChar()}
        onMiscastRoll={vi.fn()}
        onArcaneMarkAcquired={onArcaneMarkAcquired}
      />,
    );

    fireEvent.click(screen.getByText(/Roll Arcane Mark \(Fire\)/));
    fireEvent.click(screen.getByText('Store Mark on Character'));
    expect(onArcaneMarkAcquired).toHaveBeenCalledTimes(1);
    expect(typeof onArcaneMarkAcquired.mock.calls[0][0]).toBe('string');
  });

  it('inside CastResultDisplay marked_by_magic reaches the SAME onArcaneMarkAcquired', () => {
    const onArcaneMarkAcquired = vi.fn();
    render(
      <CastResultDisplay
        castingResult={makeCastResult({ isCriticalCast: false })}
        character={makeChar()}
        miscastResult={markedByMagic}
        onArcaneMarkAcquired={onArcaneMarkAcquired}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/Roll Arcane Mark \(Fire\)/));
    fireEvent.click(screen.getByText('Store Mark on Character'));
    expect(onArcaneMarkAcquired).toHaveBeenCalledTimes(1);
    expect(typeof onArcaneMarkAcquired.mock.calls[0][0]).toBe('string');
  });
});

// ─── onOvercastResolved capture seam (FEAT-002) ───

describe('CastResultDisplay overcast capture seam', () => {
  const overcastResult = makeCastResult({
    isCriticalCast: false,
    isMagicMissile: true,
    overcastSlots: 2,
    damage: 7,
  });

  it('renders the overcast section with only onOvercastResolved and routes onAllocate to it', () => {
    const onOvercastResolved = vi.fn();
    render(
      <CastResultDisplay
        castingResult={overcastResult}
        character={makeChar()}
        onOvercastResolved={onOvercastResolved}
        onClose={vi.fn()}
      />,
    );

    const confirm = screen.getByText('Confirm');
    fireEvent.click(confirm);
    expect(onOvercastResolved).toHaveBeenCalledTimes(1);
  });

  it('does not render the overcast section when neither overcast callback is supplied', () => {
    render(
      <CastResultDisplay
        castingResult={overcastResult}
        character={makeChar()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
  });

  it('routes onAllocate to onOvercastResolved when both overcast callbacks are present', () => {
    const onOvercastResolved = vi.fn();
    const onOvercastAllocated = vi.fn();
    render(
      <CastResultDisplay
        castingResult={overcastResult}
        character={makeChar()}
        onOvercastResolved={onOvercastResolved}
        onOvercastAllocated={onOvercastAllocated}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Confirm'));
    expect(onOvercastResolved).toHaveBeenCalledTimes(1);
    expect(onOvercastAllocated).not.toHaveBeenCalled();
  });
});
