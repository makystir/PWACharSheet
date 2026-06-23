import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computeFinancialSummary } from '../../components/pages/EstatePage';
import { computeHirelingUpkeep } from '../hirelings';
import type { Estate, Holding, Hireling } from '../../types/character';

// ─── Generators ──────────────────────────────────────────────────────────────

const currencyArb = fc.record({
  gc: fc.nat({ max: 999 }),
  ss: fc.nat({ max: 999 }),
  d: fc.nat({ max: 999 }),
});

const holdingArb: fc.Arbitrary<Holding> = fc.record({
  name: fc.string(),
  type: fc.string(),
  status: fc.string(),
  location: fc.string(),
  income: fc.string(),
  expenses: fc.string(),
  monthlyIncome: currencyArb,
  monthlyExpenses: currencyArb,
  condition: fc.nat({ max: 100 }),
  staff: fc.nat({ max: 50 }),
  notes: fc.string(),
});

const estateArb: fc.Arbitrary<Estate> = fc.record({
  name: fc.string(),
  location: fc.string(),
  description: fc.string(),
  treasury: currencyArb,
  monthlyIncome: currencyArb,
  monthlyExpenses: currencyArb,
  ledger: fc.constant([]),
  notes: fc.array(fc.string(), { maxLength: 3 }),
  holdings: fc.array(fc.string(), { maxLength: 3 }),
  properties: fc.array(holdingArb, { maxLength: 5 }),
});

const hirelingArb: fc.Arbitrary<Hireling> = fc.record({
  id: fc.nat(),
  name: fc.string(),
  role: fc.string(),
  status: fc.string(),
  M: fc.nat({ max: 99 }),
  WS: fc.nat({ max: 99 }),
  BS: fc.nat({ max: 99 }),
  S: fc.nat({ max: 99 }),
  T: fc.nat({ max: 99 }),
  I: fc.nat({ max: 99 }),
  Ag: fc.nat({ max: 99 }),
  Dex: fc.nat({ max: 99 }),
  Int: fc.nat({ max: 99 }),
  WP: fc.nat({ max: 99 }),
  Fel: fc.nat({ max: 99 }),
  W: fc.nat({ max: 99 }),
  wCur: fc.nat({ max: 99 }),
  skills: fc.string(),
  talents: fc.string(),
  traits: fc.string(),
  trappings: fc.string(),
  template: fc.string(),
  physicalQuirk: fc.string(),
  workEthic: fc.string(),
  personalityQuirk: fc.string(),
  upkeep: currencyArb,
  conditions: fc.array(fc.record({ name: fc.string(), level: fc.nat({ max: 5 }) }), { maxLength: 3 }),
  notes: fc.string(),
});

// ─── Property 8: Treasury deduction includes hireling upkeep ─────────────────
// Feature: hirelings, Property 8: Treasury deduction includes hireling upkeep
// **Validates: Requirements 5.3**

describe('Feature: hirelings, Property 8: Treasury deduction includes hireling upkeep', () => {
  /**
   * **Validates: Requirements 5.3**
   *
   * For any estate + hirelings, computeFinancialSummary returns totalExpenses
   * that include the hireling upkeep: totalExpenses = estateExpenses + propertyExpenses + hirelingUpkeep
   */
  it('totalExpenses equals estate monthly expenses + property expenses + hireling upkeep', () => {
    fc.assert(
      fc.property(
        estateArb,
        fc.array(hirelingArb, { maxLength: 10 }),
        (estate, hirelings) => {
          const summary = computeFinancialSummary(estate, hirelings);
          const hirelingUpkeep = computeHirelingUpkeep(hirelings);

          const props = estate.properties || [];
          const expectedExpensesGc =
            (estate.monthlyExpenses.gc || 0) +
            props.reduce((s, p) => s + (p.monthlyExpenses?.gc || 0), 0) +
            hirelingUpkeep.gc;
          const expectedExpensesSs =
            (estate.monthlyExpenses.ss || 0) +
            props.reduce((s, p) => s + (p.monthlyExpenses?.ss || 0), 0) +
            hirelingUpkeep.ss;
          const expectedExpensesD =
            (estate.monthlyExpenses.d || 0) +
            props.reduce((s, p) => s + (p.monthlyExpenses?.d || 0), 0) +
            hirelingUpkeep.d;

          expect(summary.totalExpenses.gc).toBe(expectedExpensesGc);
          expect(summary.totalExpenses.ss).toBe(expectedExpensesSs);
          expect(summary.totalExpenses.d).toBe(expectedExpensesD);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('totalExpenses includes hireling upkeep (totalExpenses >= hirelingUpkeep per currency)', () => {
    fc.assert(
      fc.property(
        estateArb,
        fc.array(hirelingArb, { minLength: 1, maxLength: 10 }),
        (estate, hirelings) => {
          const summary = computeFinancialSummary(estate, hirelings);
          const hirelingUpkeep = computeHirelingUpkeep(hirelings);

          expect(summary.totalExpenses.gc).toBeGreaterThanOrEqual(hirelingUpkeep.gc);
          expect(summary.totalExpenses.ss).toBeGreaterThanOrEqual(hirelingUpkeep.ss);
          expect(summary.totalExpenses.d).toBeGreaterThanOrEqual(hirelingUpkeep.d);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('profit equals totalIncome minus totalExpenses', () => {
    fc.assert(
      fc.property(
        estateArb,
        fc.array(hirelingArb, { maxLength: 10 }),
        (estate, hirelings) => {
          const summary = computeFinancialSummary(estate, hirelings);

          expect(summary.profit.gc).toBe(summary.totalIncome.gc - summary.totalExpenses.gc);
          expect(summary.profit.ss).toBe(summary.totalIncome.ss - summary.totalExpenses.ss);
          expect(summary.profit.d).toBe(summary.totalIncome.d - summary.totalExpenses.d);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('with no hirelings, totalExpenses equals estate + property expenses only', () => {
    fc.assert(
      fc.property(estateArb, (estate) => {
        const summary = computeFinancialSummary(estate, []);

        const props = estate.properties || [];
        const expectedGc =
          (estate.monthlyExpenses.gc || 0) +
          props.reduce((s, p) => s + (p.monthlyExpenses?.gc || 0), 0);
        const expectedSs =
          (estate.monthlyExpenses.ss || 0) +
          props.reduce((s, p) => s + (p.monthlyExpenses?.ss || 0), 0);
        const expectedD =
          (estate.monthlyExpenses.d || 0) +
          props.reduce((s, p) => s + (p.monthlyExpenses?.d || 0), 0);

        expect(summary.totalExpenses.gc).toBe(expectedGc);
        expect(summary.totalExpenses.ss).toBe(expectedSs);
        expect(summary.totalExpenses.d).toBe(expectedD);
      }),
      { numRuns: 100 }
    );
  });
});
