import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { WildernessJourney } from '../../../types/character';
import {
  deriveStageCount,
  emptyJourney,
  journeyReducer,
} from '../journey-state';
import type { JourneyEvent } from '../types';

// ─── Generators ──────────────────────────────────────────────────────────────

/** A small pool of ids so events frequently hit live stages/members. */
const arbId = fc.constantFrom('a', 'b', 'c', 'd', 'e', 'missing');

const arbEvent: fc.Arbitrary<JourneyEvent> = fc.oneof(
  fc.record({ name: fc.string(), plannedStages: fc.integer({ min: -5, max: 20 }) })
    .map<JourneyEvent>((r) => ({ kind: 'createJourney', ...r })),
  fc.record({
    name: fc.option(fc.string(), { nil: undefined }),
    origin: fc.option(fc.string(), { nil: undefined }),
    destination: fc.option(fc.string(), { nil: undefined }),
    plannedStages: fc.option(fc.oneof(fc.integer({ min: -5, max: 20 }), fc.constant(NaN)), { nil: undefined }),
    planningEndeavour: fc.option(fc.string(), { nil: undefined }),
    planningSL: fc.option(fc.oneof(fc.integer({ min: -5, max: 20 }), fc.constant(NaN)), { nil: undefined }),
  }).map<JourneyEvent>((patch) => ({ kind: 'setMeta', patch })),
  fc.constant<JourneyEvent>({ kind: 'addStage' }),
  arbId.map<JourneyEvent>((stageId) => ({ kind: 'removeStage', stageId })),
  fc.string().map<JourneyEvent>((name) => ({ kind: 'addRosterMember', name })),
  fc.record({ memberId: arbId, name: fc.string() })
    .map<JourneyEvent>((r) => ({ kind: 'renameRosterMember', ...r })),
  arbId.map<JourneyEvent>((memberId) => ({ kind: 'removeRosterMember', memberId })),
  fc.record({
    stageId: arbId,
    memberId: arbId,
    slot: fc.constantFrom<'travel' | 'camp'>('travel', 'camp'),
    value: fc.string(),
  }).map<JourneyEvent>((r) => ({ kind: 'setStageEndeavour', ...r })),
  fc.record({ stageId: arbId, notes: fc.string() })
    .map<JourneyEvent>((r) => ({ kind: 'setStageNotes', ...r })),
  fc.record({ stageId: arbId, memberId: arbId, notes: fc.string() })
    .map<JourneyEvent>((r) => ({ kind: 'setMemberNotes', ...r })),
  fc.record({ delta: fc.constantFrom<1 | -1>(1, -1), reason: fc.string() })
    .map<JourneyEvent>((r) => ({ kind: 'adjustStageCount', ...r })),
  arbId.map<JourneyEvent>((adjustmentId) => ({ kind: 'removeStageCountAdjustment', adjustmentId })),
  fc.constant<JourneyEvent>({ kind: 'deleteJourney' }),
);

/** Deep-freeze helper so purity violations throw. */
function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === 'object') {
    Object.values(obj).forEach((v) => deepFreeze(v));
    Object.freeze(obj);
  }
  return obj;
}

/** Run a sequence of events from a null start, returning the final journey. */
function run(events: JourneyEvent[]): WildernessJourney | null {
  let j: WildernessJourney | null = null;
  for (const e of events) j = journeyReducer(j, e);
  return j;
}

/**
 * Replace all generated ids with positional placeholders so two independent runs
 * (which mint different random UUIDs) can be compared for structural equality.
 */
function normalizeIds(j: WildernessJourney | null): WildernessJourney | null {
  if (!j) return j;
  const memberIndex = new Map<string, string>();
  j.roster.forEach((m, i) => memberIndex.set(m.id, `member-${i}`));
  return {
    ...j,
    roster: j.roster.map((m, i) => ({ ...m, id: `member-${i}` })),
    stageAdjustments: j.stageAdjustments.map((a, i) => ({ ...a, id: `adj-${i}` })),
    stages: j.stages.map((s, i) => ({
      ...s,
      id: `stage-${i}`,
      records: s.records.map((r) => ({ ...r, memberId: memberIndex.get(r.memberId) ?? r.memberId })),
    })),
  };
}

