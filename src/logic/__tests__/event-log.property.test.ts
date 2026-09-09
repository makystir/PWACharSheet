import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  appendEvent,
  filterByCategory,
  normaliseEventLog,
  EVENT_LOG_CAP,
} from '../event-log';
import type { AppendEventInput } from '../event-log';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, LogCategory, LogEvent } from '../../types/character';

// ─── Generators ─────────────────────────────────────────────────────────────

const arbCategory: fc.Arbitrary<LogCategory> = fc.constantFrom(
  'roll',
  'advancement',
  'combat',
  'wealth',
  'condition',
  'session',
  'system',
);

const arbAppendInput: fc.Arbitrary<AppendEventInput> = fc.record({
  category: arbCategory,
  type: fc.string({ minLength: 1, maxLength: 30 }),
  summary: fc.string({ minLength: 0, maxLength: 60 }),
  payload: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 10 }),
    fc.oneof(fc.string(), fc.integer(), fc.boolean()),
  ),
});

/**
 * A single well-formed LogEvent (used by Property 3 to exercise `filterByCategory`
 * and `normaliseEventLog` directly, without going through `appendEvent`).
 */
const arbLogEvent: fc.Arbitrary<LogEvent> = fc.record({
  id: fc.uuid(),
  timestamp: fc.integer({ min: 0, max: 4_102_444_800_000 }),
  category: arbCategory,
  type: fc.string({ minLength: 1, maxLength: 30 }),
  summary: fc.string({ minLength: 0, maxLength: 60 }),
  payload: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 10 }),
    fc.oneof(fc.string(), fc.integer(), fc.boolean()),
  ),
});

/** A fresh base character for each run (deep-ish clone of BLANK_CHARACTER). */
function makeBaseCharacter(): Character {
  return {
    ...BLANK_CHARACTER,
    eventLog: [],
  };
}

// ─── Property Tests ───────────────────────────────────────────────────────────

