import type { Estate, Hireling } from '../../types/character';
import { computeHirelingUpkeep } from '../../logic/hirelings';

interface CurrencyAmount {
  gc: number;
  ss: number;
  d: number;
}

interface FinancialSummary {
  totalIncome: CurrencyAmount;
  totalExpenses: CurrencyAmount;
  profit: CurrencyAmount;
}

export function computeFinancialSummary(estate: Estate, hirelings: Hireling[] = []): FinancialSummary {
  const props = estate.properties || [];
  const hirelingUpkeep = computeHirelingUpkeep(hirelings);
  const totalIncome = {
    gc: (estate.monthlyIncome.gc || 0) + props.reduce((s, p) => s + (p.monthlyIncome?.gc || 0), 0),
    ss: (estate.monthlyIncome.ss || 0) + props.reduce((s, p) => s + (p.monthlyIncome?.ss || 0), 0),
    d: (estate.monthlyIncome.d || 0) + props.reduce((s, p) => s + (p.monthlyIncome?.d || 0), 0),
  };
  const totalExpenses = {
    gc: (estate.monthlyExpenses.gc || 0) + props.reduce((s, p) => s + (p.monthlyExpenses?.gc || 0), 0) + hirelingUpkeep.gc,
    ss: (estate.monthlyExpenses.ss || 0) + props.reduce((s, p) => s + (p.monthlyExpenses?.ss || 0), 0) + hirelingUpkeep.ss,
    d: (estate.monthlyExpenses.d || 0) + props.reduce((s, p) => s + (p.monthlyExpenses?.d || 0), 0) + hirelingUpkeep.d,
  };
  const profit = {
    gc: totalIncome.gc - totalExpenses.gc,
    ss: totalIncome.ss - totalExpenses.ss,
    d: totalIncome.d - totalExpenses.d,
  };
  return { totalIncome, totalExpenses, profit };
}
