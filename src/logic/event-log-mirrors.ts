/**
 * Event-log mirror helpers.
 *
 * Two small pure transforms that map a just-recorded authoritative typed entry
 * (an `AdvancementEntry` from `advancementLog`, or a `LedgerEntry` from
 * `estate.ledger`) to an `appendEvent` call on the unified event log.
 *
 * These are **display/audit-only** mirrors (Req 5.2, 5.4, 6.2). They run AFTER
 * the authoritative write and are pure: they neither read nor alter
 * `advancementLog` / `advancementLogArchive` / `estate.ledger` or any treasury
 * field. The event log is never read back to reconstruct mechanics (Req 5.5,
 * 6.3).
 *
 * Summary construction for advancement is wrapped so a formatting failure falls
 * back to a generic summary rather than throwing into the caller — a mirror must
 * never break the authoritative advancement/ledger write (design.md §"Error
 * Handling": "Mirror never throws into the source path").
 *
 * See spec: .kiro/specs/unified-event-log (design.md §3 "Mirror helpers").
 */
import type {
  AdvancementEntry,
  AdvancementEventPayload,
  Character,
  LedgerEntry,
  WealthEventPayload,
} from '../types/character';
import { appendEvent } from './event-log';

/**
 * WFRP4e currency denominations, largest first.
 * Core p.293: 1 Gold Crown (GC) = 20 Shillings (ss); 1 Shilling = 12 Pennies (d).
 * Money is written largest-denomination-first (GC, ss, d), which we mirror in
 * the summary string.
 */
function formatMoney(amount: { d: number; ss: number; gc: number }): string {
  const parts: string[] = [];
  if (amount.gc) {
    parts.push(`${amount.gc} GC`);
  }
  if (amount.ss) {
    parts.push(`${amount.ss} ss`);
  }
  if (amount.d) {
    parts.push(`${amount.d} d`);
  }
  // All-zero (or missing) amount → show an explicit "0 d" rather than an empty
  // string, so the summary always names a denomination.
  return parts.length > 0 ? parts.join(' ') : '0 d';
}

/**
 * Total monetary value in pennies, used only to pick the summary's +/- sign.
 * Core p.293 conversion: 1 GC = 20 ss = 240 d; 1 ss = 12 d.
 * Not read for treasury math (that stays on `estate.ledger`) — sign only.
 */
function amountInPennies(amount: { d: number; ss: number; gc: number }): number {
  return (amount.gc ?? 0) * 240 + (amount.ss ?? 0) * 12 + (amount.d ?? 0);
}

/**
 * Mirror an advancement entry into the event log as a `category: 'advancement'`
 * event. (Req 5.2, 5.4)
 *
 * Builds a human-readable summary such as `"XP: Advance WS 5→6 (−100 XP)"`, or
 * for an undo `"Undo: Advance WS 6→5 (+100 XP)"`. On an undo the XP is refunded,
 * so the sign flips to `+`. Summary construction is wrapped in try/catch so a
 * formatting failure degrades to a generic summary instead of throwing into the
 * authoritative advancement write.
 *
 * Pure: returns a NEW character with the mirror event appended; does not read or
 * mutate `advancementLog` / `advancementLogArchive`.
 */
export function mirrorAdvancement(
  character: Character,
  entry: AdvancementEntry,
  opts?: { undo?: boolean },
): Character {
  const undo = opts?.undo === true;

  let summary: string;
  try {
    // On undo the value moves back (to→from) and the XP is refunded (+), so the
    // sign is inverted relative to a normal advance (−). (Req 5.4)
    const fromValue = undo ? entry.to : entry.from;
    const toValue = undo ? entry.from : entry.to;
    const xpSign = undo ? '+' : '−';
    const prefix = undo ? 'Undo: Advance' : 'XP: Advance';
    summary = `${prefix} ${entry.name} ${fromValue}→${toValue} (${xpSign}${entry.xpCost} XP)`;
  } catch {
    // Fallback: never let a summary-formatting error break the source write.
    summary = undo ? 'Undo: Advancement' : 'XP: Advancement';
  }

  const payload: AdvancementEventPayload = {
    entryType: entry.type,
    name: entry.name,
    from: entry.from,
    to: entry.to,
    xpCost: entry.xpCost,
    undo,
  };

  return appendEvent(character, {
    category: 'advancement',
    type: undo ? 'advancement.mirror.undo' : 'advancement.mirror',
    summary,
    payload: payload as unknown as Record<string, unknown>,
  });
}

/**
 * Mirror a ledger entry into the event log as a `category: 'wealth'` event,
 * including the monetary amount in the summary. (Req 6.2)
 *
 * Builds a human-readable summary such as `"Wealth: Sold loot +2 GC 5 ss"`. The
 * sign reflects whether the net amount is a gain (+) or a loss (−); a zero
 * amount is shown without a sign. Summary construction is wrapped so a
 * formatting failure degrades to a generic summary instead of throwing into the
 * authoritative ledger write.
 *
 * Pure: returns a NEW character with the mirror event appended; does not read or
 * mutate `estate.ledger` or any treasury field.
 */
export function mirrorLedger(character: Character, entry: LedgerEntry): Character {
  let summary: string;
  try {
    const pennies = amountInPennies(entry.amount);
    const sign = pennies > 0 ? '+' : pennies < 0 ? '−' : '';
    // Format the magnitude so the sign isn't doubled on negative amounts.
    const magnitude = {
      d: Math.abs(entry.amount.d ?? 0),
      ss: Math.abs(entry.amount.ss ?? 0),
      gc: Math.abs(entry.amount.gc ?? 0),
    };
    summary = `Wealth: ${entry.description} ${sign}${formatMoney(magnitude)}`;
  } catch {
    // Fallback: never let a summary-formatting error break the source write.
    summary = 'Wealth: Ledger entry';
  }

  const payload: WealthEventPayload = {
    entryType: entry.type,
    description: entry.description,
    amount: entry.amount,
  };

  return appendEvent(character, {
    category: 'wealth',
    type: 'wealth.mirror',
    summary,
    payload: payload as unknown as Record<string, unknown>,
  });
}
