import type { Character } from '../../../types/character';
import type { Suggestion, SuggestionContext, SuggestionTotal } from '../types';
import { hasActiveEndeavours, CLASS_ENDEAVOURS, GENERAL_ENDEAVOURS } from '../../endeavours';
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
 * Class endeavours that resolve with a self-contained Test on a BARE
 * (non-specialised) basic skill the app can seed unambiguously — Study a Mark
 * (Perception), The Latest News (Gossip), Foment Dissent stage 1 (Gossip) — carry
 * a seeded `roll` that opens the existing RollDialog. The T5 General tier does the
 * same for the *Deft Steps, Light Fingers* criminal/gang downtime endeavours:
 * Gambling Den (Gamble), Whisper Campaign (Charm), Build Gang / Organising Crime
 * (Leadership), and Maintain Influence (Intimidate) are seeded; Black Market
 * (buy/sell branch), Plant Identities (Entertain (Acting) specialisation),
 * Establishing a Contact (GM-set), and Gaol Break (GM-gated, Extended) are
 * guidance-only. Everything guidance-only is navigate (no roll button), because
 * its RAW test is specialisation-dependent, player-chosen, GM-set, or
 * narrative/flat-mechanic — seeding would present a wrong, uneditable base target
 * (RollDialog's base target is read-only). The Deft Steps general endeavours are
 * open to all via the picker, but the assistant only *surfaces* them for a
 * Rogue-class character (a reuse of the already-tracked class, not an access gate
 * or an invented mechanic). The assistant never auto-rolls, auto-applies, or
 * auto-completes.
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
 * The *Deft Steps, Light Fingers* general downtime endeavours whose RAW
 * resolution is a self-contained Test on a single BARE basic skill row (verified
 * present in `BLANK_CHARACTER.bSkills`), so `resolveSeededTarget` hits the real
 * row and reflects advances. Keyed by the endeavour name as it appears in
 * `GENERAL_ENDEAVOURS`. Any Deft Steps general endeavour NOT in this table is
 * surfaced guidance-only (navigate, no roll) — see
 * `DEFT_GENERAL_ENDEAVOUR_CITATIONS` for the reason each is not seeded.
 *
 * `fallbackChar` mirrors the governing characteristic of that skill's bare row in
 * `BLANK_CHARACTER.bSkills` (Gamble→Int, Charm→Fel, Leadership→Fel,
 * Intimidate→S) so the Base Target is correct when the character lacks a
 * specialised row. Difficulties are the RAW book values; the Difficulty select in
 * the dialog lets the player adjust for circumstance. No invented TN.
 *
 * Black Market, Plant Identities, Establishing a Contact, and Gaol Break are
 * deliberately absent (guidance-only): Black Market branches on buy (Gossip) vs
 * sell (Haggle) so no single bare skill can be seeded; Plant Identities is a
 * specialisation test (Entertain (Acting)); Establishing a Contact is a GM-set
 * narrative step; Gaol Break is GM-gated, crime-severity-scaled, and Extended.
 */
const SEEDABLE_GENERAL_ENDEAVOURS: Record<
  string,
  { def: ReminderTest; difficulty: DifficultyLevel; citation: string; rollName: string }
> = {
  // deftsteps.md ~line 1716 (Gambling Den): "They must then make a Hard (-20)
  // Gamble Test." Gamble is a bare basic skill (c:'Int') in BLANK_CHARACTER.bSkills.
  'Gambling Den': {
    def: { kind: 'skill', skillName: 'Gamble', fallbackChar: 'Int' },
    difficulty: 'Hard',
    citation: 'Deft Steps § Gambling Den (~line 1716): Gambling Den (Hard −20 Gamble Test)',
    rollName: 'Gambling Den (Gamble)',
  },
  // deftsteps.md ~line 1733 (Whisper Campaign): "they must make a Hard (-20)
  // Charm Test." Charm is a bare basic skill (c:'Fel') in BLANK_CHARACTER.bSkills.
  'Whisper Campaign': {
    def: { kind: 'skill', skillName: 'Charm', fallbackChar: 'Fel' },
    difficulty: 'Hard',
    citation: 'Deft Steps § Whisper Campaign (~line 1733): Whisper Campaign (Hard −20 Charm Test)',
    rollName: 'Whisper Campaign (Charm)',
  },
  // deftsteps.md ~line 2202 (Build Gang): "provided you take a Challenging (+0)
  // Leadership Test." Leadership is a bare basic skill (c:'Fel') in BLANK_CHARACTER.bSkills.
  'Build Gang': {
    def: { kind: 'skill', skillName: 'Leadership', fallbackChar: 'Fel' },
    difficulty: 'Challenging',
    citation: 'Deft Steps § Build Gang (~line 2202): Build Gang (Challenging +0 Leadership Test)',
    rollName: 'Build Gang (Leadership)',
  },
  // deftsteps.md ~line 2215 (Organising Crime): "you must take a Challenging (+0)
  // Leadership Test." Leadership is a bare basic skill (c:'Fel') in BLANK_CHARACTER.bSkills.
  'Organising Crime': {
    def: { kind: 'skill', skillName: 'Leadership', fallbackChar: 'Fel' },
    difficulty: 'Challenging',
    citation: 'Deft Steps § Organising Crime (~line 2215): Organising Crime (Challenging +0 Leadership Test)',
    rollName: 'Organising Crime (Leadership)',
  },
  // deftsteps.md ~line 2229 (Maintain Influence): "you must take a Challenging
  // (+0) Intimidate Test." Intimidate is a bare basic skill (c:'S') in BLANK_CHARACTER.bSkills.
  'Maintain Influence': {
    def: { kind: 'skill', skillName: 'Intimidate', fallbackChar: 'S' },
    difficulty: 'Challenging',
    citation: 'Deft Steps § Maintain Influence (~line 2229): Maintain Influence (Challenging +0 Intimidate Test)',
    rollName: 'Maintain Influence (Intimidate)',
  },
};

/**
 * Guidance-only *Deft Steps* general endeavours: citation + the reason each is
 * NOT seeded (branchy, specialisation-dependent, GM-set, or Extended). The
 * failure-debt sentence of Gambling Den is truncated in the source markdown
 * (deftsteps.md ~line 1720 ends "…owe the house a debt equal to the stake for"
 * before an image break) — the Test and success path are complete and seeded;
 * the incomplete failure penalty is NOT invented (design FLAG 1).
 */
const DEFT_GENERAL_ENDEAVOUR_CITATIONS: Record<string, string> = {
  'Black Market':
    'Deft Steps § Black Market (~line 1710): Challenging +0 Gossip Test to buy, or Challenging +0 Haggle Test to sell — choose buy/sell first (two-skill branch), so resolve on the Endeavours page',
  'Plant Identities':
    'Deft Steps § Plant Identities (~line 1727): Difficult −10 Entertain (Acting) Test — a specialisation test; cost is money equal to your Income Endeavour × Standing (GM/formula-set)',
  'Establishing a Contact':
    'Deft Steps § Establishing a Contact (~line 1945): Difficult −10 Gossip Test + spend money equal to the Contact\u2019s status (GM-agreed) — a narrative GM step, resolve on the Endeavours page',
  'Gaol Break':
    'Deft Steps § Gaol Break (~line 3747): GM-gated Stealth or Sleight of Hand Test, difficulty scaled by the prisoner\u2019s crimes and usually Extended — resolve on the Endeavours page',
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

  // ── T5 — Deft Steps criminal/gang/gaol general endeavours (Rogue heuristic) ─
  // These supplement (Deft Steps, Light Fingers) general downtime endeavours are
  // open to any character via the picker (they are in GENERAL_ENDEAVOURS), but
  // they have no clean single tracked-state trigger like low-coin/unspent-XP. So
  // the assistant only *surfaces* them, as low-urgency options, for a Rogue-class
  // character (the already-tracked class read reused from T4) — a surfacing
  // heuristic, NOT a mechanic or an access gate (design Assistant-surfacing plan).
  // Seedable entries carry a roll on a single bare basic skill; branchy/GM-set
  // ones are guidance-only (navigate, no roll).
  if (className === 'Rogues') {
    const GEN_CAP = 2; // sibling to the T4 CLASS_CAP (local, not exported); value 2 matches it.
    // Deft Steps general endeavours in catalog order: everything the Deft Steps
    // seed/citation tables know about, read straight from GENERAL_ENDEAVOURS so
    // ordering follows the single source of truth.
    const deftGeneral = GENERAL_ENDEAVOURS.filter(
      name =>
        Object.hasOwn(SEEDABLE_GENERAL_ENDEAVOURS, name) ||
        Object.hasOwn(DEFT_GENERAL_ENDEAVOUR_CITATIONS, name),
    );
    let emittedGen = 0;
    for (const name of deftGeneral) {
      if (emittedGen >= GEN_CAP) break;
      if (emittedNames.has(name)) continue; // semantic dedupe guard
      emittedGen += 1;
      emittedNames.add(name);

      const seed = SEEDABLE_GENERAL_ENDEAVOURS[name];
      if (seed) {
        const { total, lines } = resolveSeededTarget(character, seed.def);
        const totals: SuggestionTotal[] = [
          { label: 'Base Target', display: String(total), lines },
        ];
        out.push({
          id: `endeavour:rec:gen:${slugify(name)}`,
          title: `${name} endeavour`,
          rationale: `A criminal/gang downtime endeavour (Deft Steps). ${seed.rollName} — roll the Test, then record the outcome on the Endeavours page.`,
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
          id: `endeavour:rec:gen:${slugify(name)}`,
          title: `${name} endeavour`,
          rationale: `A criminal/gang downtime endeavour (Deft Steps) — resolve it on the Endeavours page (GM-set or branching Test, so no roll is seeded).`,
          category: 'endeavour',
          urgency: 'info',
          action: { kind: 'navigate', page: 'endeavours' },
          citation: DEFT_GENERAL_ENDEAVOUR_CITATIONS[name],
        });
      }
    }
  }

  return out;
}
