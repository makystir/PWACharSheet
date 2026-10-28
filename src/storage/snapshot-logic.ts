/**
 * Pure, dependency-free helpers for the auto-backup feature:
 *   - `seqsToEvict`: the rolling-ring eviction policy.
 *   - `detectDiscrepancy`: the conservative restore-on-launch predicate.
 *
 * Both functions are pure (no I/O, no `Date.now()`, no storage) so they are
 * property-testable in isolation (auto-backup design §1 and §3).
 *
 * This is a reliability/persistence feature with no WFRP game mechanics, so per
 * the rules-compliance steering rule no rulebook citation applies.
 */

// --- Ring eviction (design §1) ---

/**
 * Given the seqs currently present (AFTER the newest record was committed) and
 * the ring size, return the seqs to DELETE so at most `ringSize` remain.
 *
 * CONTRACT (design §1, Finding 7): `existingSeqsAscending` MUST be strictly
 * ascending, deduplicated, and MUST already include the just-committed newest
 * seq (it is the post-commit `getAllKeys()` result, which IndexedDB returns in
 * ascending order for an autoIncrement store). Returns the lowest
 * `len - ringSize` seqs (the oldest), and NEVER the maximum (newest) seq. For
 * `len <= ringSize` it returns `[]`. `ringSize` is assumed `>= 1`.
 */
export function seqsToEvict(existingSeqsAscending: number[], ringSize: number): number[] {
  const len = existingSeqsAscending.length;
  if (len <= ringSize) return [];
  // The oldest `len - ringSize` entries are the lowest seqs — the leading slice.
  // Because input is ascending and includes the newest (max) seq last, this
  // slice can never contain the maximum seq.
  return existingSeqsAscending.slice(0, len - ringSize);
}

// --- Discrepancy predicate (design §3) ---

/** Live roster projection: the character ids currently in the live index. */
export interface LiveState {
  characterIds: string[];
}

/** Latest-snapshot projection: its character ids and its display timestamp. */
export interface SnapshotSummary {
  characterIds: string[];
  exportedAt: string;
}

export type DiscrepancyResult =
  | { discrepancy: false }
  | {
      discrepancy: true;
      reason: 'live-empty' | 'live-missing-ids';
      snapshotExportedAt: string;
    };

/**
 * Conservative launch predicate. Flags a discrepancy ONLY when the snapshot
 * holds character data the live store has lost — never on timestamps.
 *
 *   - `live-empty`: live has zero characters and the snapshot has >= 1.
 *   - `live-missing-ids`: the snapshot's id set contains at least one id absent
 *     from the live id set (`snapshot.ids \ live.ids !== empty`).
 *
 * Everything else (live superset-or-equal of snapshot, equal id sets, or no
 * snapshot) is `discrepancy: false`. Both id arrays are treated as SETS, so
 * duplicate ids collapse. Snapshot entries with a blank/missing id are ignored
 * when building the snapshot set, so a corrupt entry can never manufacture a
 * phantom "missing id" (design §3, Finding 8).
 *
 * Timestamps are deliberately excluded from the decision (clock drift /
 * cross-device drift make "snapshot newer" unreliable — OQ-1). `exportedAt` is
 * carried in the result only for the prompt's display text.
 */
export function detectDiscrepancy(
  live: LiveState,
  snapshot: SnapshotSummary | null,
): DiscrepancyResult {
  if (snapshot === null) return { discrepancy: false };

  // Build the snapshot id set, ignoring blank/missing ids (Finding 8).
  const snapshotIds = new Set<string>();
  for (const id of snapshot.characterIds) {
    if (typeof id === 'string' && id.length > 0) {
      snapshotIds.add(id);
    }
  }

  // No usable snapshot ids ⇒ nothing to recover ⇒ no prompt.
  if (snapshotIds.size === 0) return { discrepancy: false };

  const liveIds = new Set<string>();
  for (const id of live.characterIds) {
    if (typeof id === 'string' && id.length > 0) {
      liveIds.add(id);
    }
  }

  // live-empty: live has nothing, snapshot has something recoverable.
  if (liveIds.size === 0) {
    return {
      discrepancy: true,
      reason: 'live-empty',
      snapshotExportedAt: snapshot.exportedAt,
    };
  }

  // live-missing-ids: snapshot \ live is non-empty.
  for (const id of snapshotIds) {
    if (!liveIds.has(id)) {
      return {
        discrepancy: true,
        reason: 'live-missing-ids',
        snapshotExportedAt: snapshot.exportedAt,
      };
    }
  }

  // Live is a superset of (or equal to) the snapshot id set ⇒ no prompt.
  return { discrepancy: false };
}
