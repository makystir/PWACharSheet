import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TransferControl } from '../TransferControl';
import type { TransferControlProps } from '../TransferControl';
import {
  parseCurrencyInput,
  transferFunds,
  type CurrencyDelta,
} from '../../../logic/currency';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeProps(overrides: Partial<TransferControlProps> = {}): TransferControlProps {
  return {
    direction: 'deposit',
    source: { gc: 10, ss: 20, d: 30 },
    destination: { gc: 1, ss: 2, d: 3 },
    labels: { source: 'Wealth', destination: 'Treasury' },
    onSubmit: vi.fn(),
    error: null,
    ...overrides,
  };
}

/** Type the transfer amount into the amount input. */
function typeAmount(text: string) {
  const input = screen.getByLabelText(/amount/i);
  fireEvent.change(input, { target: { value: text } });
  return input;
}

const DENOMS = ['gc', 'ss', 'd'] as const;

// ─── Req 6.1: parses input via parseCurrencyInput; invalid input does NOT submit

describe('TransferControl input parsing (Req 6.1)', () => {
  it('submits the parseCurrencyInput result for a valid amount', () => {
    const onSubmit = vi.fn();
    render(<TransferControl {...makeProps({ onSubmit })} />);

    typeAmount('2GC 5SS 10D');
    fireEvent.click(screen.getByRole('button', { name: 'Deposit' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(parseCurrencyInput('2GC 5SS 10D'));
    expect(onSubmit.mock.calls[0][0]).toEqual({ gc: 2, ss: 5, d: 10 });
  });

  it('does NOT call onSubmit when the input has no valid currency tokens', () => {
    const onSubmit = vi.fn();
    render(<TransferControl {...makeProps({ onSubmit })} />);

    // "abc" parses to null via parseCurrencyInput → must not submit.
    expect(parseCurrencyInput('abc')).toBeNull();
    typeAmount('abc');
    fireEvent.click(screen.getByRole('button', { name: 'Deposit' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does NOT call onSubmit when the input is empty', () => {
    const onSubmit = vi.fn();
    render(<TransferControl {...makeProps({ onSubmit })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Deposit' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});

// ─── Req 6.2: preview equals transferFunds output ───────────────────────────

describe('TransferControl preview (Req 6.2)', () => {
  it('renders per-denomination resulting source & destination equal to transferFunds output', () => {
    const source: CurrencyDelta = { gc: 10, ss: 20, d: 30 };
    const destination: CurrencyDelta = { gc: 1, ss: 2, d: 3 };
    render(
      <TransferControl
        {...makeProps({ direction: 'deposit', source, destination })}
      />,
    );

    typeAmount('2GC 5SS 10D');
    const amount = parseCurrencyInput('2GC 5SS 10D')!;
    const expected = transferFunds(source, destination, amount);
    expect(expected.ok).toBe(true);
    if (!expected.ok) return;

    const preview = screen.getByTestId('transfer-preview-deposit');
    for (const denom of DENOMS) {
      // Source pool (loses coin)
      expect(
        within(preview).getByTestId(`transfer-deposit-source-${denom}`),
      ).toHaveTextContent(String(expected.source[denom]));
      // Destination pool (gains coin)
      expect(
        within(preview).getByTestId(`transfer-deposit-destination-${denom}`),
      ).toHaveTextContent(String(expected.destination[denom]));
    }
  });

  it('shows current balances unchanged when nothing is entered', () => {
    const source: CurrencyDelta = { gc: 10, ss: 20, d: 30 };
    const destination: CurrencyDelta = { gc: 1, ss: 2, d: 3 };
    render(<TransferControl {...makeProps({ direction: 'deposit', source, destination })} />);

    const preview = screen.getByTestId('transfer-preview-deposit');
    for (const denom of DENOMS) {
      expect(
        within(preview).getByTestId(`transfer-deposit-source-${denom}`),
      ).toHaveTextContent(String(source[denom]));
      expect(
        within(preview).getByTestId(`transfer-deposit-destination-${denom}`),
      ).toHaveTextContent(String(destination[denom]));
    }
  });

  it('shows balances unchanged for an insufficient-funds amount (preview falls back)', () => {
    const source: CurrencyDelta = { gc: 1, ss: 0, d: 0 };
    const destination: CurrencyDelta = { gc: 5, ss: 5, d: 5 };
    render(<TransferControl {...makeProps({ direction: 'deposit', source, destination })} />);

    // 99GC overdraws source → transferFunds returns not ok → cells show current.
    typeAmount('99GC');
    const preview = screen.getByTestId('transfer-preview-deposit');
    expect(within(preview).getByTestId('transfer-deposit-source-gc')).toHaveTextContent('1');
    expect(within(preview).getByTestId('transfer-deposit-destination-gc')).toHaveTextContent('5');
  });
});

// ─── Req 6.3: tooltip shows the additive breakdown ──────────────────────────

describe('TransferControl breakdown tooltip (Req 6.3)', () => {
  it('shows current − transferred = result for the source pool (deposit)', () => {
    const source: CurrencyDelta = { gc: 10, ss: 20, d: 30 };
    const destination: CurrencyDelta = { gc: 1, ss: 2, d: 3 };
    render(<TransferControl {...makeProps({ direction: 'deposit', source, destination })} />);

    typeAmount('2GC 5SS 10D');
    const amount = parseCurrencyInput('2GC 5SS 10D')!;
    const result = transferFunds(source, destination, amount);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Open the source GC cell tooltip.
    fireEvent.click(screen.getByTestId('transfer-deposit-source-gc'));
    const tooltip = screen.getByRole('tooltip');

    // Breakdown formula: current − transferred = result (source loses coin).
    expect(tooltip).toHaveTextContent(
      `${source.gc} − ${amount.gc} = ${result.source.gc}`,
    );
    expect(tooltip).toHaveTextContent('Current:');
    expect(tooltip).toHaveTextContent('Transferred:');
    expect(tooltip).toHaveTextContent('Result:');
  });

  it('shows current + transferred = result for the destination pool (deposit)', () => {
    const source: CurrencyDelta = { gc: 10, ss: 20, d: 30 };
    const destination: CurrencyDelta = { gc: 1, ss: 2, d: 3 };
    render(<TransferControl {...makeProps({ direction: 'deposit', source, destination })} />);

    typeAmount('2GC 5SS 10D');
    const amount = parseCurrencyInput('2GC 5SS 10D')!;
    const result = transferFunds(source, destination, amount);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    fireEvent.click(screen.getByTestId('transfer-deposit-destination-ss'));
    const tooltip = screen.getByRole('tooltip');

    // Destination gains coin: current + transferred = result.
    expect(tooltip).toHaveTextContent(
      `${destination.ss} + ${amount.ss} = ${result.destination.ss}`,
    );
  });

  it('includes zero components in the breakdown', () => {
    const source: CurrencyDelta = { gc: 10, ss: 20, d: 30 };
    const destination: CurrencyDelta = { gc: 1, ss: 2, d: 3 };
    render(<TransferControl {...makeProps({ direction: 'deposit', source, destination })} />);

    // Only GC moves; SS/D transferred = 0 but still shown.
    typeAmount('2GC');
    fireEvent.click(screen.getByTestId('transfer-deposit-source-d'));
    const tooltip = screen.getByRole('tooltip');
    // D: 30 − 0 = 30 (zero component visible).
    expect(tooltip).toHaveTextContent('30 − 0 = 30');
  });
});

// ─── Req 6.3 (withdraw): direction inverts which pool subtracts/adds ─────────

describe('TransferControl withdraw direction', () => {
  it('uses withdraw test ids and labels; breakdown still current +/- transferred = result', () => {
    const source: CurrencyDelta = { gc: 50, ss: 0, d: 0 };
    const destination: CurrencyDelta = { gc: 5, ss: 0, d: 0 };
    render(
      <TransferControl
        {...makeProps({
          direction: 'withdraw',
          source,
          destination,
          labels: { source: 'Treasury', destination: 'Wealth' },
        })}
      />,
    );

    // Withdraw button label.
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeInTheDocument();

    typeAmount('10GC');
    const amount = parseCurrencyInput('10GC')!;
    const result = transferFunds(source, destination, amount);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const preview = screen.getByTestId('transfer-preview-withdraw');
    expect(within(preview).getByTestId('transfer-withdraw-source-gc')).toHaveTextContent(
      String(result.source.gc),
    );
    expect(within(preview).getByTestId('transfer-withdraw-destination-gc')).toHaveTextContent(
      String(result.destination.gc),
    );

    // Source (treasury) loses: 50 − 10 = 40.
    fireEvent.click(screen.getByTestId('transfer-withdraw-source-gc'));
    expect(screen.getByRole('tooltip')).toHaveTextContent('50 − 10 = 40');
  });
});

// ─── Inline error rendering (Req 1.4 / 2.4 UI) ──────────────────────────────

describe('TransferControl error', () => {
  it('renders the inline error via role="alert"', () => {
    render(
      <TransferControl {...makeProps({ error: 'Insufficient funds — this transfer would overdraw the source.' })} />,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Insufficient funds');
  });
});

// ─── Touch targets ≥44px (ui-layout steering) ───────────────────────────────

describe('TransferControl touch targets (≥44px)', () => {
  it('input, submit button and result cells carry the sizing classes', () => {
    render(<TransferControl {...makeProps()} />);

    // jsdom does not run layout; following the suite convention, the ≥44px sizing
    // is provided by CSS module classes (min-height/min-width: 44px in
    // TransferControl.module.css). Assert the elements carry those classes.
    const input = screen.getByLabelText(/amount/i);
    expect(input.className).toBeTruthy();
    expect(input.className).toMatch(/input/);

    const button = screen.getByRole('button', { name: 'Deposit' });
    expect(button.className).toMatch(/submitButton/);

    // Every preview result cell carries the resultValue class (min 44×44).
    const cells = screen.getAllByRole('button').filter((el) =>
      el.getAttribute('data-testid')?.startsWith('transfer-deposit-'),
    );
    expect(cells).toHaveLength(6); // 3 denoms × 2 pools
    for (const cell of cells) {
      expect(cell.className).toMatch(/resultValue/);
    }
  });
});
