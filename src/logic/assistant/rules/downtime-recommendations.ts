import type { Character } from '../../../types/character';
import type { Suggestion, SuggestionContext, SuggestionTotal } from '../types';
import { hasActiveEndeavours, CLASS_ENDEAVOURS } from '../../endeavours';
import { getActiveCriticalWounds } from '../../critical-wounds';
import { resolveSeededTarget } from '../../reminders-target';
import { deriveSheetTotals } from '../../sheet-totals';
import type { ReminderTest } from '../../reminders';
import type { DifficultyLevel } from '../../dice-roller';

/**
 * Situation-aware downtime/endeavour recommendations (Downtime / Endeavour
 * Assistant). A pure, deterministic, side-effect-free rule module: it reads only
 * already-tracked character state and emits `Suggestion[]` recommending
 * endeavours that ALREADY EXIST in the shipped catalog
 * (`GENERAL_ENDEAVOURS` / `CLASS_ENDEAVOURS` / template names). It invents no
 * endeavour, test, cost, or difficulty.
 *
 * It is the THIRD endeavour-category module and complements the existing two
 * without double-firing: it shares the exact `!inCombat && !hasActiveEndeavours`
 * gate `downtime.ts` uses (so it never overlaps `endeavour:active`), and every id
 * it emits is namespaced `endeavour:rec:*` (so it never collides with
 * `endeavour:available`). See design Decision 3.
 *
 * Rulebook grounding (authoritative: docs/WarhammerFantasyRoleplay4e.md,
 * Chapter 6 — Between Adventures → Endeavours). Every rule below carries a
 * `// Core p.NNN` comment with the verified page; no mechanic is invented.
 *
 * Only three endeavours resolve with a self-contained Test on a BARE
 * (non-specialised) basic skill the app can seed unambiguously — Study a Mark
 * (Perception), The Latest News (Gossip), Foment Dissent stage 1 (Gossip). Those
 * carry a seeded `roll` that opens the existing RollDialog. Everything else is
 * guidance-only (navigate, no roll button), because its RAW test is
 * specialisation-dependent, player-chosen, GM-set, or narrative/flat-mechanic —
 * seeding would present a wrong, uneditable base target (RollDialog's base target
 * is read-only). The assistant never auto-rolls, auto-applies, or auto-completes.
 */

/** Deterministic slug from an endeavour name so ids are stable across saves. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The exactly-three class endeavours whose RAW resolution is a self-contained
 * Test on a BARE basic skill row (verified present in `BLANK_CHARACTER.bSkills`),
 * so `resolveSeededTarget` hits the real row and reflects advances. Keyed by the
 * endeavour name as it appears in `CLASS_ENDEAVOURS`. Any class endeavour NOT in
 * this table is surfaced guidance-only (navigate, no roll).
 *
 * Difficulties are the RAW base values (not GM-set); the Difficulty select in the
 * dialog lets the player adjust for circumstance (incl. the off-class −1 level,
 * Core p.200). No invented fixed TN.
 */
const SEEDABLE_CLASS_ENDEAVOURS: Record<
  string,
  { def: ReminderTest; difficulty: DifficultyLevel; citation: string; rollName: string }
> = {
  // Core p.201 (Study a Mark): "Attempt a Challenging (+0) Perception Test…".
  // Perception is a bare basic skill (c:'I') in BLANK_CHARACTER.bSkills.
  'Study a Mark': {
    def: { kind: 'skill', skillName: 'Perception', fallbackChar: 'I' },
    difficulty: 'Challenging',
    citation: 'Core p.201: Study a Mark (Challenging +0 Perception Test)',
    rollName: 'Study a Mark (Perception)',
  },
  // Core p.201 (The Latest News): "Attempt a Challenging (+0) Gossip Test."
  // Gossip is a bare basic skill (c:'Fel') in BLANK_CHARACTER.bSkills.
  'Latest News': {
    def: { kind: 'skill', skillName: 'Gossip', fallbackChar: 'Fel' },
    difficulty: 'Challenging',
    citation: 'Core p.201: The Latest News (Challenging +0 Gossip Test)',
    rollName: 'The Latest News (Gossip)',
  },
  // Core p.200 (Foment Dissent): stage 1 "an Average (+20) Gossip Test"; stage 2
  // is a GM-set Charm Test (noted in the rationale, NOT seeded). Seed stage 1 only.
  'Foment Dissent': {
    def: { kind: 'skill', skillName: 'Gossip', fallbackChar: 'Fel' },
    difficulty: 'Average',
    citation: 'Core p.200: Foment Dissent (stage 1 Average +20 Gossip Test)',
    rollName: 'Foment Dissent (Gossip)',
  },
};

