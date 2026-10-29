/**
 * Pure, React-free "Perks by Organisation Level" reference table (Deft Steps,
 * Light Fingers — "Organised Crime" chapter).
 *
 * Deft Steps p.63 (docs/deftsteps.md ~L2481). Every value below is transcribed
 * VERBATIM from docs/deftsteps.md; nothing is invented. Read-only reference.
 *
 * ── HEADER-LEAK ARTIFACT (stripped at transcription time) ─────────────────────
 * The markdown conversion leaked the two-column page header "CRIMINAL
 * ENTERPRISE PERKS" into the LEVEL-1 data row of the source table:
 *   - News cell read:  "CRIMINAL ENTERPRISE Plans of Public Areas"
 *                                            → clean: "Plans of Public Areas"
 *   - Fence cell read: "PERKS Goods of a value of up to 10 GC per Month"
 *                                            → clean: "Goods of a value of up to 10 GC per Month"
 * The leaked tokens "CRIMINAL ENTERPRISE" / "PERKS" are the page-header leaking
 * in; they are stripped here so only the clean values enter the data. See
 * PERKS_ARTIFACT_NOTE below (surfaced in the UI as a flag).
 *
 * ── SOURCE TYPO (preserved, not a value change) ──────────────────────────────
 * The printed column header reads "Provide Lawyers for Memebers Accused of:"
 * ("Memebers" is a source misspelling of "Members"). Per rules-compliance, the
 * verbatim misspelling is pinned as SOURCE_HEADER_LAWYERS so it can never be
 * silently normalised away (a shape test asserts it), while the display uses the
 * corrected human-readable label.
 */

export interface PerksByLevelRow {
  /** Organisation Level, 1–4. */
  readonly level: 1 | 2 | 3 | 4;
  /** Facilitate Links to Contacts (verbatim). */
  readonly contacts: string;
  /** News and Rumours available (verbatim). */
  readonly news: string;
  /** Will Help Fence goods up to value (verbatim). */
  readonly fence: string;
  /** Provide Lawyers for Members accused of (verbatim crimes list). */
  readonly lawyers: string;
}

/**
 * Verbatim source column header, preserving the "Memebers" misspelling exactly
 * as printed (Deft Steps p.63). Pinned so the artifact survives edits; the
 * corrected label PERKS_LAWYERS_DISPLAY_HEADER is used for display.
 */
export const SOURCE_HEADER_LAWYERS = 'Provide Lawyers for Memebers Accused of';

/** Corrected, human-readable column header used in the UI. */
export const PERKS_LAWYERS_DISPLAY_HEADER = 'Provide Lawyers for Members Accused of';

export const PERKS_BY_LEVEL: readonly PerksByLevelRow[] = [
  {
    level: 1,
    contacts: 'Bawd, Racketeer',
    // Source leaked "CRIMINAL ENTERPRISE Plans of Public Areas" → stripped header tokens.
    news: 'Plans of Public Areas',
    // Source leaked "PERKS Goods of a value of up to 10 GC per Month" → stripped "PERKS".
    fence: 'Goods of a value of up to 10 GC per Month',
    lawyers: 'Trivial and Moderate Crimes',
  },
  {
    level: 2,
    contacts: 'Bawd, Charlatan, Fence, Racketeer',
    news: 'Schedules of Watch Patrols',
    fence: 'Goods of a value of up to 20 GC per Month',
    lawyers: 'Trivial and Moderate Crimes',
  },
  {
    level: 3,
    contacts: 'Bawd, Charlatan, Fence, Forger, Racketeer',
    news: 'Plans of Sewers and Notable Buildings',
    fence: 'Goods of a value of up to 40 GC per Month',
    lawyers: 'Trivial, Moderate and Serious Crimes',
  },
  {
    level: 4,
    contacts: 'All Contacts',
    news: 'Copied Keys, Friendly Insiders',
    fence: 'Goods of a value of up to 80 GC per Month',
    lawyers: 'All Crimes',
  },
];

/**
 * Flag caption surfaced in the reference panel documenting the stripped
 * page-header leak (see module header). Pins the raw leaked tokens so the
 * artifact can never be silently lost.
 */
export const PERKS_ARTIFACT_NOTE =
  'Source artifact (Deft Steps p.63): the Level-1 row leaked the page header "CRIMINAL ENTERPRISE PERKS" into two cells ("CRIMINAL ENTERPRISE Plans of Public Areas", "PERKS Goods of a value of up to 10 GC per Month"), and the column header misspells "Members" as "Memebers". Leaked tokens are stripped; the typo is preserved verbatim in the source constant.';
