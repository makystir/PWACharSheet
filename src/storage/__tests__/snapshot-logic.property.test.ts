import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  seqsToEvict,
  detectDiscrepancy,
  type SnapshotSummary,
} from '../snapshot-logic';

/**
 * Property tests for the two pure auto-backup helpers (auto-backup design §9,
 * tests 1 & 3). Iteration counts are kept modest to avoid parallel-load pressure.
 */

/** Build a strictly-ascending deduplicated seq array of a given length. */
function ascendingSeqs(count: number): fc.Arbitrary<number[]> {
  return fc
    .uniqueArray(fc.integer({ min: 1, max: 100_000 }), {
      minLength: count,
      maxLength: count,
    })
    .map((arr) => [...arr].sort((a, b) => a - b));
}

describe('seqsToEvict (ring policy)', () => {
  it('retains exactly the last N by seq, never evicts the max, and keeps |retained| <= N', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 8 }),
        fc.integer({ min: 0, max: 20 }),
        (ringSize, extra) => {
          const total = ringSize + extra;
          return fc.assert(
            fc.property(ascendingSeqs(total), (seqs) => {
              const evict = seqsToEvict(seqs, ringSize);
              const evictSet = new Set(evict);
              const retained = seqs.filter((s) => !evictSet.has(s));

              // |retained| <= N
              expect(retained.length).toBeLessThanOrEqual(ringSize);

              // retained is exactly the last N by seq
              const expectedRetained = seqs.slice(Math.max(0, total - ringSize));
              expect(retained).toEqual(expectedRetained);

              // the newest (max) seq is never evicted
              const maxSeq = seqs[seqs.length - 1];
              expect(evictSet.has(maxSeq)).toBe(false);
            }),
            { numRuns: 20 },
          );
        },
      ),
      { numRuns: 20 },
    );
  });

  it('returns [] when len <= ringSize', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 8 }),
        (ringSize) => {
          return fc.assert(
            fc.property(
              fc.integer({ min: 0, max: ringSize }),
              (len) =>
                fc.assert(
                  fc.property(ascendingSeqs(len), (seqs) => {
                    expect(seqsToEvict(seqs, ringSize)).toEqual([]);
                  }),
                  { numRuns: 10 },
                ),
            ),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 10 },
    );
  });
});

describe('detectDiscrepancy (launch predicate)', () => {
  it('null snapshot ⇒ no discrepancy', () => {
    fc.assert(
      fc.property(fc.array(fc.string()), (liveIds) => {
        expect(detectDiscrepancy({ characterIds: liveIds }, null)).toEqual({
          discrepancy: false,
        });
      }),
      { numRuns: 50 },
    );
  });

  it('live-empty: empty live + non-empty snapshot ⇒ reason live-empty', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 6 }),
        fc.string(),
        (snapIds, exportedAt) => {
          const snap: SnapshotSummary = { characterIds: snapIds, exportedAt };
          const result = detectDiscrepancy({ characterIds: [] }, snap);
          expect(result.discrepancy).toBe(true);
          if (result.discrepancy) {
            expect(result.reason).toBe('live-empty');
            expect(result.snapshotExportedAt).toBe(exportedAt);
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it('live-missing-ids: snapshot has an id live lacks (live non-empty) ⇒ reason live-missing-ids', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
        fc.string({ minLength: 1 }).map((s) => `missing-${s}`),
        fc.string(),
        (liveIds, extraId, exportedAt) => {
          // Guarantee extraId is not in live.
          const live = liveIds.filter((id) => id !== extraId);
          fc.pre(live.length > 0);
          const snap: SnapshotSummary = {
            characterIds: [...live, extraId],
            exportedAt,
          };
          const result = detectDiscrepancy({ characterIds: live }, snap);
          expect(result.discrepancy).toBe(true);
          if (result.discrepancy) {
            expect(result.reason).toBe('live-missing-ids');
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it('no false prompt: live superset-or-equal of snapshot ⇒ false, for ANY exportedAt (timestamps never drive it)', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
        fc.array(fc.string({ minLength: 1 }), { maxLength: 4 }),
        fc.string(), // arbitrary exportedAt, incl. lexically "newer"
        (snapIds, extraLiveIds, exportedAt) => {
          // live = snapshot ids + some extras ⇒ live ⊇ snapshot
          const liveIds = [...snapIds, ...extraLiveIds];
          const snap: SnapshotSummary = { characterIds: snapIds, exportedAt };
          expect(detectDiscrepancy({ characterIds: liveIds }, snap)).toEqual({
            discrepancy: false,
          });
        },
      ),
      { numRuns: 50 },
    );
  });

  it('blank/missing snapshot ids are ignored (no phantom missing id)', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
        fc.string(),
        (liveIds, exportedAt) => {
          // Snapshot = all live ids plus a blank id. The blank must not trigger.
          const snap: SnapshotSummary = {
            characterIds: [...liveIds, ''],
            exportedAt,
          };
          expect(detectDiscrepancy({ characterIds: liveIds }, snap)).toEqual({
            discrepancy: false,
          });
        },
      ),
      { numRuns: 50 },
    );
  });

  it('duplicate ids on either side collapse (sets) and never change the result', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 4 }),
        fc.string(),
        (ids, exportedAt) => {
          const snap: SnapshotSummary = {
            characterIds: [...ids, ...ids],
            exportedAt,
          };
          // live duplicates of the same set ⇒ equal sets ⇒ no discrepancy
          expect(
            detectDiscrepancy({ characterIds: [...ids, ...ids] }, snap),
          ).toEqual({ discrepancy: false });
        },
      ),
      { numRuns: 50 },
    );
  });
});