describe('Feature: unified-event-log — Log_Service', () => {
  // Feature: unified-event-log, Property 1: appendEvent is immutable, unique-id, timestamped, order-preserving
  describe('Property 1: appendEvent is immutable, unique-id, timestamped, order-preserving', () => {
    /**
     * **Validates: Requirements 2.2, 2.3, 2.4, 2.5**
     *
     * For any sequence of appends (kept below the cap), appendEvent must:
     *  - not mutate the input character (returns a new value) — Req 2.4
     *  - assign every event a unique id — Req 2.2
     *  - set each appended event's timestamp — Req 2.3
     *  - preserve append order in the event log — Req 2.5
     */

    it('does not mutate the input character across a sequence of appends', () => {
      fc.assert(
        fc.property(
          // Keep below EVENT_LOG_CAP so rotation never drops events (order/uniqueness scope).
          fc.array(arbAppendInput, { minLength: 0, maxLength: EVENT_LOG_CAP - 1 }),
          (inputs) => {
            let character = makeBaseCharacter();

            for (const input of inputs) {
              const before = character;
              const beforeLogSnapshot = before.eventLog ?? [];
              const beforeLength = beforeLogSnapshot.length;

              const next = appendEvent(before, input);

              // A NEW character value is returned (Req 2.4).
              expect(next).not.toBe(before);
              // The previous character's event log reference is untouched...
              expect(before.eventLog).toBe(beforeLogSnapshot);
              // ...and unchanged in length (no in-place push).
              expect((before.eventLog ?? []).length).toBe(beforeLength);

              character = next;
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('assigns a unique id to every appended event', () => {
      fc.assert(
        fc.property(
          fc.array(arbAppendInput, { minLength: 1, maxLength: EVENT_LOG_CAP - 1 }),
          (inputs) => {
            let character = makeBaseCharacter();

            for (const input of inputs) {
              character = appendEvent(character, input);
            }

            const log = character.eventLog ?? [];
            const ids = log.map((e) => e.id);
            const uniqueIds = new Set(ids);

            // Every id is present and unique (Req 2.2).
            expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
            expect(uniqueIds.size).toBe(ids.length);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('sets a numeric timestamp on each appended event', () => {
      fc.assert(
        fc.property(
          fc.array(arbAppendInput, { minLength: 1, maxLength: EVENT_LOG_CAP - 1 }),
          (inputs) => {
            const before = Date.now();
            let character = makeBaseCharacter();

            for (const input of inputs) {
              character = appendEvent(character, input);
            }
            const after = Date.now();

            const log = character.eventLog ?? [];
            for (const event of log) {
              // Timestamp is set to the time of the append (Req 2.3).
              expect(typeof event.timestamp).toBe('number');
              expect(Number.isFinite(event.timestamp)).toBe(true);
              expect(event.timestamp).toBeGreaterThanOrEqual(before);
              expect(event.timestamp).toBeLessThanOrEqual(after);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('preserves append order in the event log (below the cap)', () => {
      fc.assert(
        fc.property(
          fc.array(arbAppendInput, { minLength: 0, maxLength: EVENT_LOG_CAP - 1 }),
          (inputs) => {
            let character = makeBaseCharacter();

            for (const input of inputs) {
              character = appendEvent(character, input);
            }

            const log = character.eventLog ?? [];

            // Below the cap, every appended event is retained, oldest-first (Req 2.5).
            expect(log).toHaveLength(inputs.length);
            for (let i = 0; i < inputs.length; i++) {
              expect(log[i].category).toBe(inputs[i].category);
              expect(log[i].type).toBe(inputs[i].type);
              expect(log[i].summary).toBe(inputs[i].summary);
            }

            // Timestamps are non-decreasing in stored (append) order.
            for (let i = 1; i < log.length; i++) {
              expect(log[i].timestamp).toBeGreaterThanOrEqual(log[i - 1].timestamp);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: unified-event-log, Property 2: Rotation bounds length and retains the most recent events
  describe('Property 2: Rotation bounds length and retains the most recent events', () => {
    /**
     * **Validates: Requirements 3.2, 3.3, 3.4**
     *
     * For any sequence of appends whose total exceeds EVENT_LOG_CAP, appendEvent
     * (via rotate) must:
     *  - keep the Event_Log length ≤ EVENT_LOG_CAP after every append — Req 3.4
     *  - remove the oldest events so length equals the cap once exceeded — Req 3.2
     *  - retain exactly the most-recent `cap` events by insertion order — Req 3.3
     *
     * To make "most-recent cap by insertion order" verifiable, each appended event
     * carries its 0-based insertion index in `type` (as `idx.<n>`) and `payload.idx`.
     * After the full sequence, the retained events' indices must be exactly the last
     * `cap` indices, in order.
     */

    /**
     * Build a distinctly-tagged append input for insertion position `idx`.
     * The base arbitrary supplies category/summary/payload; we overwrite `type`
     * and stamp `payload.idx` so each event is uniquely identifiable by position.
     */
    function taggedInput(base: AppendEventInput, idx: number): AppendEventInput {
      return {
        ...base,
        type: `idx.${idx}`,
        summary: `${base.summary} #${idx}`,
        payload: { ...base.payload, idx },
      };
    }

    it('never lets the log exceed the cap after any append (length bound)', () => {
      fc.assert(
        fc.property(
          // Longer than the cap so rotation is exercised; bounded to keep runs fast.
          fc.array(arbAppendInput, {
            minLength: EVENT_LOG_CAP + 1,
            maxLength: EVENT_LOG_CAP + 60,
          }),
          (inputs) => {
            let character = makeBaseCharacter();

            for (let i = 0; i < inputs.length; i++) {
              character = appendEvent(character, taggedInput(inputs[i], i));
              const log = character.eventLog ?? [];
              // AT ALL TIMES after an append, length ≤ cap (Req 3.4).
              expect(log.length).toBeLessThanOrEqual(EVENT_LOG_CAP);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('trims to exactly the cap and retains the most-recent events by insertion order', () => {
      fc.assert(
        fc.property(
          fc.array(arbAppendInput, {
            minLength: EVENT_LOG_CAP + 1,
            maxLength: EVENT_LOG_CAP + 60,
          }),
          (inputs) => {
            let character = makeBaseCharacter();

            for (let i = 0; i < inputs.length; i++) {
              character = appendEvent(character, taggedInput(inputs[i], i));
            }

            const log = character.eventLog ?? [];

            // Once the sequence exceeds the cap, length is trimmed to exactly the cap (Req 3.2).
            expect(log).toHaveLength(EVENT_LOG_CAP);

            // The retained events are the most-recent `cap` by insertion order (Req 3.3):
            // indices must be exactly [total - cap, ..., total - 1], in order.
            const total = inputs.length;
            const expectedFirstIdx = total - EVENT_LOG_CAP;
            const retainedIndices = log.map((e) => e.payload.idx as number);

            for (let i = 0; i < retainedIndices.length; i++) {
              expect(retainedIndices[i]).toBe(expectedFirstIdx + i);
            }

            // The oldest surviving and newest events confirm the trim boundary.
            expect(log[0].type).toBe(`idx.${expectedFirstIdx}`);
            expect(log[log.length - 1].type).toBe(`idx.${total - 1}`);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: unified-event-log, Property 3: Filter and normalise correctness
  describe('Property 3: Filter and normalise correctness', () => {
    /**
     * **Validates: Requirements 8.3, 8.4, 10.1, 11.3**
     *
     * `filterByCategory` (Req 8.3, 8.4):
     *  - an empty category set is the "no filter" identity → returns all events
     *  - a non-empty set returns exactly the events whose category is selected,
     *    equal to a manual filter over the same set, preserving order
     *
     * `normaliseEventLog` (Req 10.1, 11.3):
     *  - undefined / non-array input → `[]` (absent or malformed persisted logs)
     *  - oversized input (longer than the cap) → trimmed to exactly the cap,
     *    retaining the most-recent events (tail of the oldest-first store)
     */

    it('filterByCategory: empty set is the identity (returns all events, order preserved)', () => {
      fc.assert(
        fc.property(fc.array(arbLogEvent, { maxLength: 60 }), (events) => {
          // Empty set → "no filter": every event is returned, in the same order (Req 8.4).
          const emptyResult = filterByCategory(events, new Set<LogCategory>());
          expect(emptyResult).toEqual(events);

          // Undefined set behaves the same (also "no filter").
          const undefinedResult = filterByCategory(events, undefined);
          expect(undefinedResult).toEqual(events);

          // Returns a new array copy, never the same reference (pure, non-aliasing).
          expect(emptyResult).not.toBe(events);
          expect(undefinedResult).not.toBe(events);
        }),
        { numRuns: 100 },
      );
    });

    it('filterByCategory: single/multi-category subsets equal a manual filter over the same set', () => {
      fc.assert(
        fc.property(
          fc.array(arbLogEvent, { maxLength: 60 }),
          // A non-empty selection of one or more categories.
          fc.uniqueArray(arbCategory, { minLength: 1, maxLength: 7 }),
          (events, selectedCategories) => {
            const categorySet = new Set<LogCategory>(selectedCategories);

            const result = filterByCategory(events, categorySet);

            // Equal to a manual filter over the same set, preserving order (Req 8.3).
            const manual = events.filter((e) => categorySet.has(e.category));
            expect(result).toEqual(manual);

            // Every returned event's category is in the selected set, and nothing
            // that matches is dropped.
            expect(result.every((e) => categorySet.has(e.category))).toBe(true);
            expect(result).toHaveLength(manual.length);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('normaliseEventLog: undefined / non-array input becomes an empty array', () => {
      fc.assert(
        fc.property(
          // A grab-bag of non-array values a malformed persisted/imported log might be.
          fc.oneof(
            fc.constant(undefined),
            fc.constant(null),
            fc.string(),
            fc.integer(),
            fc.boolean(),
            fc.dictionary(fc.string(), fc.anything()),
          ),
          (bad) => {
            // Non-array/undefined → `[]` (Req 10.1). Cast mirrors the defensive
            // runtime input this guard exists for.
            const result = normaliseEventLog(bad as unknown as LogEvent[] | undefined);
            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('normaliseEventLog: within-cap input is preserved; oversized input is capped to the most-recent EVENT_LOG_CAP', () => {
      fc.assert(
        fc.property(
          fc.array(arbLogEvent, { maxLength: EVENT_LOG_CAP + 60 }),
          (events) => {
            const result = normaliseEventLog(events);

            if (events.length <= EVENT_LOG_CAP) {
              // Within the cap: retained verbatim (Req 10.1).
              expect(result).toEqual(events);
            } else {
              // Oversized: trimmed to exactly the cap (Req 11.3)...
              expect(result).toHaveLength(EVENT_LOG_CAP);
              // ...retaining the most-recent events — the tail of the oldest-first store.
              expect(result).toEqual(events.slice(events.length - EVENT_LOG_CAP));
            }

            // Result never exceeds the cap regardless of input size.
            expect(result.length).toBeLessThanOrEqual(EVENT_LOG_CAP);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
