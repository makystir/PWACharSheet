import type { CharacteristicKey, PsychologyTrait, PsychologyType } from '../types/character';
import type { DifficultyLevel } from './dice-roller';
import { PSYCHOLOGY_REMINDERS } from './psychology';

/**
 * Single source of truth for proactive combat & psychology reminders
 * (reminders-design §2). React-free, deterministic, unit- and
 * property-testable in isolation — mirroring the attack-consequences.ts
 * precedent.
 *
 * This module CONSOLIDATES the condition reminder strings that
 * src/logic/end-of-turn.ts emitted inline; end-of-turn.ts now consumes
 * `conditionReminderText(...)` so the two can never drift (design §3). The five
 * condition `description` literals here are byte-identical to the strings that
 * module emitted before the refactor.
 *
 * Rulebook grounding (authoritative source: docs/WarhammerFantasyRoleplay4e.md):
 * every mechanic below was read in the Master Condition List (Core pp.168–171)
 * and the Psychology section (Core pp.189–191). No mechanic is invented; where
 * the rule is not a single unambiguous test the reminder is marked informational
 * (no roll `test`). GM-set / circumstance-dependent difficulties (Broken,
 * Ablaze, all psychology tests) seed Challenging (+0) as a neutral, adjustable
 * default the player overrides in the roll dialog — not an invented fixed TN
 * (design §9.1/§9.3/§9.10).
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** Which characteristic/skill a reminder's one-tap roll uses. */
export type ReminderTest =
  // Resolved directly off a characteristic total.
  | { kind: 'characteristic'; char: CharacteristicKey }
  // Prefer the named skill's advances when on the sheet, else the bare
  // characteristic (an untrained Skill still tests off its characteristic).
  | { kind: 'skill'; skillName: string; fallbackChar: CharacteristicKey };

export type ReminderSource = 'condition' | 'psychology';

export interface CombatReminder {
  /** Stable key for React lists & dedupe, e.g. "condition:Stunned" or "psych:<id>". */
  id: string;
  source: ReminderSource;
  /** Condition name or psychology trait display (e.g. "Fear (Rating 2)"). */
  label: string;
  /**
   * Human-readable rule reminder. For conditions this is byte-identical to the
   * string end-of-turn.ts emits; for psychology it is PSYCHOLOGY_REMINDERS[type]
   * verbatim (no psychology prose is re-authored here).
   */
  description: string;
  /** Present ⇒ a one-tap roll button is shown. Absent ⇒ informational only. */
  test?: {
    def: ReminderTest;
    difficulty: DifficultyLevel;
    /** Display name passed to performRoll, e.g. "Endurance (remove Stunned)". */
    rollName: string;
  };
  /** Rulebook citation, surfaced in the reminder's info tooltip. */
  citation: string;
}

// ─── Condition reminder table (the single source of truth) ────────────────────

interface ConditionReminderRow {
  /** Byte-identical to the literal end-of-turn.ts emitted before the refactor. */
  description: string;
  test?: {
    def: ReminderTest;
    difficulty: DifficultyLevel;
    rollName: string;
  };
  citation: string;
}

/**
 * Keyed by condition name. Only conditions with a per-Round turn reminder appear
 * here; `conditionReminderText` returns undefined for any other name.
 *
 * Characteristic groupings per the Core skill list (Core p.117): Cool → WP,
 * Endurance → T, Athletics → Ag.
 */
