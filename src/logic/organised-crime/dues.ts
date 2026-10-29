import { parseStatusTier } from '../endeavours';

/**
 * Monthly-dues calculation for the Organised Crime tracker (Deft Steps, Light
 * Fingers — "Organised Crime" chapter). Pure and React-free.
 *
 * Deft Steps p.63 "Paying Your Dues" (docs/deftsteps.md L2343), verbatim:
 *   "Generally speaking, a criminal must pay 1 coin determined by their status
 *    for every level of the gang to which they belong, per month. So a Thief
 *    (Brass 3) who is a member of the Essen Black Rose Lodge (Level 3) must pay
 *    three pennies a month."
 *
 * Interpretation (locked by design):
 *   - count       = the gang's Organisation Level (1–4).
 *   - denomination = the coin set by the character's STATUS TIER WORD:
 *                      Brass  → brass pennies  (d)
 *                      Silver → silver shillings (/-)
 *                      Gold   → gold crowns     (GC)
 * Worked example (book): Brass 3 member of a Level 3 gang → 3 pennies/month (3d).
 */

export type DuesDenomination = 'gc' | 'ss' | 'd';

export interface MonthlyDues {
  /** Number of coins = organisation level (1–4). */
  count: number;
  /** null when the status tier could not be parsed. */
  denomination: DuesDenomination | null;
  /** Human display, e.g. "3d", "2/-", "4 GC", or a guidance string when unknown. */
  display: string;
  /** Ordered breakdown components for the calculated-total tooltip. */
  breakdown: { label: string; value: string }[];
  /** True when the status tier could not be parsed (denomination is null). */
  tierUnknown: boolean;
}

/** Guidance shown when the character's status tier cannot be parsed. */
export const DUES_TIER_UNKNOWN_GUIDANCE =
  'status tier unknown — set a Brass/Silver/Gold status';

/**
 * Per-tier presentation data. The mixed display spacing — "3d" (no space),
 * "2/-" (no space), "4 GC" (space) — is INTENTIONAL and follows the book's own
 * notation ("2d", "2/-", "1 GC") and the EnterpriseCurrency idiom (gc/ss/d). Do
 * NOT "normalise" the spacing in a future cleanup.
 */
const TIER_PRESENTATION: Record<
  'gold' | 'silver' | 'brass',
  { denomination: DuesDenomination; tierWord: string; coinWord: string; format: (count: number) => string }
> = {
  // Deft Steps p.63: Gold status → gold crowns (GC).
  gold: {
    denomination: 'gc',
    tierWord: 'Gold',
    coinWord: 'crowns',
    format: (count) => `${count} GC`,
  },
  // Deft Steps p.63: Silver status → silver shillings (/-).
  silver: {
    denomination: 'ss',
    tierWord: 'Silver',
    coinWord: 'shillings',
    format: (count) => `${count}/-`,
  },
  // Deft Steps p.63: Brass status → brass pennies (d).
  brass: {
    denomination: 'd',
    tierWord: 'Brass',
    coinWord: 'pennies',
    format: (count) => `${count}d`,
  },
};

/**
 * Compute monthly dues for a gang membership. Pure and total: never throws,
 * never guesses a denomination. `status` is the already-resolved status string
 * (character status or per-membership override — the caller decides which).
 *
 * Reuses parseStatusTier from endeavours.ts (case-insensitive substring match)
 * rather than forking the tier parse.
 */
export function computeMonthlyDues(status: string, organisationLevel: number): MonthlyDues {
  // Defensive clamp for imported/out-of-range data; the stored type is the
  // 1|2|3|4 literal union so the UI selector only emits valid values.
  const raw = Math.trunc(organisationLevel);
  const count = Number.isFinite(raw) ? Math.min(4, Math.max(1, raw)) : 1;

  const tier = parseStatusTier(status);

  if (tier === null) {
    return {
      count,
      denomination: null,
      display: DUES_TIER_UNKNOWN_GUIDANCE,
      tierUnknown: true,
      breakdown: [
        { label: 'Status tier', value: 'unknown' },
        { label: 'Organisation Level', value: String(count) },
      ],
    };
  }

  const p = TIER_PRESENTATION[tier];
  const display = p.format(count);

  return {
    count,
    denomination: p.denomination,
    display,
    tierUnknown: false,
    breakdown: [
      { label: 'Status tier', value: `${p.tierWord} (${p.coinWord})` },
      { label: 'Organisation Level', value: String(count) },
      { label: 'Dues', value: `${display} per month` },
    ],
  };
}
