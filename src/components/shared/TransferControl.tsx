import { useState, useMemo, type FormEvent } from 'react';
import {
  parseCurrencyInput,
  transferFunds,
  type CurrencyDelta,
} from '../../logic/currency';
import { Tooltip } from './Tooltip';
import { TooltipTriggerCell } from './TooltipTriggerCell';
import styles from './TransferControl.module.css';

export interface TransferControlProps {
  /** Direction determines source/destination labelling and mapping. */
  direction: 'deposit' | 'withdraw';
  /** Current source-pool balance (deposit: personal wealth; withdraw: treasury). */
  source: CurrencyDelta;
  /** Current destination-pool balance. */
  destination: CurrencyDelta;
  /** Human labels for the two pools, e.g. { source: 'Wealth', destination: 'Treasury' }. */
  labels: { source: string; destination: string };
  /** Called with the parsed delta when the user submits a valid amount. */
  onSubmit: (amount: CurrencyDelta) => void;
  /** Inline error to display (owned by the page's applyTransfer). */
  error?: string | null;
}

/** The three denominations, in display order, with their labels and delta keys. */
const DENOMINATIONS: ReadonlyArray<{ key: keyof CurrencyDelta; label: string }> = [
  { key: 'gc', label: 'GC' },
  { key: 'ss', label: 'SS' },
  { key: 'd', label: 'D' },
];

/**
 * Which pool a preview cell belongs to. The source pool always loses coin and
 * the destination pool always gains it, regardless of transfer direction — the
 * `direction` prop only affects labelling, since the owning page maps
 * source/destination by direction before passing them in.
 */
type Pool = 'source' | 'destination';

/** Zero-balance delta used as a safe fallback when nothing has been entered. */
const ZERO: CurrencyDelta = { gc: 0, ss: 0, d: 0 };

/**
 * Shared coin-transfer control used by both the Deposit_Control (Character page
 * Wealth section) and the Withdraw_Control (Estate page Treasury panel).
 *
 * Parses the amount with `parseCurrencyInput` on change (Req 6.1), previews the
 * resulting source and destination balances per denomination via `transferFunds`
 * (Req 6.2), and shows a `current +/- transferred = result` breakdown tooltip on
 * every resulting balance (Req 6.3; calculated-totals steering). Zero components
 * are always shown so every contributing factor is visible.
 */
