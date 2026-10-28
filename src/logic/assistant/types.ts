import type { Character } from '../../types/character';
import type { PageSection } from '../../components/layout/navItems';
import type { ReminderTest } from '../reminders';
import type { DifficultyLevel } from '../dice-roller';

/**
 * The pure, deterministic, React-free Character Assistant engine
 * (character-assistant design §"The pure engine"). It emits plain,
 * JSON-serializable Suggestion objects whose `action` is a serializable
 * descriptor — never a closure — so an optional async (e.g. LLM-backed) source
 * could later feed the same panel with no UI rewrite (FR-7). No AI/LLM, no
 * backend, no network, no side effects (NFR-1 / FR-5.1).
 */

/** Grouping key for a suggestion (FR-5.2). Extend by adding a member. */
export type SuggestionCategory =
  | 'combat'
  | 'advancement'
  | 'endeavour'
  | 'encumbrance'
  | 'corruption'
  | 'health' // NEW: active diseases + unhealed critical wounds (injury/condition review)
  | 'resource'; // NEW: unspent Fortune / Resolve (a spendable-pool nudge)

/**
 * Ordering/grouping signal (FR-5.2). Lower sorts first within a context.
 * `critical` = act now (overburdened, corruption at threshold, combat tests);
 * `recommended` = opinionated nudge (ready-to-advance);
 * `info` = soft reminder (unspent XP, endeavour to resolve).
 */
export type SuggestionUrgency = 'critical' | 'recommended' | 'info';

/**
 * A serializable descriptor the UI interprets to invoke an EXISTING handler
 * (FR-6). It is a discriminated union and MUST remain JSON-serializable: no
 * functions, DOM nodes, or class instances (FR-5.3). The engine never performs
 * the action — it only describes it.
 */
export type SuggestionAction =
  // Calls the existing navigate(page, subTab) threaded through App.tsx.
  // `page` is a real PageSection; `subTab` is a real sub-tab key for that page.
  | { kind: 'navigate'; page: PageSection; subTab?: string | null }
  // Opens the shared RollDialog seeded exactly as CombatDashboard.handleRollReminder:
  // the UI resolves `test.def` -> baseTarget via resolveReminderBaseTarget and
  // passes `test.difficulty` through to RollDialog's defaultDifficulty.
  // `test` REUSES the reminder test shape so no new roll logic is introduced.
  | { kind: 'roll'; test: { def: ReminderTest; difficulty: DifficultyLevel; rollName: string } }
  // Triggers the EXISTING bulk file export (assembleBackup -> downloadBackup),
  // a user-gesture-initiated download. The engine only DESCRIBES it; the UI
  // dispatcher performs it (auto-backup design §6).
  | { kind: 'backup-file' };

/** A single recommendation. Plain data, JSON-serializable (FR-5.2 / FR-5.3). */
export interface Suggestion {
  /** Stable key for React lists, dedupe, and dismiss/snooze (FR-5.2). */
  id: string;
  /** Short human-readable label. */
  title: string;
  /** Brief "why" string; rulebook-cited where it encodes a rule (FR-10.1). */
  rationale: string;
  category: SuggestionCategory;
  urgency: SuggestionUrgency;
  action: SuggestionAction;
  /**
   * Optional **secondary** action (e.g. corruption's primary is a seeded roll,
   * secondary is "view Corruption panel"). Same descriptor union; serializable.
   */
  secondaryAction?: SuggestionAction;
  /**
   * Rulebook citation carried as DATA across the serializable boundary
   * (FR-10.3). For reminder-derived items this is `CombatReminder.citation`
   * VERBATIM; for native rules it is the same string as the rule module's
   * `// Core p.NNN` comment. The panel renders this source-agnostically.
   */
  citation?: string;
  /**
   * Optional calculated totals this suggestion displays, each with the
   * breakdown the panel renders through the shared Tooltip (FR-11). Plain data
   * only — the breakdown lines come from src/logic/breakdown-helpers.ts or the
   * reminder citation, never recomputed in the UI.
   */
  totals?: SuggestionTotal[];
}

export interface SuggestionTotal {
  /** e.g. "Encumbrance" or "Corruption". */
  label: string;
  /** Rendered value, e.g. "12 / 8". */
  display: string;
  /** Breakdown lines, e.g. ["Weapons 3", "Armour 1", "Trappings 7", "Coins 1"]. */
  lines: string[];
}

/**
 * Everything the engine needs beyond the character. Extensible WITHOUT a
 * breaking change: new optional fields only (FR-3.1).
 */
export interface SuggestionContext {
  /**
   * Single source of truth: character.combatState.inCombat — the exact signal
   * CombatPage passes to CombatDashboard (resolves OQ-4). The engine reads it
   * from context (not from the character) so the caller owns the one read.
   */
  inCombat: boolean;
  /**
   * Last FILE backup timestamp (ms epoch) or null. Read ONCE by the shell (not
   * the engine) and threaded in so the engine stays pure — the file-backup
   * nudge module reads this instead of calling `getLastBackupAt()` at eval time
   * (auto-backup design §6, Finding 4). Optional ⇒ non-breaking (FR-3.1).
   */
  lastBackupAt?: number | null;
  /**
   * Clock snapshot the shell already holds (`assistantNow`), threaded in so the
   * nudge module performs no `Date.now()` at engine-eval time. Optional ⇒
   * non-breaking.
   */
  now?: number;
}

/**
 * The boundary the panel consumes (FR-7). The panel knows nothing about how
 * suggestions are produced.
 *
 * FUTURE-PROOFING (FR-7.2): the return type is `Suggestion[] | Promise<Suggestion[]>`
 * so an async source (e.g. an LLM-backed source) is a NON-BREAKING extension —
 * the deterministic default returns the sync branch and remains the permanent
 * offline fallback (FR-7.3). Sync callers narrow with an `Array.isArray` guard
 * (see `visibleSuggestions` and the shell `useMemo`); the deterministic default
 * is ALWAYS synchronous, so the guard's sync branch is the only path taken today.
 */
export interface SuggestionSource {
  getSuggestions(
    character: Character | undefined,
    context: SuggestionContext,
  ): Suggestion[] | Promise<Suggestion[]>;
}