describe('journeyReducer — properties', () => {
  it('Purity: never throws and never mutates a frozen input', () => {
    fc.assert(
      fc.property(fc.array(arbEvent, { maxLength: 30 }), arbEvent, (setup, e) => {
        const base = run(setup);
        const frozen = base === null ? null : deepFreeze(structuredClone(base));
        expect(() => journeyReducer(frozen, e)).not.toThrow();
      }),
    );
  });

  it('Determinism (modulo generated ids): structurally-equal inputs produce the same shape', () => {
    // The reducer is deterministic given its UUID source; the only
    // non-determinism is the random ids minted by addStage/addRosterMember/
    // adjustStageCount (by design, matching every other id-generating reducer in
    // the app). Normalise ids positionally before comparing structure.
    fc.assert(
      fc.property(fc.array(arbEvent, { maxLength: 20 }), (events) => {
        const a = normalizeIds(run(events));
        const b = normalizeIds(run(events));
        expect(a).toEqual(b);
      }),
    );
  });

  it('Stage-count total is never negative after any event sequence', () => {
    fc.assert(
      fc.property(fc.array(arbEvent, { maxLength: 40 }), (events) => {
        const j = run(events);
        if (j) expect(deriveStageCount(j).total).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  it('Count identity: total === max(0, planned + Σ deltas)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.array(fc.constantFrom<1 | -1>(1, -1), { maxLength: 30 }),
        (planned, deltas) => {
          let j: WildernessJourney | null = journeyReducer(null, {
            kind: 'createJourney',
            name: 'x',
            plannedStages: planned,
          });
          for (const d of deltas) {
            j = journeyReducer(j, { kind: 'adjustStageCount', delta: d, reason: '' });
          }
          const sum = deltas.reduce((s, d) => s + d, 0);
          expect(deriveStageCount(j!).total).toBe(Math.max(0, planned + sum));
        },
      ),
    );
  });

  it('Add/remove Stage round-trip restores the prior stages (ids aside), labels 1..n', () => {
    fc.assert(
      fc.property(fc.array(arbEvent, { maxLength: 20 }), (setup) => {
        let j = run([{ kind: 'createJourney', name: 'x', plannedStages: 0 }, ...setup]);
        if (!j) return;
        const before = j.stages.map((s) => ({ label: s.label, records: s.records, notes: s.notes }));
        j = journeyReducer(j, { kind: 'addStage' });
        const addedId = j!.stages[j!.stages.length - 1].id;
        j = journeyReducer(j, { kind: 'removeStage', stageId: addedId });
        const after = j!.stages.map((s) => ({ label: s.label, records: s.records, notes: s.notes }));
        expect(after).toEqual(before);
        // Labels are 1..n with no gaps.
        j!.stages.forEach((s, i) => expect(s.label).toBe(String(i + 1)));
      }),
    );
  });

  it('Counter independence: addStage/removeStage never change the derived total; adjust never changes stages.length', () => {
    fc.assert(
      fc.property(fc.array(arbEvent, { maxLength: 20 }), (setup) => {
        const j = run([{ kind: 'createJourney', name: 'x', plannedStages: 3 }, ...setup]);
        if (!j) return;
        const totalBefore = deriveStageCount(j).total;
        const afterAdd = journeyReducer(j, { kind: 'addStage' })!;
        expect(deriveStageCount(afterAdd).total).toBe(totalBefore);
        const stagesBefore = j.stages.length;
        const afterAdjust = journeyReducer(j, { kind: 'adjustStageCount', delta: 1, reason: '' })!;
        expect(afterAdjust.stages.length).toBe(stagesBefore);
      }),
    );
  });

  it('Referential consistency: after removeRosterMember no Stage references that member', () => {
    fc.assert(
      fc.property(fc.array(arbEvent, { maxLength: 30 }), (setup) => {
        const j = run([{ kind: 'createJourney', name: 'x', plannedStages: 0 }, ...setup]);
        if (!j || j.roster.length === 0) return;
        const victim = j.roster[0].id;
        const after = journeyReducer(j, { kind: 'removeRosterMember', memberId: victim })!;
        expect(after.roster.some((m) => m.id === victim)).toBe(false);
        for (const s of after.stages) {
          expect(s.records.some((r) => r.memberId === victim)).toBe(false);
        }
      }),
    );
  });

  it('createJourney on a non-null journey is a no-op; deleteJourney yields null', () => {
    fc.assert(
      fc.property(fc.array(arbEvent, { maxLength: 20 }), (setup) => {
        const j = run([{ kind: 'createJourney', name: 'x', plannedStages: 2 }, ...setup]);
        if (j) {
          const again = journeyReducer(j, { kind: 'createJourney', name: 'y', plannedStages: 99 });
          expect(again).toBe(j); // unchanged identity (no-op)
          expect(journeyReducer(j, { kind: 'deleteJourney' })).toBeNull();
        }
      }),
    );
  });

  it('setMeta with NaN plannedStages/planningSL is a no-op on those fields', () => {
    const base = emptyJourney('x', 5);
    const withSL = journeyReducer(base, { kind: 'setMeta', patch: { planningSL: 3 } })!;
    const afterNaN = journeyReducer(withSL, {
      kind: 'setMeta',
      patch: { plannedStages: NaN, planningSL: NaN },
    })!;
    expect(afterNaN.plannedStages).toBe(5);
    expect(afterNaN.planningSL).toBe(3);
  });
});