export function TransferControl({
  direction,
  source,
  destination,
  labels,
  onSubmit,
  error,
}: TransferControlProps) {
  const [value, setValue] = useState('');
  // Tooltip open state keyed by pool+denomination so only one shows at a time.
  const [openTooltip, setOpenTooltip] = useState<{
    pool: Pool;
    key: keyof CurrencyDelta;
    anchorEl: HTMLElement;
  } | null>(null);

  // Parse the current amount on every render (Req 6.1). null → nothing valid typed.
  const parsed = useMemo(() => parseCurrencyInput(value), [value]);

  // Compute the preview (Req 6.2). When the amount is missing/zero/insufficient,
  // fall back to showing the current balances unchanged so the cells always render.
  const transferred = parsed ?? ZERO;
  const preview = useMemo(
    () => transferFunds(source, destination, transferred),
    [source, destination, transferred],
  );

  const resultSource = preview.ok ? preview.source : source;
  const resultDestination = preview.ok ? preview.destination : destination;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      // Invalid/empty input never submits (Error Handling). The page owns the
      // error message; here we simply refuse to submit.
      return;
    }
    const result = parseCurrencyInput(trimmed);
    if (result === null) {
      return;
    }
    onSubmit(result);
    setValue('');
  }

  const actionVerb = direction === 'deposit' ? 'Deposit' : 'Withdraw';
  const inputId = `transfer-amount-${direction}`;
  const errorId = `transfer-error-${direction}`;

  /**
   * Render a single resulting-balance cell (one denomination for one pool) with
   * its breakdown tooltip. The source pool loses coin (`current − transferred`)
   * and the destination pool gains it (`current + transferred`) — Req 6.3.
   */
  function renderCell(
    pool: Pool,
    denom: { key: keyof CurrencyDelta; label: string },
    current: CurrencyDelta,
    result: CurrencyDelta,
    poolLabel: string,
  ) {
    const currentVal = current[denom.key];
    const transferredVal = transferred[denom.key];
    const resultVal = result[denom.key];
    const isSubtract = pool === 'source';
    const sign = isSubtract ? '−' : '+';
    const tooltipId = `transfer-${direction}-${pool}-${denom.key}`;
    const isTooltipOpen =
      openTooltip?.pool === pool && openTooltip?.key === denom.key;

    return (
      <div className={styles.denomCell} key={`${pool}-${denom.key}`}>
        <span className={styles.denomLabel}>{denom.label}</span>
        <TooltipTriggerCell
          tooltipId={tooltipId}
          displayValue={resultVal}
          isTooltipOpen={isTooltipOpen}
          onOpen={(anchorEl) => setOpenTooltip({ pool, key: denom.key, anchorEl })}
          onClose={() => setOpenTooltip(null)}
          className={styles.resultValue}
          ariaLabel={`${poolLabel} ${denom.label} result ${resultVal}. Tap for breakdown.`}
          dataTestId={`transfer-${direction}-${pool}-${denom.key}`}
        />
        {isTooltipOpen && openTooltip && (
          <Tooltip
            anchorEl={openTooltip.anchorEl}
            title={`${poolLabel} ${denom.label}`}
            onClose={() => setOpenTooltip(null)}
            id={tooltipId}
          >
            <div className={styles.breakdown}>
              <span className={styles.breakdownFormula}>
                {currentVal} {sign} {transferredVal} = {resultVal}
              </span>
              <div className={styles.breakdownRows}>
                <div className={styles.breakdownRow}>
                  <span className={styles.breakdownRowLabel}>Current:</span>
                  <span className={styles.breakdownRowValue}>{currentVal}</span>
                </div>
                <div className={styles.breakdownRow}>
                  <span className={styles.breakdownRowLabel}>Transferred:</span>
                  <span className={styles.breakdownRowValue}>
                    {sign}{transferredVal}
                  </span>
                </div>
                <div className={styles.breakdownTotalRow}>
                  <span>Result:</span>
                  <span>{resultVal}</span>
                </div>
              </div>
            </div>
          </Tooltip>
        )}
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.inputRow}>
        <input
          id={inputId}
          type="text"
          className={styles.input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={60}
          placeholder="e.g. 2GC 5SS 10D"
          aria-label={`${actionVerb} amount`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        <button type="submit" className={styles.submitButton}>
          {actionVerb}
        </button>
      </div>

      <div className={styles.preview} data-testid={`transfer-preview-${direction}`}>
        <div className={styles.poolColumn}>
          <span className={styles.poolLabel}>{labels.source}</span>
          <div className={styles.denomRow}>
            {DENOMINATIONS.map((denom) =>
              renderCell('source', denom, source, resultSource, labels.source),
            )}
          </div>
        </div>
        {/* Directional affordance: source → destination (↓ when stacked). Purely
            decorative, so hidden from the a11y tree and test queries. */}
        <span className={styles.poolSeparator} aria-hidden="true">
          <span className={styles.poolSeparatorArrow}>→</span>
          <span className={styles.poolSeparatorArrowStacked}>↓</span>
        </span>
        <div className={`${styles.poolColumn} ${styles.poolColumnDestination}`}>
          <span className={`${styles.poolLabel} ${styles.poolLabelDestination}`}>
            {labels.destination}
          </span>
          <div className={styles.denomRow}>
            {DENOMINATIONS.map((denom) =>
              renderCell('destination', denom, destination, resultDestination, labels.destination),
            )}
          </div>
        </div>
      </div>

      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
