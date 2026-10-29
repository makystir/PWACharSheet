import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { BLANK_CHARACTER } from '../../../../types/character';
import type { Character, CriticalWound } from '../../../../types/character';
import type { ActiveDisease } from '../../../diseases';
import type { SuggestionContext } from '../../types';
import { downtimeRecommendationSuggestions } from '../downtime-recommendations';
import { endeavourSuggestions } from '../endeavours';
import {
  hasActiveEndeavours,
  GENERAL_ENDEAVOURS,
  CLASS_ENDEAVOURS,
} from '../../../endeavours';
import { ENDEAVOUR_TEMPLATES } from '../../../endeavour-templates';
import { resolveReminderBaseTarget } from '../../../reminders-target';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return { ...structuredClone(BLANK_CHARACTER), ...overrides };
}

const CTX_PEACE: SuggestionContext = { inCombat: false };
const CTX_COMBAT: SuggestionContext = { inCombat: true };

function disease(diseaseName: string): ActiveDisease {
  return { id: 1, diseaseName, contracted: 0, notes: '' };
}

function critical(overrides: Partial<CriticalWound> = {}): CriticalWound {
  return {
    id: 1,
    timestamp: 0,
    location: 'Body',
    description: '',
    effects: '',
    duration: '',
    severity: 1,
    healed: false,
    ...overrides,
  };
}

function assertNoFunctions(value: unknown): void {
  if (typeof value === 'function') throw new Error('Found a function value');
  if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) assertNoFunctions(v);
  }
}

/** Set of every endeavour name a given character could legitimately be offered. */
function catalogFor(character: Character): Set<string> {
  const names = new Set<string>([
    ...GENERAL_ENDEAVOURS,
    ...ENDEAVOUR_TEMPLATES.map(t => t.type),
  ]);
  const key = character.class?.trim() ?? '';
  const classList = Object.hasOwn(CLASS_ENDEAVOURS, key) ? CLASS_ENDEAVOURS[key] : undefined;
  if (classList) for (const n of classList) names.add(n);
  return names;
}

/** The endeavour name a recommendation targets, derived from its title. */
function endeavourNameOf(title: string): string {
  return title.replace(/\s+endeavour$/i, '');
}

// ─── P1 — pure / deterministic / serializable ────────────────────────────────

describe('downtimeRecommendationSuggestions — purity (P1)', () => {
  it('is deterministic and serializable, tolerant of a frozen clone', () => {
    const character = makeCharacter({
      class: 'Rogues',
      xpCur: 100,
      wGC: 0,
      wSS: 0,
      diseases: [disease('Blood Rot')],
    });
    const frozen = Object.freeze(structuredClone(character));
    const out = downtimeRecommendationSuggestions(frozen, CTX_PEACE);
    expect(downtimeRecommendationSuggestions(structuredClone(frozen), CTX_PEACE)).toEqual(out);
    for (const s of out) {
      assertNoFunctions(s);
      expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    }
  });

  it('returns [] in combat', () => {
    const character = makeCharacter({ xpCur: 100, class: 'Rogues' });
    expect(downtimeRecommendationSuggestions(character, CTX_COMBAT)).toEqual([]);
  });

  it('returns [] when an endeavour is active (mutual exclusion)', () => {
    const active = makeCharacter({
      xpCur: 100,
      endeavours: [
        {
          id: 'p1',
          label: 'Downtime',
          slots: 1,
          entries: [{ id: 'e1', type: 'Income', notes: '', status: 'pending' }],
          statusWarning: false,
        },
      ],
    });
    expect(hasActiveEndeavours(active)).toBe(true);
    expect(downtimeRecommendationSuggestions(active, CTX_PEACE)).toEqual([]);
  });
});

// ─── P2 — catalog-only ───────────────────────────────────────────────────────

