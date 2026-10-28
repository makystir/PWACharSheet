import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { BackupFile } from '../backup-types';
import type { ISnapshotStore, SnapshotResult, SnapshotMeta, SnapshotRecord } from '../snapshot-store';

/**
 * Service tests (auto-backup design §9, tests 8, 8b, 14): throttle/flush
 * coalescing, live-save isolation, delete-path isolation, and the
 * no-download-on-any-lifecycle-event negative assertion.
 */

// Mock the backup/download primitives so we can observe them without real IDB.
vi.mock('../backup-service', () => ({
  assembleBackup: vi.fn(),
  downloadBackup: vi.fn(() => ({ ok: true })),
}));

import { assembleBackup, downloadBackup } from '../backup-service';
import {
  startSnapshotController,
  takeSnapshot,
} from '../snapshot-service';
import {
  createCharacter,
  saveCharacter,
  loadCharacter,
  deleteCharacter,
  getCharacterIndex,
} from '../character-manager';

const okBackup: BackupFile = {
  version: 1,
  exportedAt: new Date().toISOString(),
  characterCount: 1,
  characters: [{ id: 'c1', character: { name: 'C1' }, portrait: '' }],
};

/** A fake snapshot store that records putSnapshot calls. */
function makeFakeStore(opts: { putOk?: boolean } = {}): {
  store: ISnapshotStore;
  puts: BackupFile[];
} {
  const puts: BackupFile[] = [];
  const store: ISnapshotStore = {
    init: vi.fn(async () => {}),
    isDegraded: vi.fn(() => false),
    putSnapshot: vi.fn(async (payload: BackupFile): Promise<SnapshotResult<void>> => {
      puts.push(payload);
      return opts.putOk === false
        ? { ok: false, error: 'quota' }
        : { ok: true, value: undefined };
    }),
    listSnapshots: vi.fn(async (): Promise<SnapshotResult<SnapshotMeta[]>> => ({ ok: true, value: [] })),
    getSnapshot: vi.fn(async (): Promise<SnapshotResult<SnapshotRecord | null>> => ({ ok: true, value: null })),
    getLatestSnapshot: vi.fn(async (): Promise<SnapshotResult<SnapshotRecord | null>> => ({ ok: true, value: null })),
    clearSnapshots: vi.fn(async (): Promise<SnapshotResult<void>> => ({ ok: true, value: undefined })),
  };
  return { store, puts };
}

let backingStore: Map<string, string>;

beforeEach(() => {
  backingStore = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => backingStore.get(key) ?? null,
    setItem: (key: string, value: string) => { backingStore.set(key, value); },
    removeItem: (key: string) => { backingStore.delete(key); },
    clear: () => { backingStore.clear(); },
  });
  let uuidCounter = 0;
  vi.stubGlobal('crypto', { randomUUID: () => `uuid-${++uuidCounter}` });
  vi.mocked(assembleBackup).mockResolvedValue({ ok: true, payload: okBackup });
  vi.mocked(downloadBackup).mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Test 8: live-save isolation (field edit)', () => {
  it('a rejecting putSnapshot never breaks saveCharacter', async () => {
    const { store } = makeFakeStore({ putOk: false });
    const controller = startSnapshotController(store);

    const id = createCharacter('Hero');
    const char = loadCharacter(id)!;
    char.xpCur = 42;
    const result = saveCharacter(id, char);

    // Live save succeeds and localStorage holds the write regardless of snapshot.
    expect(result.ok).toBe(true);
    expect(loadCharacter(id)!.xpCur).toBe(42);

    controller.stop();
  });
});

describe('Test 8b: delete-path isolation (degraded store)', () => {
  it('deleteCharacter does not throw and leaves the index correct', () => {
    const { store } = makeFakeStore();
    vi.mocked(store.isDegraded).mockReturnValue(true);
    const controller = startSnapshotController(store);

    const a = createCharacter('A');
    const b = createCharacter('B');
    expect(() => deleteCharacter(a)).not.toThrow();

    const index = getCharacterIndex();
    expect(index.characters.map((c) => c.id)).toEqual([b]);
    expect(index.activeId).toBe(b);

    controller.stop();
  });
});

describe('Test 14: throttle/flush coalescing + no downloads on lifecycle events', () => {
  it('coalesces rapid changes into one write per window; fires on timer; flushes on hidden when dirty', async () => {
    vi.useFakeTimers();
    const { store, puts } = makeFakeStore();
    const controller = startSnapshotController(store);

    // Three rapid changes within the window coalesce.
    const id = createCharacter('Hero');
    const char = loadCharacter(id)!;
    saveCharacter(id, char);
    saveCharacter(id, char);
    saveCharacter(id, char);

    // Nothing written yet (trailing throttle).
    expect(puts.length).toBe(0);

    // Advance past the throttle window and flush the queued microtasks.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(puts.length).toBe(1);

    controller.stop();
  });

  it('visibilitychange→hidden with a pending change forces a write; none with no change writes nothing', async () => {
    vi.useFakeTimers();
    const { store, puts } = makeFakeStore();
    const controller = startSnapshotController(store);

    // No pending change yet: a hidden event writes nothing.
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(puts.length).toBe(0);

    // Make a change, then hide: forces an immediate write.
    const id = createCharacter('Hero');
    const char = loadCharacter(id)!;
    saveCharacter(id, char);
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(puts.length).toBe(1);

    controller.stop();
  });

  it('no file download on visibilitychange→hidden, pagehide, or beforeunload', async () => {
    vi.useFakeTimers();
    const { store } = makeFakeStore();
    const controller = startSnapshotController(store);

    const id = createCharacter('Hero');
    const char = loadCharacter(id)!;
    saveCharacter(id, char);

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('pagehide'));
    window.dispatchEvent(new Event('beforeunload'));
    await vi.advanceTimersByTimeAsync(60_000);

    // The controller only writes to IndexedDB; it NEVER triggers a file download.
    expect(downloadBackup).not.toHaveBeenCalled();

    controller.stop();
  });
});

describe('takeSnapshot', () => {
  it('skips the write when there are no characters (assembleBackup ok:false)', async () => {
    const { store, puts } = makeFakeStore();
    vi.mocked(assembleBackup).mockResolvedValueOnce({ ok: false, error: 'No characters to back up.' });
    await takeSnapshot(store);
    expect(puts.length).toBe(0);
  });

  it('writes the assembled payload when characters exist', async () => {
    const { store, puts } = makeFakeStore();
    await takeSnapshot(store);
    expect(puts.length).toBe(1);
    expect(puts[0]).toEqual(okBackup);
  });
});
