import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterPage } from '../CharacterPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints } from '../../../types/character';
import { calculateCoinWeight } from '../../../logic/calculators';
import { transferFunds, parseCurrencyInput, type CurrencyDelta } from '../../../logic/currency';

/**
 * Render tests for the Deposit_Control wired into CharacterPage's Wealth section
 * (wealth-treasury-transfer spec, Task 9). Covers presence, the atomic
 * single-mutation deposit (wealth ↓, treasury ↑, +1 income ledger entry, +1
 * wealth event), the over-amount block (no change to any of the four
 * artefacts), the per-denomination preview + breakdown tooltip, and the derived
 * coin-encumbrance recompute.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.3, 3.4, 5.1, 5.2, 6.2, 6.3, 7.1, 7.2
 */

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

/**
 * Stateful harness: CharacterPage receives a real `updateCharacter` that applies
 * the mutator to local state and re-renders, so tests can observe the persisted
 * result of a deposit (both pools, ledger, eventLog) and the recomputed coin
 * weight. `coinWeight` is derived from the current personal wealth, mirroring
 * useCharacter's `useMemo`.
 */
function Harness({ initial, onCharacterChange }: { initial: Character; onCharacterChange?: (c: Character) => void }) {
  const [char, setChar] = useState<Character>(initial);
  const updateCharacter = (mutator: (c: Character) => Character) => {
    setChar((prev) => {
      const next = mutator(prev);
      onCharacterChange?.(next);
      return next;
    });
  };
  const update = (field: string, value: unknown) => {
    setChar((prev) => {
      const next = { ...prev, [field]: value } as Character;
      onCharacterChange?.(next);
      return next;
    });
  };
  const coinWeight = calculateCoinWeight(char.wGC, char.wSS, char.wD);
  return (
    <CharacterPage
      character={char}
      characterId="test-id"
      update={update}
      updateCharacter={updateCharacter}
      totalWounds={10}
      armourPoints={defaultAP}
      maxEncumbrance={20}
      coinWeight={coinWeight}
    />
  );
}

function renderHarness(char: Character) {
  const changes: Character[] = [];
  const latest = () => (changes.length ? changes[changes.length - 1] : char);
  render(<Harness initial={char} onCharacterChange={(c) => changes.push(c)} />);
  // The Coin Purse section is on the Gear ("gear") sub-tab.
  fireEvent.click(screen.getByRole('tab', { name: /gear/i }));
  return { changes, latest };
}

/** Type an amount into the deposit control and submit it. */
function submitDeposit(amount: string) {
  const input = screen.getByLabelText('Deposit amount');
  fireEvent.change(input, { target: { value: amount } });
  const form = input.closest('form')!;
  const submitBtn = within(form).getByRole('button', { name: 'Deposit' });
  fireEvent.click(submitBtn);
}

/** A character with coin in both the purse and the treasury. */
function seededCharacter(overrides: Partial<Character> = {}): Character {
  const base = makeCharacter({
    wGC: 10,
    wSS: 20,
    wD: 30,
    ...overrides,
  });
  base.estate.treasury = { gc: 5, ss: 5, d: 5 };
  base.estate.ledger = [];
  base.eventLog = [];
  return base;
}