describe('downtimeRecommendationSuggestions — catalog-only (P2)', () => {
  it('every emitted endeavour name belongs to the catalog for arbitrary state', () => {
    const classArb = fc.oneof(
      fc.constantFrom(...Object.keys(CLASS_ENDEAVOURS)),
      fc.string(), // junk / unmatched classes
      fc.constant(''),
    );
    fc.assert(
      fc.property(
        fc.record({
          xpCur: fc.integer({ min: 0, max: 2000 }),
          wGC: fc.integer({ min: 0, max: 50 }),
          wSS: fc.integer({ min: 0, max: 50 }),
          wD: fc.integer({ min: 0, max: 50 }),
          wCur: fc.integer({ min: 0, max: 40 }),
          className: classArb,
          diseased: fc.boolean(),
        }),
        (a) => {
          const character = makeCharacter({
            xpCur: a.xpCur,
            wGC: a.wGC,
            wSS: a.wSS,
            wD: a.wD,
            wCur: a.wCur,
            class: a.className,
            diseases: a.diseased ? [disease('Blood Rot')] : [],
          });
          const catalog = catalogFor(character);
          const out = downtimeRecommendationSuggestions(character, CTX_PEACE);
          for (const s of out) {
            expect(catalog.has(endeavourNameOf(s.title))).toBe(true);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ─── P3 — Healing predicate iff ──────────────────────────────────────────────

describe('downtimeRecommendationSuggestions — Healing predicate (P3)', () => {
  it('healing appears iff wounded OR active critical OR active disease', () => {
    fc.assert(
      fc.property(
        fc.record({
          wCur: fc.integer({ min: -5, max: 40 }),
          sInit: fc.integer({ min: 0, max: 40 }),
          tInit: fc.integer({ min: 0, max: 40 }),
          wpInit: fc.integer({ min: 0, max: 40 }),
          hasCritical: fc.boolean(),
          hasDisease: fc.boolean(),
        }),
        (a) => {
          const chars = structuredClone(BLANK_CHARACTER.chars);
          chars.S = { i: a.sInit, a: 0, b: 0 };
          chars.T = { i: a.tInit, a: 0, b: 0 };
          chars.WP = { i: a.wpInit, a: 0, b: 0 };
          const character = makeCharacter({
            chars,
            wCur: a.wCur,
            criticalWounds: a.hasCritical ? [critical()] : [],
            diseases: a.hasDisease ? [disease('Blood Rot')] : [],
          });
          const out = downtimeRecommendationSuggestions(character, CTX_PEACE);
          const hasHealing = out.some(s => s.id === 'endeavour:rec:healing');

          // Max wounds is derived the same way the module does (Core p.36-37).
          const tb = Math.floor((a.tInit) / 10);
          const sb = Math.floor((a.sInit) / 10);
          const wpb = Math.floor((a.wpInit) / 10);
          // BLANK_CHARACTER species is '' → effectiveWoundsUseSB = stored (true),
          // multiplier 1, Hardy 0.
          const maxWounds = Math.max(0, sb + 2 * tb + wpb);
          const expected = a.wCur < maxWounds || a.hasCritical || a.hasDisease;
          expect(hasHealing).toBe(expected);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ─── P4 — mutual exclusion / distinct ids and names ──────────────────────────

describe('downtimeRecommendationSuggestions — mutual exclusion (P4)', () => {
  it('is empty whenever endeavourSuggestions is non-empty, and never collides with existing ids', () => {
    fc.assert(
      fc.property(
        fc.record({
          active: fc.boolean(),
          xpCur: fc.integer({ min: 0, max: 500 }),
          className: fc.constantFrom(...Object.keys(CLASS_ENDEAVOURS), ''),
        }),
        (a) => {
          const character = makeCharacter({
            xpCur: a.xpCur,
            class: a.className,
            wGC: 0,
            wSS: 0,
            endeavours: a.active
              ? [
                  {
                    id: 'p1',
                    label: 'Downtime',
                    slots: 1,
                    entries: [{ id: 'e1', type: 'Income', notes: '', status: 'pending' }],
                    statusWarning: false,
                  },
                ]
              : [],
          });
          const rec = downtimeRecommendationSuggestions(character, CTX_PEACE);
          const activeOut = endeavourSuggestions(character);
          // Never both non-empty.
          expect(rec.length > 0 && activeOut.length > 0).toBe(false);
          // No id collides with the other two endeavour modules.
          for (const s of rec) {
            expect(s.id).not.toBe('endeavour:active');
            expect(s.id).not.toBe('endeavour:available');
          }
          // Emitted ids are unique.
          const ids = rec.map(s => s.id);
          expect(new Set(ids).size).toBe(ids.length);
          // Emitted endeavour NAMES are distinct (semantic dedupe — Finding 3).
          const names = rec.map(s => endeavourNameOf(s.title));
          expect(new Set(names).size).toBe(names.length);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ─── P5 — citations present ──────────────────────────────────────────────────

describe('downtimeRecommendationSuggestions — citations (P5)', () => {
  it('every recommendation and every roll seed carries a non-empty citation', () => {
    const character = makeCharacter({
      class: 'Rogues',
      xpCur: 100,
      wGC: 0,
      wSS: 0,
      wCur: 0,
      diseases: [disease('Blood Rot')],
    });
    const out = downtimeRecommendationSuggestions(character, CTX_PEACE);
    expect(out.length).toBeGreaterThan(0);
    for (const s of out) {
      expect(typeof s.citation).toBe('string');
      expect((s.citation ?? '').length).toBeGreaterThan(0);
    }
  });
});

// ─── Unit — per-trigger behaviour ────────────────────────────────────────────

describe('downtimeRecommendationSuggestions — triggers', () => {
  it('T1 Wounded → Healing (guidance-only, navigate, no roll)', () => {
    const character = makeCharacter({ wCur: 1, chars: tenCharT(30) });
    const out = downtimeRecommendationSuggestions(character, CTX_PEACE);
    const s = out.find(x => x.id === 'endeavour:rec:healing');
    expect(s).toBeDefined();
    expect(s!.category).toBe('endeavour');
    expect(s!.action).toEqual({ kind: 'navigate', page: 'endeavours' });
    expect(s!.secondaryAction).toBeUndefined();
    expect(s!.totals).toBeUndefined();
  });

  it('T2 Low coin → Income + Banking (both guidance-only)', () => {
    const character = makeCharacter({ wGC: 0, wSS: 0, wD: 4, chars: tenCharT(30), wCur: 999 });
    const out = downtimeRecommendationSuggestions(character, CTX_PEACE);
    const income = out.find(x => x.id === 'endeavour:rec:income');
    const banking = out.find(x => x.id === 'endeavour:rec:banking');
    expect(income?.action).toEqual({ kind: 'navigate', page: 'endeavours' });
    expect(banking?.action).toEqual({ kind: 'navigate', page: 'endeavours' });
    // Coin fields echoed verbatim (no arithmetic).
    expect(income?.rationale).toContain('0 GC, 0 SS, 4 d');
  });

  it('T2 does not fire when the character holds gold or silver', () => {
    const character = makeCharacter({ wGC: 1, wSS: 0, chars: tenCharT(30), wCur: 999 });
    const out = downtimeRecommendationSuggestions(character, CTX_PEACE);
    expect(out.some(x => x.id === 'endeavour:rec:income')).toBe(false);
  });

  it('T3 Unspent XP → Training (guidance-only, category endeavour, distinct from learnable)', () => {
    const character = makeCharacter({ xpCur: 50, chars: tenCharT(30), wCur: 999, wGC: 5, wSS: 5 });
    const out = downtimeRecommendationSuggestions(character, CTX_PEACE);
    const s = out.find(x => x.id === 'endeavour:rec:training');
    expect(s).toBeDefined();
    expect(s!.category).toBe('endeavour');
    expect(s!.id).not.toBe('advancement:learnable');
    expect(s!.action).toEqual({ kind: 'navigate', page: 'endeavours' });
  });

  it('T3 does not fire at xpCur === 0', () => {
    const character = makeCharacter({ xpCur: 0, chars: tenCharT(30), wCur: 999, wGC: 5, wSS: 5 });
    const out = downtimeRecommendationSuggestions(character, CTX_PEACE);
    expect(out.some(x => x.id === 'endeavour:rec:training')).toBe(false);
  });

  it('T4 emits nothing for an empty/unmatched class', () => {
    const empty = makeCharacter({ class: '', chars: tenCharT(30), wCur: 999, wGC: 5, wSS: 5 });
    const junk = makeCharacter({ class: 'Nonexistent', chars: tenCharT(30), wCur: 999, wGC: 5, wSS: 5 });
    expect(downtimeRecommendationSuggestions(empty, CTX_PEACE).some(s => s.id.startsWith('endeavour:rec:class:'))).toBe(false);
    expect(downtimeRecommendationSuggestions(junk, CTX_PEACE).some(s => s.id.startsWith('endeavour:rec:class:'))).toBe(false);
  });
});

// ─── Unit — seeded rolls ─────────────────────────────────────────────────────

describe('downtimeRecommendationSuggestions — seeded rolls', () => {
  it('Study a Mark (Rogues) seeds a Perception roll with a correct Base Target total + breakdown', () => {
    const character = makeCharacter({ class: 'Rogues', chars: tenCharT(30), wCur: 999, wGC: 5, wSS: 5 });
    const out = downtimeRecommendationSuggestions(character, CTX_PEACE);
    const s = out.find(x => x.id === 'endeavour:rec:class:study-a-mark');
    expect(s).toBeDefined();
    expect(s!.action.kind).toBe('roll');
    if (s!.action.kind !== 'roll') return;
    expect(s!.action.test.difficulty).toBe('Challenging');
    expect(s!.action.test.def).toEqual({ kind: 'skill', skillName: 'Perception', fallbackChar: 'I' });
    expect(s!.secondaryAction).toEqual({ kind: 'navigate', page: 'endeavours' });

    const expected = resolveReminderBaseTarget(character, s!.action.test.def);
    const total = s!.totals?.[0];
    expect(total?.label).toBe('Base Target');
    expect(total?.display).toBe(String(expected));
    // The last breakdown line restates the total, so it parses back to the total.
    const last = total!.lines[total!.lines.length - 1];
    expect(last).toContain(String(expected));
  });

  it('Latest News (Rangers) and Foment Dissent (Peasants) seed Gossip with RAW difficulties', () => {
    const ranger = makeCharacter({ class: 'Rangers', chars: tenCharT(30), wCur: 999, wGC: 5, wSS: 5 });
    const rangerOut = downtimeRecommendationSuggestions(ranger, CTX_PEACE);
    const latest = rangerOut.find(x => x.id === 'endeavour:rec:class:latest-news');
    expect(latest?.action.kind).toBe('roll');
    if (latest && latest.action.kind === 'roll') {
      expect(latest.action.test.def).toEqual({ kind: 'skill', skillName: 'Gossip', fallbackChar: 'Fel' });
      expect(latest.action.test.difficulty).toBe('Challenging');
    }

    const peasant = makeCharacter({ class: 'Peasants', chars: tenCharT(30), wCur: 999, wGC: 5, wSS: 5 });
    const peasantOut = downtimeRecommendationSuggestions(peasant, CTX_PEACE);
    const foment = peasantOut.find(x => x.id === 'endeavour:rec:class:foment-dissent');
    expect(foment?.action.kind).toBe('roll');
    if (foment && foment.action.kind === 'roll') {
      expect(foment.action.test.def).toEqual({ kind: 'skill', skillName: 'Gossip', fallbackChar: 'Fel' });
      expect(foment.action.test.difficulty).toBe('Average');
    }
  });

  it('bare-skill correctness: trained Perception yields a target above the bare characteristic', () => {
    const chars = tenCharT(30);
    const trained = makeCharacter({ class: 'Rogues', chars, wCur: 999, wGC: 5, wSS: 5 });
    // Train Perception by +10.
    trained.bSkills = trained.bSkills.map(sk => (sk.n === 'Perception' ? { ...sk, a: 10 } : sk));
    const out = downtimeRecommendationSuggestions(trained, CTX_PEACE);
    const s = out.find(x => x.id === 'endeavour:rec:class:study-a-mark')!;
    if (s.action.kind !== 'roll') throw new Error('expected roll');
    const withSkill = resolveReminderBaseTarget(trained, s.action.test.def);
    // The bare I characteristic total (no skill advances) is strictly lower.
    const bareI = chars.I.i + chars.I.a + chars.I.b;
    expect(withSkill).toBe(bareI + 10);
    expect(withSkill).toBeGreaterThan(bareI);
  });

  it('malformed skill.c on a seeded row falls back to fallbackChar in the breakdown (no throw, no bogus label)', () => {
    const chars = tenCharT(30);
    const character = makeCharacter({ class: 'Rogues', chars, wCur: 999, wGC: 5, wSS: 5 });
    // Corrupt Perception's governing characteristic to a non-key.
    character.bSkills = character.bSkills.map(sk =>
      sk.n === 'Perception' ? { ...sk, c: 'ZZ' as unknown as typeof sk.c } : sk,
    );
    const out = downtimeRecommendationSuggestions(character, CTX_PEACE);
    const s = out.find(x => x.id === 'endeavour:rec:class:study-a-mark')!;
    const lines = s.totals![0].lines;
    // The first breakdown line names the fallback characteristic 'I', never 'ZZ'.
    expect(lines[0]).toContain('I ');
    expect(lines.join(' ')).not.toContain('ZZ');
  });
});

// ─── Unit — guidance-only class endeavours ───────────────────────────────────

describe('downtimeRecommendationSuggestions — guidance-only class endeavours', () => {
  it('Combat Training / Research Lore / Reputation never carry a roll action', () => {
    const cases: { cls: string; slug: string }[] = [
      { cls: 'Warriors', slug: 'combat-training' },
      { cls: 'Academics', slug: 'research-lore' },
      { cls: 'Nobles', slug: 'reputation' },
    ];
    for (const { cls, slug } of cases) {
      const character = makeCharacter({ class: cls, chars: tenCharT(30), wCur: 999, wGC: 5, wSS: 5 });
      const out = downtimeRecommendationSuggestions(character, CTX_PEACE);
      const s = out.find(x => x.id === `endeavour:rec:class:${slug}`);
      expect(s, `${cls} should surface ${slug}`).toBeDefined();
      expect(s!.action.kind).toBe('navigate');
      expect(s!.secondaryAction).toBeUndefined();
      expect(s!.totals).toBeUndefined();
    }
  });

  it('template/general guidance endeavours (Healing, Income, Banking, Training) never carry a roll', () => {
    const character = makeCharacter({ wCur: 0, chars: tenCharT(30), wGC: 0, wSS: 0, xpCur: 100 });
    const out = downtimeRecommendationSuggestions(character, CTX_PEACE);
    for (const id of ['endeavour:rec:healing', 'endeavour:rec:income', 'endeavour:rec:banking', 'endeavour:rec:training']) {
      const s = out.find(x => x.id === id)!;
      expect(s.action.kind).toBe('navigate');
    }
  });
});

// ─── Unit — Deft Steps general downtime endeavours (T5, Rogue heuristic) ─────

describe('downtimeRecommendationSuggestions — Deft Steps general endeavours (T5)', () => {
  it('surfaces up to 2 Deft Steps general endeavours for a Rogue, in catalog order', () => {
    // Only T5 fires: healthy, has coin, no XP → T1–T4 suppressed; class Rogues
    // has one seedable class endeavour (Study a Mark) which still emits under T4.
    const character = makeCharacter({ class: 'Rogues', chars: tenCharT(30), wCur: 999, wGC: 5, wSS: 5, xpCur: 0 });
    const out = downtimeRecommendationSuggestions(character, CTX_PEACE);
    const gen = out.filter(s => s.id.startsWith('endeavour:rec:gen:'));
    expect(gen.length).toBe(2);
    // GENERAL_ENDEAVOURS order places Black Market before Gambling Den.
    expect(gen[0].id).toBe('endeavour:rec:gen:black-market');
    expect(gen[1].id).toBe('endeavour:rec:gen:gambling-den');
  });

  it('does NOT surface Deft Steps general endeavours for a non-Rogue class', () => {
    for (const cls of ['Warriors', 'Academics', '', 'Nonexistent']) {
      const character = makeCharacter({ class: cls, chars: tenCharT(30), wCur: 999, wGC: 5, wSS: 5, xpCur: 0 });
      const out = downtimeRecommendationSuggestions(character, CTX_PEACE);
      expect(out.some(s => s.id.startsWith('endeavour:rec:gen:'))).toBe(false);
    }
  });

  it('Black Market (first in order) is guidance-only (navigate, no roll)', () => {
    const character = makeCharacter({ class: 'Rogues', chars: tenCharT(30), wCur: 999, wGC: 5, wSS: 5, xpCur: 0 });
    const out = downtimeRecommendationSuggestions(character, CTX_PEACE);
    const bm = out.find(s => s.id === 'endeavour:rec:gen:black-market');
    expect(bm).toBeDefined();
    expect(bm!.action).toEqual({ kind: 'navigate', page: 'endeavours' });
    expect(bm!.secondaryAction).toBeUndefined();
    expect(bm!.totals).toBeUndefined();
    expect((bm!.citation ?? '').length).toBeGreaterThan(0);
  });

  it('Gambling Den (surfaced seedable) carries a Gamble roll with a correct Base Target + breakdown', () => {
    const character = makeCharacter({ class: 'Rogues', chars: tenCharT(30), wCur: 999, wGC: 5, wSS: 5, xpCur: 0 });
    const out = downtimeRecommendationSuggestions(character, CTX_PEACE);
    const gd = out.find(s => s.id === 'endeavour:rec:gen:gambling-den');
    expect(gd).toBeDefined();
    expect(gd!.action.kind).toBe('roll');
    if (gd!.action.kind !== 'roll') return;
    expect(gd!.action.test.def).toEqual({ kind: 'skill', skillName: 'Gamble', fallbackChar: 'Int' });
    expect(gd!.action.test.difficulty).toBe('Hard');
    expect(gd!.secondaryAction).toEqual({ kind: 'navigate', page: 'endeavours' });
    const expected = resolveReminderBaseTarget(character, gd!.action.test.def);
    expect(gd!.totals?.[0].label).toBe('Base Target');
    expect(gd!.totals?.[0].display).toBe(String(expected));
    expect(gd!.totals?.[0].lines.length).toBeGreaterThan(0);
  });

  it('guidance-only Deft Steps endeavours are in the catalog but never seeded', () => {
    // Black Market (buy/sell branch), Plant Identities (specialisation),
    // Establishing a Contact (GM-set), Gaol Break (GM-gated/Extended) must exist
    // in GENERAL_ENDEAVOURS (picker) but carry no roll when surfaced.
    for (const n of ['Black Market', 'Plant Identities', 'Establishing a Contact', 'Gaol Break']) {
      expect(GENERAL_ENDEAVOURS).toContain(n);
    }
    const character = makeCharacter({ class: 'Rogues', chars: tenCharT(30), wCur: 999, wGC: 5, wSS: 5, xpCur: 0 });
    const out = downtimeRecommendationSuggestions(character, CTX_PEACE);
    for (const s of out.filter(x => x.id.startsWith('endeavour:rec:gen:'))) {
      if (s.id === 'endeavour:rec:gen:black-market') {
        expect(s.action.kind).toBe('navigate');
      }
    }
  });

  it('T5 is suppressed in combat and when an endeavour is active', () => {
    const rogue = makeCharacter({ class: 'Rogues', chars: tenCharT(30), wCur: 999, wGC: 5, wSS: 5, xpCur: 0 });
    expect(downtimeRecommendationSuggestions(rogue, CTX_COMBAT)).toEqual([]);
    const active = makeCharacter({
      class: 'Rogues',
      chars: tenCharT(30),
      wCur: 999,
      wGC: 5,
      wSS: 5,
      xpCur: 0,
      endeavours: [
        {
          id: 'p1',
          label: 'Downtime',
          slots: 1,
          entries: [{ id: 'e1', type: 'Black Market', notes: '', status: 'pending' }],
          statusWarning: false,
        },
      ],
    });
    expect(downtimeRecommendationSuggestions(active, CTX_PEACE).some(s => s.id.startsWith('endeavour:rec:gen:'))).toBe(false);
  });
});

// ─── Unit — emission caps and ordering ───────────────────────────────────────

describe('downtimeRecommendationSuggestions — caps', () => {
  it('emits at most 6 suggestions and caps class surfacing at 2 (catalog order)', () => {
    // All triggers fire: wounded + no coin + XP + a class with >2 endeavours.
    const character = makeCharacter({
      class: 'Warriors',
      wCur: 0,
      chars: tenCharT(30),
      wGC: 0,
      wSS: 0,
      xpCur: 100,
      diseases: [disease('Blood Rot')],
    });
    const out = downtimeRecommendationSuggestions(character, CTX_PEACE);
    expect(out.length).toBeLessThanOrEqual(6);
    const classItems = out.filter(s => s.id.startsWith('endeavour:rec:class:'));
    expect(classItems.length).toBe(2);
    // Warriors catalog order begins with Combat Training, Drill.
    expect(classItems[0].id).toBe('endeavour:rec:class:combat-training');
    expect(classItems[1].id).toBe('endeavour:rec:class:drill');
  });

  it('all navigate actions route only to endeavours:', () => {
    const character = makeCharacter({
      class: 'Rogues',
      wCur: 0,
      chars: tenCharT(30),
      wGC: 0,
      wSS: 0,
      xpCur: 100,
    });
    const out = downtimeRecommendationSuggestions(character, CTX_PEACE);
    for (const s of out) {
      for (const a of [s.action, s.secondaryAction]) {
        if (a && a.kind === 'navigate') {
          expect(a.page).toBe('endeavours');
          expect(a.subTab ?? null).toBeNull();
        }
      }
    }
  });
});

/** A chars block with every characteristic initial = n (so wound max is nonzero). */
function tenCharT(n: number): Character['chars'] {
  const chars = structuredClone(BLANK_CHARACTER.chars);
  for (const k of Object.keys(chars) as (keyof Character['chars'])[]) {
    chars[k] = { i: n, a: 0, b: 0 };
  }
  return chars;
}
