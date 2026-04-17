import { describe, it, expect } from 'vitest';
import { computeFinancialSummary } from '../../pages/EstatePage';
import type { Estate } from '../../../types/character';

/** Helper: build a minimal Estate object with sensible defaults */
function makeEstate(overrides: Partial<Estate> = {}): Estate {
  return {
    name: 'Test Estate',
    location: 'Altdorf',
    description: '',
    treasury: { gc: 0, ss: 0, d: 0 },
    monthlyIncome: { gc: 0, ss: 0, d: 0 },
    monthlyExpenses: { gc: 0, ss: 0, d: 0 },
    ledger: [],
    notes: [],
    holdings: [],
    ...overrides,
  };
}

describe('computeFinancialSummary', () => {
  it('returns estate-level values when there are no properties', () => {
    const estate = makeEstate({
      monthlyIncome: { gc: 10, ss: 5, d: 2 },
      monthlyExpenses: { gc: 3, ss: 1, d: 1 },
    });
    const result = computeFinancialSummary(estate);
    expect(result.totalIncome).toEqual({ gc: 10, ss: 5, d: 2 });
    expect(result.totalExpenses).toEqual({ gc: 3, ss: 1, d: 1 });
    expect(result.profit).toEqual({ gc: 7, ss: 4, d: 1 });
  });

  it('aggregates estate + multiple property income/expenses', () => {
    const estate = makeEstate({
      monthlyIncome: { gc: 5, ss: 0, d: 0 },
      monthlyExpenses: { gc: 2, ss: 0, d: 0 },
      properties: [
        { name: 'Inn', type: 'Inn', status: 'Active', location: '', income: '', expenses: '', monthlyIncome: { gc: 3, ss: 2, d: 1 }, monthlyExpenses: { gc: 1, ss: 1, d: 0 }, condition: 100, staff: 2, notes: '' },
        { name: 'Farm', type: 'Farm', status: 'Active', location: '', income: '', expenses: '', monthlyIncome: { gc: 0, ss: 4, d: 6 }, monthlyExpenses: { gc: 0, ss: 2, d: 3 }, condition: 80, staff: 1, notes: '' },
      ],
    });
    const result = computeFinancialSummary(estate);
    expect(result.totalIncome).toEqual({ gc: 8, ss: 6, d: 7 });
    expect(result.totalExpenses).toEqual({ gc: 3, ss: 3, d: 3 });
    expect(result.profit).toEqual({ gc: 5, ss: 3, d: 4 });
  });

  it('returns all zeros when estate and properties have zero values', () => {
    const estate = makeEstate({ properties: [] });
    const result = computeFinancialSummary(estate);
    expect(result.totalIncome).toEqual({ gc: 0, ss: 0, d: 0 });
    expect(result.totalExpenses).toEqual({ gc: 0, ss: 0, d: 0 });
    expect(result.profit).toEqual({ gc: 0, ss: 0, d: 0 });
  });

  it('computes negative profit when expenses exceed income', () => {
    const estate = makeEstate({
      monthlyIncome: { gc: 1, ss: 0, d: 0 },
      monthlyExpenses: { gc: 5, ss: 3, d: 2 },
    });
    const result = computeFinancialSummary(estate);
    expect(result.profit).toEqual({ gc: -4, ss: -3, d: -2 });
  });

  it('handles properties with undefined monthlyIncome/monthlyExpenses', () => {
    const estate = makeEstate({
      monthlyIncome: { gc: 2, ss: 1, d: 0 },
      monthlyExpenses: { gc: 1, ss: 0, d: 0 },
      properties: [
        { name: 'Ruin', type: 'Other', status: 'Destroyed', location: '', income: '', expenses: '', monthlyIncome: undefined as unknown as { d: number; ss: number; gc: number }, monthlyExpenses: undefined as unknown as { d: number; ss: number; gc: number }, condition: 0, staff: 0, notes: '' },
      ],
    });
    const result = computeFinancialSummary(estate);
    // Undefined property financials default to 0, so only estate-level values count
    expect(result.totalIncome).toEqual({ gc: 2, ss: 1, d: 0 });
    expect(result.totalExpenses).toEqual({ gc: 1, ss: 0, d: 0 });
    expect(result.profit).toEqual({ gc: 1, ss: 1, d: 0 });
  });

  it('handles undefined properties array', () => {
    const estate = makeEstate({
      monthlyIncome: { gc: 3, ss: 2, d: 1 },
      monthlyExpenses: { gc: 1, ss: 1, d: 1 },
    });
    delete (estate as unknown as Record<string, unknown>).properties;
    const result = computeFinancialSummary(estate);
    expect(result.totalIncome).toEqual({ gc: 3, ss: 2, d: 1 });
    expect(result.totalExpenses).toEqual({ gc: 1, ss: 1, d: 1 });
    expect(result.profit).toEqual({ gc: 2, ss: 1, d: 0 });
  });
});