const CONDITION_REMINDERS: Record<string, ConditionReminderRow> = {
  // Core p.169: "At the end of each Round, you may attempt a Challenging (+0)
  // Endurance Test. If successful, remove a Stunned Condition…"
  Stunned: {
    description: 'Endurance Test (Challenging +0) required to remove',
    test: {
      def: { kind: 'skill', skillName: 'Endurance', fallbackChar: 'T' },
      difficulty: 'Challenging',
      rollName: 'Endurance (remove Stunned)',
    },
    citation: 'Core p.169 (Master Condition List): a Challenging (+0) Endurance Test at the end of each Round removes a Stunned Condition (each SL removes an extra).',
  },
  // Core p.169: "At the end of each Round, you may attempt an Endurance Test.
  // If successful, remove a Poisoned Condition, with each SL removing an extra."
  Poisoned: {
    description: 'Endurance Test to remove (each SL removes extra)',
    test: {
      def: { kind: 'skill', skillName: 'Endurance', fallbackChar: 'T' },
      difficulty: 'Challenging',
      rollName: 'Endurance (remove Poisoned)',
    },
    citation: 'Core p.169 (Master Condition List): an Endurance Test at the end of each Round removes a Poisoned Condition (each SL removes an extra); the poison sets the Difficulty.',
  },
  // Core p.169: "…at the end of each Round, you may attempt a Cool Test to
  // remove a Broken Condition… Difficulty determined by the circumstances."
  // Difficulty is circumstance-dependent; Challenging (+0) is a neutral,
  // adjustable default seeded in the dialog (design §9.1).
  Broken: {
    description: 'Cool Test to remove',
    test: {
      def: { kind: 'skill', skillName: 'Cool', fallbackChar: 'WP' },
      difficulty: 'Challenging',
      rollName: 'Cool (rally from Broken)',
    },
    citation: 'Core p.169 (Master Condition List): if unengaged, a Cool Test at the end of each Round removes a Broken Condition; the Difficulty is set by circumstances (seeded Challenging +0, adjust in the dialog). You cannot rally while Engaged.',
  },
  // Core p.169: "One Blinded Condition is removed at the end of every other
  // Round." Auto-removes — no player test, informational only.
  Blinded: {
    description: '1 level removed every other round',
    citation: 'Core p.169 (Master Condition List): one Blinded Condition is removed at the end of every other Round — no test required.',
  },
  // Core p.169: "One Deafened condition is removed at the end of every other
  // Round." Auto-removes — no player test, informational only.
  Deafened: {
    description: '1 level removed every other round',
    citation: 'Core p.169 (Master Condition List): one Deafened Condition is removed at the end of every other Round — no test required.',
  },
};

/**
 * The order end-of-turn.ts pushes condition reminders (verified against
 * processEndOfTurn). `deriveConditionReminders` iterates this array (not the
 * input) so output order is deterministic regardless of condition insertion
 * order.
 */
const CONDITION_REMINDER_ORDER: string[] = ['Stunned', 'Poisoned', 'Broken', 'Blinded', 'Deafened'];

// ─── Additional roll-backed conditions (not emitted by end-of-turn reminders) ──

/**
 * Ablaze is handled by end-of-turn.ts as a damage effect (not a reminder), so it
 * is not in CONDITION_REMINDERS. It still warrants a one-tap Athletics Test in
 * the panel. Core p.168: "One Ablaze Condition can be removed with a successful
 * Athletics Test… the Difficulty for this Test is modified by circumstances"
 * (seeded Challenging +0, adjustable; design §9.3).
 */
const ABLAZE_REMINDER: ConditionReminderRow = {
  description: 'Athletics Test to extinguish (each SL removes extra)',
  test: {
    def: { kind: 'skill', skillName: 'Athletics', fallbackChar: 'Ag' },
    difficulty: 'Challenging',
    rollName: 'Athletics (extinguish Ablaze)',
  },
  citation: 'Core p.168 (Master Condition List): an Athletics Test removes an Ablaze Condition (each SL removes an extra); the Difficulty is modified by circumstances (seeded Challenging +0, adjust in the dialog).',
};

// ─── Psychology reminder table ────────────────────────────────────────────────

interface PsychologyReminderRow {
  test?: {
    def: ReminderTest;
    difficulty: DifficultyLevel;
    rollName: string;
  };
  citation: string;
}

/**
 * Keyed by PsychologyType. The reminder `description` is always the verbatim
 * PSYCHOLOGY_REMINDERS[type] string (design §1 "Description source-of-truth
 * note") — this module never re-authors psychology prose. Difficulty for every
 * psychology test is GM-set (Core p.189 "the Difficulty set by the GM"), so each
 * seeds Challenging (+0) as a neutral, adjustable default (design §9.10).
 */
