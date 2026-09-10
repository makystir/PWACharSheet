import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EstatePage } from '../EstatePage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, Estate } from '../../../types/character';
import { parseCurrencyInput, transferFunds } from '../../../logic/currency';

/**
 * Render tests for the Withdraw_Control on EstatePage (Treasury panel, 'wealth'
 * sub-tab). Covers Requirements 2.1, 2.2, 2.3, 2.4, 3.2, 3.3, 3.4, 6.2, 6.3,
 * 6.4, 7.1, 7.2.
 *
 * The Withdraw control moves coin FROM the estate treasury INTO personal wealth
 * (source = treasury, destination = personal wealth). A withdrawal records an
 * 'expense' LedgerEntry ("Transfer: Treasury → Personal Wealth") plus one
 * 'wealth' event, in a single updateCharacter mutation.
 */

function makeCharacter(overrides: {
  estate?: Partial<Estate>;
  wGC?: number;
  wSS?: number;
  wD?: number;
} = {}): Character {
  return structuredClone({
    ...BLANK_CHARACTER,
    wGC: overrides.wGC ?? 0,
    wSS: overrides.wSS ?? 0,
    wD: overrides.wD ?? 0,
    estate: {
      ...BLANK_CHARACTER.estate,
      ...overrides.estate,
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
      subTab="wealth"
    />,
  );

  return { updateCharacter, getCaptured: () => captured, ...result };
}

/** The Withdraw control's amount input and submit button live in a <form>. */
function getWithdrawInput(): HTMLInputElement {
  return screen.getByLabelText('Withdraw amount') as HTMLInputElement;
}

function getWithdrawButton(): HTMLButtonElement {
  // The submit button label is the action verb "Withdraw".
  return screen.getByRole('button', { name: 'Withdraw' }) as HTMLButtonElement;
}

function submitWithdrawal(amount: string) {
  fireEvent.change(getWithdrawInput(), { target: { value: amount } });
  fireEvent.click(getWithdrawButton());
}

describe('EstatePage — Withdraw_Control (Treasury panel)', () => {
  // Req 2.1 — control present in the Treasury panel.
  it('renders the Withdraw control in the Treasury panel on the wealth sub-tab', () => {
    const char = makeCharacter({ estate: { treasury: { gc: 10, ss: 5, d: 2 } } });
    renderEstatePage(char);

    // Treasury panel is visible on the default wealth sub-tab (panel title).
    expect(screen.getByText('Treasury', { selector: 'div' })).toBeInTheDocument();
    // The Withdraw control lives inside the Treasury panel.
    const input = getWithdrawInput();
    expect(input).toBeInTheDocument();
    expect(getWithdrawButton()).toBeInTheDocument();
    // Preview surface for the withdraw direction is present.
    expect(screen.getByTestId('transfer-preview-withdraw')).toBeInTheDocument();
  });

  // Req 2.2, 2.3, 3.2, 3.3, 7.1 — valid withdrawal: single mutation lowers
  // treasury, raises wealth, +1 expense ledger entry, +1 wealth event.
  it('applies a valid withdrawal in a single mutation: treasury down, wealth up, +1 expense ledger entry, +1 wealth event', () => {
    const char = makeCharacter({
      wGC: 1,
      wSS: 2,
      wD: 3,
      estate: { treasury: { gc: 10, ss: 5, d: 4 }, ledger: [] },
    });
    const { updateCharacter, getCaptured } = renderEstatePage(char);

    submitWithdrawal('2GC 3SS 1D');

    // Exactly one mutation → atomicity (Req 7.1).
    expect(updateCharacter).toHaveBeenCalledTimes(1);

    const amount = parseCurrencyInput('2GC 3SS 1D')!;
    const expected = transferFunds(
      { gc: 10, ss: 5, d: 4 },
      { gc: 1, ss: 2, d: 3 },
      amount,
    );
    expect(expected.ok).toBe(true);
    if (!expected.ok) return;

    const updated = getCaptured();
    // Treasury (source) lowered (Req 2.2).
    expect(updated.estate.treasury).toEqual(expected.source);
    // Personal wealth (destination) raised (Req 2.2).
    expect({ gc: updated.wGC, ss: updated.wSS, d: updated.wD }).toEqual(expected.destination);

    // Exactly one ledger entry appended, of type 'expense' with the right
    // description and amount (Req 3.2).
    expect(updated.estate.ledger).toHaveLength(1);
    const entry = updated.estate.ledger[0];
    expect(entry.type).toBe('expense');
    expect(entry.description).toBe('Transfer: Treasury → Personal Wealth');
    expect(entry.amount).toEqual(amount);

    // Exactly one wealth event appended (Req 3.3).
    expect(updated.eventLog).toHaveLength(1);
    expect(updated.eventLog[0].category).toBe('wealth');
  });

  // Req 2.4, 3.4, 7.2 — over-amount withdrawal blocked; nothing changes.
  it('blocks an over-amount withdrawal with an inline error and changes nothing', () => {
    const char = makeCharacter({
      wGC: 1,
      wSS: 0,
      wD: 0,
      estate: { treasury: { gc: 5, ss: 0, d: 0 }, ledger: [] },
    });
    const { updateCharacter } = renderEstatePage(char);

    // Withdraw more GC than the treasury holds.
    submitWithdrawal('10GC');

    // No mutation ran at all (Req 3.4, 7.2).
    expect(updateCharacter).not.toHaveBeenCalled();
    // Inline error surfaced in the Treasury panel (Req 2.4). The shared
    // treasuryError state drives both the panel error and the TransferControl
    // error, so at least one alert carries the message.
    const alerts = screen.getAllByRole('alert');
    expect(alerts.some((el) => /insufficient funds/i.test(el.textContent ?? ''))).toBe(true);
  });

  // Req 6.4, 7.2 — zero amount blocked; nothing changes.
  it('blocks a zero-amount withdrawal with an inline error and changes nothing', () => {
    const char = makeCharacter({
      estate: { treasury: { gc: 5, ss: 5, d: 5 }, ledger: [] },
    });
    const { updateCharacter } = renderEstatePage(char);

    // A parsed amount that totals zero across denominations.
    submitWithdrawal('0GC 0SS 0D');

    expect(updateCharacter).not.toHaveBeenCalled();
    const alerts = screen.getAllByRole('alert');
    expect(alerts.some((el) => /greater than zero/i.test(el.textContent ?? ''))).toBe(true);
  });

  // Req 6.2 — preview shows the per-denomination resulting source (treasury) and
  // destination (wealth) balances while typing.
  it('previews the resulting treasury and wealth balances per denomination while typing', () => {
    const char = makeCharacter({
      wGC: 1,
      wSS: 2,
      wD: 3,
      estate: { treasury: { gc: 10, ss: 5, d: 4 } },
    });
    renderEstatePage(char);

    fireEvent.change(getWithdrawInput(), { target: { value: '2GC 3SS 1D' } });

    const amount = parseCurrencyInput('2GC 3SS 1D')!;
    const preview = transferFunds({ gc: 10, ss: 5, d: 4 }, { gc: 1, ss: 2, d: 3 }, amount);
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;

    // Source pool = treasury (lowered).
    expect(screen.getByTestId('transfer-withdraw-source-gc')).toHaveTextContent(String(preview.source.gc));
    expect(screen.getByTestId('transfer-withdraw-source-ss')).toHaveTextContent(String(preview.source.ss));
    expect(screen.getByTestId('transfer-withdraw-source-d')).toHaveTextContent(String(preview.source.d));

    // Destination pool = personal wealth (raised).
    expect(screen.getByTestId('transfer-withdraw-destination-gc')).toHaveTextContent(String(preview.destination.gc));
    expect(screen.getByTestId('transfer-withdraw-destination-ss')).toHaveTextContent(String(preview.destination.ss));
    expect(screen.getByTestId('transfer-withdraw-destination-d')).toHaveTextContent(String(preview.destination.d));
  });

  // Req 6.3 — each resulting balance exposes a breakdown tooltip reading
  // `current +/- transferred = result`.
  it('shows a breakdown tooltip (current +/- transferred = result) on a resulting balance', () => {
    const char = makeCharacter({
      wGC: 1,
      wSS: 2,
      wD: 3,
      estate: { treasury: { gc: 10, ss: 5, d: 4 } },
    });
    renderEstatePage(char);

    fireEvent.change(getWithdrawInput(), { target: { value: '2GC' } });

    // Open the tooltip for the source (treasury) GC result cell.
    const sourceGcCell = screen.getByTestId('transfer-withdraw-source-gc');
    fireEvent.click(sourceGcCell);

    // Treasury GC: current 10 − transferred 2 = result 8.
    const tooltip = screen.getByRole('tooltip');
    expect(within(tooltip).getByText('10 − 2 = 8')).toBeInTheDocument();

    // Open the destination (wealth) GC cell and check the additive breakdown.
    const destGcCell = screen.getByTestId('transfer-withdraw-destination-gc');
    fireEvent.click(destGcCell);
    const tooltip2 = screen.getByRole('tooltip');
    // Wealth GC: current 1 + transferred 2 = result 3.
    expect(within(tooltip2).getByText('1 + 2 = 3')).toBeInTheDocument();
  });
});