/** Per-endeavour Core citation + reason for the guidance-only class surfacing. */
const CLASS_ENDEAVOUR_CITATIONS: Record<string, string> = {
  'Combat Training': 'Core p.200: Combat Training (Challenging +0 Melee or Ranged Test — roll your specialisation)',
  'Research Lore': 'Core p.200: Research Lore (Average +20 Lore specialisation, or Difficult −10 Intelligence if untrained + literate)',
  Reputation: 'Core p.200: Reputation (Challenging +0 Career Skill Test)',
};

/**
 * Situation-aware endeavour recommendations.
 *
 * Fires out-of-combat only (downtime is not a combat activity) and only when the
 * character has NO active endeavour in flight — the same gate `downtime.ts` uses,
 * which guarantees mutual exclusion with `endeavour:active` (Decision 3).
 */
export function downtimeRecommendationSuggestions(
  character: Character,
  ctx: SuggestionContext,
): Suggestion[] {
  // Core p.195-201 (Between Adventures — Endeavours)
  if (ctx.inCombat) return []; // FR-1.3: out-of-combat only
  if (hasActiveEndeavours(character)) return []; // Decision 3: mutual exclusion

  const out: Suggestion[] = [];
  // Track emitted endeavour NAMES so T4 can skip a name T1–T3 already emitted
  // (semantic dedupe guard — disjoint today, future-proof).
  const emittedNames = new Set<string>();

  // ── T1 — Wounded / injured → Healing (guidance only, no roll) ──────────────
  // Core p.196-198: Between Adventures recovery. The roll-to-recover / physician
  // Heal Test is owned by the health rules (diseases.ts / critical-wound
  // guidance); this points at the downtime Healing endeavour and does NOT reuse
  // their ids or roll affordances.
  const activeCriticals = getActiveCriticalWounds(character.criticalWounds).length;
  const activeDiseases = (character.diseases ?? []).length;
  // Max wounds is derived, not stored on the Character. Use the canonical
  // single-source-of-truth derivation (Core p.36-37: SB + 2×TB + WPB, ×species
  // multiplier, + Hardy×TB) via deriveSheetTotals — no re-implemented formula.
  const maxWounds = deriveSheetTotals(character).wounds.total;
  const woundsHurt = character.wCur < maxWounds;
  if (woundsHurt || activeCriticals > 0 || activeDiseases > 0) {
    // Join applicable clauses with "; " in fixed order (wounds, criticals,
    // diseases) so the rationale is a pure function of state.
    const clauses: string[] = [];
    if (woundsHurt) clauses.push(`You are at ${character.wCur}/${maxWounds} Wounds`);
    if (activeCriticals > 0) clauses.push(`you have ${activeCriticals} unhealed Critical Wound(s)`);
    if (activeDiseases > 0) clauses.push('you have an active disease');
    out.push({
      id: 'endeavour:rec:healing',
      title: 'Healing endeavour',
      rationale: `${clauses.join('; ')} — spend downtime recovering (rest or a physician).`,
      category: 'endeavour',
      urgency: 'recommended',
      action: { kind: 'navigate', page: 'endeavours' },
      citation: 'Core p.196-198: Between Adventures (recovery during downtime)',
    });
    emittedNames.add('Healing');
  }

  // ── T2 — Low coin → Income (+ Banking option), guidance only ───────────────
  // Core p.198 (Income): flat status-based earnings, no Test. Core explicitly
  // pairs Income with Banking (p.196). "Low" is the only rules-honest,
  // deterministic tracked-data trigger: effectively out of spendable coin
  // (gold + silver both zero; brass ignored, below the status thresholds Income
  // operates on). The rationale echoes the three coin fields verbatim with NO
  // arithmetic between them, so there is no derived total to show.
  if (character.wGC === 0 && character.wSS === 0) {
    const coinText = `You hold ${character.wGC} GC, ${character.wSS} SS, ${character.wD} d`;
    out.push({
      id: 'endeavour:rec:income',
      title: 'Income endeavour',
      rationale: `${coinText} — earn coin from your career and status over downtime.`,
      category: 'endeavour',
      urgency: 'recommended',
      action: { kind: 'navigate', page: 'endeavours' },
      citation: 'Core p.198: Income (flat status-based earnings; pairs with Banking, p.196)',
    });
    emittedNames.add('Income');
    out.push({
      id: 'endeavour:rec:banking',
      title: 'Banking endeavour',
      rationale: 'Preserve coin across the Between-Adventures reset (and earn interest).',
      category: 'endeavour',
      urgency: 'info',
      action: { kind: 'navigate', page: 'endeavours' },
      citation: 'Core p.196: Banking (1d10 interest + 1d100 outcome — a money mechanic, no Test)',
    });
    emittedNames.add('Banking');
  }

  // ── T3 — Unspent XP → Training (+ Unusual Learning mention), guidance only ──
  // Core p.198 (Training): spend XP + money to a tutor to buy an Advance as if
  // in-career; no pass/fail skill/characteristic Test. Distinct id AND category
  // from learnable.ts's `advancement:learnable` (category 'advancement'), so it
  // does not duplicate the Advancement-page purchase nudge.
  if (character.xpCur > 0) {
    out.push({
      id: 'endeavour:rec:training',
      title: 'Training endeavour',
      rationale: `You have ${character.xpCur} unspent XP — train an out-of-career Advance as if in-career with a tutor (Unusual Learning is the Talent path, GM-set test).`,
      category: 'endeavour',
      urgency: 'info',
      action: { kind: 'navigate', page: 'endeavours' },
      citation: 'Core p.198: Training (spend XP + coin with a tutor)',
    });
    emittedNames.add('Training');
  }

  // ── T4 — Class-specific surfacing → CLASS_ENDEAVOURS[class] as options ──────
  // Core p.200-201 (Class Endeavours). Surface up to 2 of the character's class
  // endeavours in catalog order, skipping any name already emitted by T1–T3.
  // Seeded set (Study a Mark / Latest News / Foment Dissent) carries a roll;
  // everything else is guidance-only. If class is empty/unmatched, emit nothing
  // (mirrors buildPickerItems — no invented class).
  const className = character.class?.trim() ?? '';
  // Own-property guard: a junk class string that collides with an Object
  // prototype member (e.g. "__proto__", "constructor") must NOT resolve to an
  // inherited, non-array value and crash the `for…of`. Only real, declared
  // class keys count (Core p.200-201: Class Endeavours are a fixed catalog).
  const classEndeavours =
    className.length > 0 && Object.hasOwn(CLASS_ENDEAVOURS, className)
      ? CLASS_ENDEAVOURS[className]
      : undefined;
  if (classEndeavours) {
    const CLASS_CAP = 2;
    let emittedClass = 0;
    for (const name of classEndeavours) {
      if (emittedClass >= CLASS_CAP) break;
      if (emittedNames.has(name)) continue; // semantic dedupe guard
      emittedClass += 1;
      emittedNames.add(name);

      const seed = SEEDABLE_CLASS_ENDEAVOURS[name];
      if (seed) {
        const { total, lines } = resolveSeededTarget(character, seed.def);
        const totals: SuggestionTotal[] = [
          { label: 'Base Target', display: String(total), lines },
        ];
        out.push({
          id: `endeavour:rec:class:${slugify(name)}`,
          title: `${name} endeavour`,
          rationale: `A class endeavour for ${className}. ${seed.rollName} — roll the Test, then record the outcome on the Endeavours page.`,
          category: 'endeavour',
          urgency: 'info',
          action: {
            kind: 'roll',
            test: { def: seed.def, difficulty: seed.difficulty, rollName: seed.rollName },
          },
          secondaryAction: { kind: 'navigate', page: 'endeavours' },
          citation: seed.citation,
          totals,
        });
      } else {
        out.push({
          id: `endeavour:rec:class:${slugify(name)}`,
          title: `${name} endeavour`,
          rationale: `A class endeavour for ${className} — resolve it on the Endeavours page.`,
          category: 'endeavour',
          urgency: 'info',
          action: { kind: 'navigate', page: 'endeavours' },
          citation:
            CLASS_ENDEAVOUR_CITATIONS[name] ?? 'Core p.200-201: Class Endeavours (Between Adventures)',
        });
      }
    }
  }

  return out;
}
