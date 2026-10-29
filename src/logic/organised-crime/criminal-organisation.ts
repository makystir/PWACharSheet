/**
 * Pure, React-free "Criminal Organisation" reference table (Deft Steps, Light
 * Fingers — "Organised Crime" chapter).
 *
 * Deft Steps p.58 "Build Gang" (docs/deftsteps.md L2208). Every value below is
 * transcribed VERBATIM from docs/deftsteps.md; nothing is invented. Read-only
 * reference — no mechanic mutates character state from this data.
 *
 * ── HEADER-LEAK ARTIFACT (stripped at transcription time) ─────────────────────
 * The markdown conversion leaked the two-column page header "CRIMINAL
 * ENTERPRISES" into the LEVEL-1 data row of the source table:
 *   - Resources cell read:  "CRIMINAL 2/-"                     → clean: "2/-"
 *   - Influence cell read:  "ENTERPRISES Clerk, Guild Journeyman"
 *                                                              → clean: "Clerk, Guild Journeyman"
 * The leaked tokens "CRIMINAL" / "ENTERPRISES" are the page-header leaking in;
 * they are stripped here so only the clean values enter the data. See
 * CRIMINAL_ORGANISATION_ARTIFACT_NOTE below (surfaced in the UI as a flag).
 */

export interface CriminalOrganisationRow {
  /** Organisation Level, 1–4. */
  readonly level: 1 | 2 | 3 | 4;
  /** Cost to grow TO this level (verbatim). */
  readonly costToGrow: string;
  /** Muscle available (verbatim). */
  readonly muscle: string;
  /** Resources gained via Get Resources (verbatim). */
  readonly resources: string;
  /** Influence contacts (verbatim). */
  readonly influence: string;
  /** Legal Trouble reach (verbatim). */
  readonly legalTrouble: string;
}

export const CRIMINAL_ORGANISATION: readonly CriminalOrganisationRow[] = [
  {
    level: 1,
    costToGrow: '10/-',
    muscle: '2 Racketeers',
    // Source leaked "CRIMINAL 2/-" → stripped leading page-header token "CRIMINAL".
    resources: '2/-',
    // Source leaked "ENTERPRISES Clerk, Guild Journeyman" → stripped "ENTERPRISES".
    influence: 'Clerk, Guild Journeyman',
    legalTrouble: 'Watchman',
  },
  {
    level: 2,
    costToGrow: '1 GC',
    muscle: '1d10 Racketeers',
    resources: '4/-',
    influence: 'Junior Official, Guildsman',
    legalTrouble: 'Watch Sergeant',
  },
  {
    level: 3,
    costToGrow: '10 GC',
    muscle: '2d10 Racketeers',
    resources: '1 GC',
    influence: 'City Official, Guild Master',
    legalTrouble: 'Watch Captain',
  },
  {
    level: 4,
    costToGrow: '100 GC',
    muscle: '4d10 Racketeers',
    resources: '4 GC',
    influence: 'Senior Official, Guild Chairman',
    legalTrouble: 'Judge',
  },
];

/**
 * Flag caption surfaced in the reference panel documenting the stripped
 * page-header leak (see module header). Pins the raw leaked tokens so the
 * artifact can never be silently lost.
 */
export const CRIMINAL_ORGANISATION_ARTIFACT_NOTE =
  'Source artifact (Deft Steps p.58): the Level-1 row leaked the page header "CRIMINAL ENTERPRISES" into two cells ("CRIMINAL 2/-", "ENTERPRISES Clerk, Guild Journeyman"). The leaked tokens are stripped; only the clean values are shown.';