describe('CharacterPage Deposit_Control (wealth-treasury-transfer Task 9)', () => {
  it('renders the Deposit control in the Wealth section (Req 1.1)', () => {
    renderHarness(seededCharacter());

    // Section header (heading, not the preview pool label which reads "Coin Purse")
    expect(screen.getByRole('heading', { name: 'Coin Purse (carried)' })).toBeInTheDocument();
    // The control's amount input and Deposit submit button
    expect(screen.getByLabelText('Deposit amount')).toBeInTheDocument();
    const input = screen.getByLabelText('Deposit amount');
    const form = input.closest('form')!;
    expect(within(form).getByRole('button', { name: 'Deposit' })).toBeInTheDocument();
    // Per-denomination preview with both pool labels
    const preview = screen.getByTestId('transfer-preview-deposit');
    expect(within(preview).getByText('Coin Purse')).toBeInTheDocument();
    expect(within(preview).getByText('Treasury')).toBeInTheDocument();
  });

  it('valid deposit → single mutation lowers wealth, raises treasury, +1 income ledger entry, +1 wealth event (Req 1.2, 1.3, 3.1, 3.3, 7.1)', () => {
    const char = seededCharacter(); // wealth 10/20/30, treasury 5/5/5
    const { changes, latest } = renderHarness(char);

    const amountStr = '2GC 5SS 10D';
    const amount = parseCurrencyInput(amountStr)!;
    submitDeposit(amountStr);

    // Exactly one character mutation occurred (single atomic update, Req 7.1).
    expect(changes.length).toBe(1);

    const result = latest();

    // Personal wealth lowered per denomination (Req 1.2).
    expect({ gc: result.wGC, ss: result.wSS, d: result.wD }).toEqual({
      gc: char.wGC - amount.gc,
      ss: char.wSS - amount.ss,
      d: char.wD - amount.d,
    });

    // Treasury raised per denomination (Req 1.2, 1.3).
    expect(result.estate.treasury).toEqual({
      gc: char.estate.treasury.gc + amount.gc,
      ss: char.estate.treasury.ss + amount.ss,
      d: char.estate.treasury.d + amount.d,
    });

    // Exactly one income ledger entry appended (Req 3.1).
    expect(result.estate.ledger.length).toBe(1);
    const entry = result.estate.ledger[0];
    expect(entry.type).toBe('income');
    expect(entry.description).toBe('Transfer: Personal Wealth → Treasury');
    expect(entry.amount).toEqual(amount);

    // Exactly one wealth event appended (Req 3.3).
    const wealthEvents = (result.eventLog ?? []).filter((e) => e.category === 'wealth');
    expect(wealthEvents.length).toBe(1);
  });

  it('over-amount → inline error and no change to wealth, treasury, ledger, or eventLog (Req 1.4, 3.4, 7.2)', () => {
    const char = seededCharacter(); // wealth 10/20/30
    const { changes } = renderHarness(char);

    // 999 GC exceeds the 10 GC in the purse in the GC denomination.
    submitDeposit('999GC');

    // No mutation of any of the four artefacts (Req 7.2).
    expect(changes.length).toBe(0);

    // Inline error rendered in the Wealth section (Req 1.4).
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toMatch(/insufficient/i);
  });

  it('typing an amount shows the per-denomination resulting source/destination preview (Req 6.2)', () => {
    const char = seededCharacter(); // wealth 10/20/30, treasury 5/5/5
    renderHarness(char);

    const amountStr = '2GC 5SS 10D';
    const amount = parseCurrencyInput(amountStr)!;
    fireEvent.change(screen.getByLabelText('Deposit amount'), { target: { value: amountStr } });

    const preview = transferFunds(
      { gc: char.wGC, ss: char.wSS, d: char.wD },
      char.estate.treasury,
      amount,
    );
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;

    // Source (Wealth) results per denomination.
    expect(screen.getByTestId('transfer-deposit-source-gc').textContent).toBe(String(preview.source.gc));
    expect(screen.getByTestId('transfer-deposit-source-ss').textContent).toBe(String(preview.source.ss));
    expect(screen.getByTestId('transfer-deposit-source-d').textContent).toBe(String(preview.source.d));

    // Destination (Treasury) results per denomination.
    expect(screen.getByTestId('transfer-deposit-destination-gc').textContent).toBe(String(preview.destination.gc));
    expect(screen.getByTestId('transfer-deposit-destination-ss').textContent).toBe(String(preview.destination.ss));
    expect(screen.getByTestId('transfer-deposit-destination-d').textContent).toBe(String(preview.destination.d));
  });

  it('resulting balance exposes a breakdown tooltip reading `current +/- transferred = result` (Req 6.3)', () => {
    const char = seededCharacter(); // wealth GC 10, treasury GC 5
    renderHarness(char);

    fireEvent.change(screen.getByLabelText('Deposit amount'), { target: { value: '2GC' } });

    // Open the source (Wealth) GC breakdown: 10 − 2 = 8.
    const sourceCell = screen.getByTestId('transfer-deposit-source-gc');
    fireEvent.click(sourceCell);
    const sourceTip = document.getElementById('transfer-deposit-source-gc');
    expect(sourceTip).not.toBeNull();
    expect(sourceTip!.textContent).toContain('10');
    expect(sourceTip!.textContent).toContain('−');
    expect(sourceTip!.textContent).toContain('2');
    expect(sourceTip!.textContent).toContain('8');

    fireEvent.keyDown(document, { key: 'Escape' });

    // Open the destination (Treasury) GC breakdown: 5 + 2 = 7.
    const destCell = screen.getByTestId('transfer-deposit-destination-gc');
    fireEvent.click(destCell);
    const destTip = document.getElementById('transfer-deposit-destination-gc');
    expect(destTip).not.toBeNull();
    expect(destTip!.textContent).toContain('5');
    expect(destTip!.textContent).toContain('+');
    expect(destTip!.textContent).toContain('2');
    expect(destTip!.textContent).toContain('7');
  });

  it('after a deposit the displayed coin weight equals calculateCoinWeight(newWealth) (Req 5.1)', () => {
    // Seed enough coin that a deposit crosses a 200-coin weight boundary.
    const char = seededCharacter({ wGC: 100, wSS: 100, wD: 40 }); // sum 240 → weight 1
    renderHarness(char);

    // Before: weight = floor(240/200) = 1.
    const coinCellBefore = screen.getByLabelText('Coin weight breakdown');
    expect(coinCellBefore.textContent).toBe(String(calculateCoinWeight(100, 100, 40)));
    expect(coinCellBefore.textContent).toBe('1');

    // Depositing moves coin OUT of the purse. Deposit 100SS + 40D → purse
    // 100/0/0 → sum 100 → weight 0, crossing the 200-coin boundary downward.
    submitDeposit('100SS 40D');

    const newWealth: CurrencyDelta = { gc: 100, ss: 0, d: 0 };
    const expectedWeight = calculateCoinWeight(newWealth.gc, newWealth.ss, newWealth.d); // floor(100/200) = 0

    const coinCellAfter = screen.getByLabelText('Coin weight breakdown');
    expect(coinCellAfter.textContent).toBe(String(expectedWeight));
    expect(coinCellAfter.textContent).toBe('0');
  });

  it('a treasury-only change does not affect coin weight (Req 5.2)', () => {
    // Deposit moves coin OUT of the purse; verify coin weight tracks only the
    // purse and never the treasury. Start with a purse whose weight stays put
    // across the deposit while the treasury grows.
    // Purse 300/300/0 → sum 600 → weight 3. Deposit 100SS → purse 300/200/0 →
    // sum 500 → weight 2 (purse changed). To isolate "treasury-only doesn't
    // matter", assert the post-deposit weight ignores the (now larger) treasury.
    const char = seededCharacter({ wGC: 300, wSS: 300, wD: 0 });
    char.estate.treasury = { gc: 0, ss: 0, d: 0 };
    const { latest } = renderHarness(char);

    submitDeposit('100SS');

    const result = latest();
    // Treasury grew to 100 SS but is excluded from coin weight (Req 5.2):
    // weight = floor((wGC+wSS+wD)/200), treasury not included.
    const expectedWeight = calculateCoinWeight(result.wGC, result.wSS, result.wD);
    // Sanity: computing weight over purse+treasury would give a different number.
    const purseOnly = calculateCoinWeight(300, 200, 0); // floor(500/200) = 2
    expect(expectedWeight).toBe(purseOnly);

    const coinCell = screen.getByLabelText('Coin weight breakdown');
    expect(coinCell.textContent).toBe(String(expectedWeight));
  });
});