const PSYCHOLOGY_REMINDER_ROWS: Record<PsychologyType, PsychologyReminderRow> = {
  // Core p.190: overcome Fear on an Extended Cool Test; the single one-tap button
  // is a Challenging (+0) Cool Test and the player tracks the Extended total
  // (design §9.7).
  Fear: {
    test: {
      def: { kind: 'skill', skillName: 'Cool', fallbackChar: 'WP' },
      difficulty: 'Challenging',
      rollName: 'Cool (overcome Fear)',
    },
    citation: 'Core p.190 (Psychology): overcome Fear on an Extended Cool Test (pass until SL ≥ the Fear Rating); the secondary "move closer"/"it comes closer" tests are Challenging (+0) Cool. Difficulty is GM-set (p.189); seeded Challenging (+0).',
  },
  // Core p.190: "When you first encounter a creature causing Terror, make a Cool
  // Test." Difficulty GM-set (p.189); seeded Challenging (+0).
  Terror: {
    test: {
      def: { kind: 'skill', skillName: 'Cool', fallbackChar: 'WP' },
      difficulty: 'Challenging',
      rollName: 'Cool (resist Terror)',
    },
    citation: 'Core p.190 (Psychology): resist Terror with a Cool Test; on a fail gain Broken Conditions equal to the Terror Rating (plus SL below 0). Difficulty is GM-set (p.189); seeded Challenging (+0).',
  },
  // Core p.190: "With a Willpower Test, you can work yourself into a state of
  // frenzy" — and resist it likewise. This is a bare Willpower characteristic
  // Test (there is no "Willpower" skill in the Core skill list; WP is a
  // characteristic), so the one-tap roll resolves off the WP total only — no
  // Cool skill advances are added. Difficulty GM-set; seeded Challenging (+0).
  Frenzy: {
    test: {
      def: { kind: 'characteristic', char: 'WP' },
      difficulty: 'Challenging',
      rollName: 'Willpower (resist Frenzy)',
    },
    citation: 'Core p.190 (Psychology): Frenzy is entered/resisted with a Willpower Test. Difficulty is GM-set (p.189); seeded Challenging (+0).',
  },
  // Core p.189: "You must attempt a Psychology Test whenever you encounter the
  // group." The app resolves Psychology Tests as Cool Tests (matching
  // PSYCHOLOGY_REMINDERS wording). Difficulty GM-set; seeded Challenging (+0).
  Animosity: {
    test: {
      def: { kind: 'skill', skillName: 'Cool', fallbackChar: 'WP' },
      difficulty: 'Challenging',
      rollName: 'Cool (end Animosity)',
    },
    citation: 'Core p.189 (Psychology — Animosity): a Psychology (Cool) Test, with the Difficulty set by the GM, is attempted to resist/end Animosity. Seeded Challenging (+0), adjust in the dialog.',
  },
  // Core pp.189–190 (Hatred): Psychology (Cool) Test; Difficulty GM-set (p.189).
  Hatred: {
    test: {
      def: { kind: 'skill', skillName: 'Cool', fallbackChar: 'WP' },
      difficulty: 'Challenging',
      rollName: 'Cool (end Hatred)',
    },
    citation: 'Core pp.189–190 (Psychology — Hatred): a Psychology (Cool) Test, Difficulty set by the GM (p.189), is attempted to resist/end Hatred. Seeded Challenging (+0), adjust in the dialog.',
  },
  // Core pp.189–190 (Prejudice): Psychology (Cool) Test; Difficulty GM-set.
  Prejudice: {
    test: {
      def: { kind: 'skill', skillName: 'Cool', fallbackChar: 'WP' },
      difficulty: 'Challenging',
      rollName: 'Cool (end Prejudice)',
    },
    citation: 'Core pp.189–190 (Psychology — Prejudice): a Psychology (Cool) Test, Difficulty set by the GM (p.189), is attempted to resist/end Prejudice. Seeded Challenging (+0), adjust in the dialog.',
  },
  // Core p.191 (Phobia, custom example): "Treat the object of the Phobia as
  // causing Fear 1" → resolves as a Psychology/Cool Test. Difficulty GM-set.
  Phobia: {
    test: {
      def: { kind: 'skill', skillName: 'Cool', fallbackChar: 'WP' },
      difficulty: 'Challenging',
      rollName: 'Cool (overcome Phobia)',
    },
    citation: 'Core p.191 (Psychology — Phobia): the Phobia object causes Fear 1, resolved with a Cool Test. Difficulty is GM-set (p.189); seeded Challenging (+0).',
  },
  // Core p.191 (Trauma, custom example): the test and penalties are at GM
  // discretion and non-deterministic — informational only, no roll `test`.
  Trauma: {
    citation: 'Core p.191 (Psychology — Trauma): a custom trait resolved with a Cool Test when reminded, with penalties entirely at GM discretion — surfaced as informational only.',
  },
};

