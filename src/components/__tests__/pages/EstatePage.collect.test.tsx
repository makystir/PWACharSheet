import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EstatePage } from '../../pages/EstatePage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints, Estate } from '../../../types/character';

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

function makeCharacter(estateOverrides: Partial<Estate> = {}): Character {
  return structuredClone({
    ...BLANK_CHARACTER,
    estate: {
      ...BLANK_CHARACTER.estate,
      ...estateOverrides,
    },
  });
}

function renderEstatePage(char: Character) {
  let captured = char;
  const updateCharacter = vi.fn((mutator: (c: Character) => Character) => {
    captured = mutator(structuredClone(captured));
  });

  const result = render(
    <EstatePage
      character={char}
      update={vi.fn()}
      updateCharacter={updateCharacter}
      totalWounds={10}
      armourPoints={defaultAP}
      maxEncumbrance={5}
      coinWeight={0}
    />
  );

  return { updateCharacter, getCaptured: () => captured, ...result };
}

describe('EstatePage collect button logic', () => {
  // Validates: Requirements 5.4, 5.5

  it('collect with positive net income increases treasury', () => {
    const char = makeCharacter({
      treasury: { gc: 0, ss: 0, d: 0 },
      monthlyIncome: { gc: 10, ss: 5, d: 3 },
      monthlyExpenses: { gc: 2, ss: 1, d: 1 },
    });

    const { updateCharacter, getCaptured } = renderEstatePage(char);

    fireEvent.click(screen.getByText('Collect Monthly Income & Pay Expenses'));

    expect(updateCharacter).toHaveBeenCalledTimes(1);
    const updated = getCaptured();
    expect(updated.estate.treasury).toEqual({ gc: 8, ss: 4, d: 2 });
  });

  it('collect with negative net income decreases treasury', () => {
    const char = makeCharacter({
      treasury: { gc: 20, ss: 10, d: 5 },
      monthlyIncome: { gc: 1, ss: 0, d: 0 },
      monthlyExpenses: { gc: 5, ss: 3, d: 2 },
    });

    const { updateCharacter, getCaptured } = renderEstatePage(char);

    fireEvent.click(screen.getByText('Collect Monthly Income & Pay Expenses'));

    expect(updateCharacter).toHaveBeenCalledTimes(1);
    const updated = getCaptured();
    // profit: gc: 1-5=-4, ss: 0-3=-3, d: 0-2=-2
    // treasury: gc: 20+(-4)=16, ss: 10+(-3)=7, d: 5+(-2)=3
    expect(updated.estate.treasury).toEqual({ gc: 16, ss: 7, d: 3 });
  });

  it('collect with zero net leaves treasury unchanged', () => {
    const char = makeCharacter({
      treasury: { gc: 5, ss: 3, d: 1 },
      monthlyIncome: { gc: 4, ss: 2, d: 1 },
      monthlyExpenses: { gc: 4, ss: 2, d: 1 },
    });

    const { updateCharacter, getCaptured } = renderEstatePage(char);

    fireEvent.click(screen.getByText('Collect Monthly Income & Pay Expenses'));

    expect(updateCharacter).toHaveBeenCalledTimes(1);
    const updated = getCaptured();
    expect(updated.estate.treasury).toEqual({ gc: 5, ss: 3, d: 1 });
  });

  it('collect adds to existing treasury values (does not replace)', () => {
    const char = makeCharacter({
      treasury: { gc: 100, ss: 50, d: 25 },
      monthlyIncome: { gc: 3, ss: 2, d: 1 },
      monthlyExpenses: { gc: 1, ss: 1, d: 0 },
    });

    const { updateCharacter, getCaptured } = renderEstatePage(char);

    fireEvent.click(screen.getByText('Collect Monthly Income & Pay Expenses'));

    expect(updateCharacter).toHaveBeenCalledTimes(1);
    const updated = getCaptured();
    // profit: gc: 2, ss: 1, d: 1
    // treasury: gc: 100+2=102, ss: 50+1=51, d: 25+1=26
    expect(updated.estate.treasury).toEqual({ gc: 102, ss: 51, d: 26 });
  });
});