// ─── Exported functions ───────────────────────────────────────────────────────

/**
 * The exact reminder description string for a condition, or undefined if that
 * condition has no per-Round turn reminder. end-of-turn.ts calls this so the two
 * never drift; it returns byte-identical strings to the former inline literals.
 */
export function conditionReminderText(conditionName: string): string | undefined {
  return CONDITION_REMINDERS[conditionName]?.description;
}

/**
 * Single source of truth for condition-driven reminders. Pure and order-stable
 * (iterates CONDITION_REMINDER_ORDER + Ablaze, not the input array, so output
 * order is deterministic regardless of condition insertion order).
 */
export function deriveConditionReminders(
  conditions: { name: string; level: number }[],
): CombatReminder[] {
  const present = new Set(conditions.map((c) => c.name));
  const result: CombatReminder[] = [];

  for (const name of CONDITION_REMINDER_ORDER) {
    if (!present.has(name)) continue;
    const row = CONDITION_REMINDERS[name];
    result.push({
      id: `condition:${name}`,
      source: 'condition',
      label: name,
      description: row.description,
      test: row.test,
      citation: row.citation,
    });
  }

  // Ablaze: a roll-backed reminder not in the end-of-turn reminder set.
  if (present.has('Ablaze')) {
    result.push({
      id: 'condition:Ablaze',
      source: 'condition',
      label: 'Ablaze',
      description: ABLAZE_REMINDER.description,
      test: ABLAZE_REMINDER.test,
      citation: ABLAZE_REMINDER.citation,
    });
  }

  return result;
}

/** Build the display label for a psychology trait (e.g. "Fear (Rating 2)"). */
function psychologyLabel(trait: PsychologyTrait): string {
  if (trait.type === 'Fear' || trait.type === 'Terror') {
    const rating = trait.rating !== undefined ? `${trait.rating}` : '?';
    return `${trait.type} (Rating ${rating})`;
  }
  if (trait.target.trim().length > 0) {
    return `${trait.type} (${trait.target})`;
  }
  return trait.type;
}

/**
 * Single source of truth for psychology-driven reminders. Returns [] unless
 * enabled is true (caller passes houseRules.usePsychologyTracker). Coalesces an
 * undefined traits list to []. The description is the verbatim
 * PSYCHOLOGY_REMINDERS[type] string.
 */
export function derivePsychologyReminders(
  traits: PsychologyTrait[] | undefined,
  enabled: boolean,
): CombatReminder[] {
  if (!enabled) return [];
  const list = traits ?? [];
  return list.map((trait) => {
    const row = PSYCHOLOGY_REMINDER_ROWS[trait.type];
    return {
      id: `psych:${trait.id}`,
      source: 'psychology' as const,
      label: psychologyLabel(trait),
      description: PSYCHOLOGY_REMINDERS[trait.type],
      test: row.test,
      citation: row.citation,
    };
  });
}

/** Convenience: condition reminders first, then psychology reminders. */
export function deriveAllReminders(params: {
  conditions: { name: string; level: number }[];
  psychologyTraits: PsychologyTrait[] | undefined;
  psychologyEnabled: boolean;
}): CombatReminder[] {
  return [
    ...deriveConditionReminders(params.conditions),
    ...derivePsychologyReminders(params.psychologyTraits, params.psychologyEnabled),
  ];
}
