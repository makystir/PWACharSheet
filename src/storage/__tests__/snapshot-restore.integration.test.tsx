import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SnapshotStore } from '../snapshot-store';
import {
  evaluateLaunchDiscrepancy,
  restoreFromSnapshot,
  commitSnapshotRestore,
  takeSnapshot,
} from '../snapshot-service';
import { validateBackupFile } from '../restore-service';
import * as restoreService from '../restore-service';
import { assembleBackup } from '../backup-service';
import {
  createCharacter,
  saveCharacter,
  loadCharacter,
  getCharacterIndex,
} from '../character-manager';
import type { BackupFile } from '../backup-types';
import { RestoreLaunchDialog } from '../../components/shared/RestoreLaunchDialog';

/**
 * Launch-prompt / restore integration tests (auto-backup design §9, tests
 * 2, 9, 10, 10b, 11) plus the launch dialog's render/decline behaviour.
 * Uses fake-indexeddb under jsdom and a fresh SnapshotStore per test.
 */

let backing: Map<string, string>;

beforeEach(() => {
  backing = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => backing.get(key) ?? null,
    setItem: (key: string, value: string) => { backing.set(key, value); },
    removeItem: (key: string) => { backing.delete(key); },
    clear: () => { backing.clear(); },
  });
  let uuidCounter = 0;
  vi.stubGlobal('crypto', { randomUUID: () => `uuid-${++uuidCounter}` });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function freshStore(): Promise<SnapshotStore> {
  const store = new SnapshotStore();
  await store.init();
  await store.clearSnapshots();
  return store;
}

function minimalBackup(ids: string[]): BackupFile {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    characterCount: ids.length,
    characters: ids.map((id) => ({
      id,
      character: { name: `Name ${id}`, species: 'Human', chars: {} },
      portrait: '',
    })),
  };
}

describe('Test 2: snapshot round-trips through the existing serialization', () => {
  it('assembleBackup → putSnapshot → getSnapshot → stringify → validateBackupFile is ok with same ids', async () => {
    const store = await freshStore();
    const id = createCharacter('Round Trip');
    const char = loadCharacter(id)!;
    char.species = 'Dwarf';
    saveCharacter(id, char);

    const assembled = await assembleBackup();
    expect(assembled.ok).toBe(true);
    if (!assembled.ok) return;

    const put = await store.putSnapshot(assembled.payload);
    expect(put.ok).toBe(true);

    const latest = await store.getLatestSnapshot();
    expect(latest.ok).toBe(true);
    if (!latest.ok || !latest.value) return;

    const validation = validateBackupFile(JSON.stringify(latest.value.payload));
    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(validation.metadata.characterCount).toBe(assembled.payload.characterCount);
      expect(validation.characters.map((c) => c.id).sort()).toEqual(
        assembled.payload.characters.map((c) => c.id).sort(),
      );
    }
  });
});

describe('Test 9: launch discrepancy only on a seeded discrepancy', () => {
  it('empty live + seeded snapshot ⇒ a prompt descriptor is returned', async () => {
    const store = await freshStore();
    await store.putSnapshot(minimalBackup(['ghost-1']));
    const prompt = await evaluateLaunchDiscrepancy(store);
    expect(prompt).not.toBeNull();
  });

  it('live ⊇ snapshot ⇒ no prompt', async () => {
    const store = await freshStore();
    // Live has a character; snapshot holds only that same id ⇒ equal/subset.
    const id = createCharacter('Only');
    saveCharacter(id, loadCharacter(id)!);
    await store.putSnapshot(minimalBackup([id]));
    const prompt = await evaluateLaunchDiscrepancy(store);
    expect(prompt).toBeNull();
  });
});

describe('Test 11: restore routes through restore-service; corrupt payload is graceful', () => {
  it('restoreFromSnapshot validates and returns a plan; commit calls restoreCharacters', async () => {
    const store = await freshStore();
    await store.putSnapshot(minimalBackup(['x1', 'x2']));
    const latest = await store.getLatestSnapshot();
    expect(latest.ok && latest.value).toBeTruthy();
    const seq = (latest.ok && latest.value?.seq) || 0;

    const restoreSpy = vi.spyOn(restoreService, 'restoreCharacters');

    const outcome = await restoreFromSnapshot(store, seq);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.plan.characterCount).toBe(2);

    await commitSnapshotRestore(store, outcome.plan);
    expect(restoreSpy).toHaveBeenCalledTimes(1);
    // Two new (new-id) characters were created non-destructively.
    expect(getCharacterIndex().characters.length).toBe(2);
  });

  it('a corrupt stored payload yields a graceful error and NO restoreCharacters call', async () => {
    const store = await freshStore();
    // Write a record whose payload is structurally invalid (empty characters).
    await store.putSnapshot({
      version: 1,
      exportedAt: new Date().toISOString(),
      characterCount: 5,
      characters: [],
    });
    const latest = await store.getLatestSnapshot();
    const seq = (latest.ok && latest.value?.seq) || 0;

    const restoreSpy = vi.spyOn(restoreService, 'restoreCharacters');
    const outcome = await restoreFromSnapshot(store, seq);
    expect(outcome.ok).toBe(false);
    expect(restoreSpy).not.toHaveBeenCalled();
  });
});

describe('Test 10b: no re-prompt after a confirmed restore', () => {
  it('after committing a live-empty restore, a second launch check returns null', async () => {
    const store = await freshStore();
    await store.putSnapshot(minimalBackup(['orig-1', 'orig-2']));

    // Live is empty ⇒ discrepancy.
    const first = await evaluateLaunchDiscrepancy(store);
    expect(first).not.toBeNull();
    if (!first) return;

    const outcome = await restoreFromSnapshot(store, first.seq);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    await commitSnapshotRestore(store, outcome.plan);

    // commitSnapshotRestore wrote a fresh snapshot realigned to the new live ids.
    const second = await evaluateLaunchDiscrepancy(store);
    expect(second).toBeNull();
  });
});

describe('Test 10 + dialog: decline leaves live untouched', () => {
  it('RestoreLaunchDialog renders the prompt and Decline leaves no side effects', () => {
    const onRestore = vi.fn();
    const onDecline = vi.fn();
    render(
      <RestoreLaunchDialog
        exportedAtLabel="12 Jan 2500"
        onRestore={onRestore}
        onDecline={onDecline}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText(/A more recent backup from 12 Jan 2500/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Not now'));
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(onRestore).not.toHaveBeenCalled();
  });

  it('Esc declines the launch dialog', async () => {
    const onDecline = vi.fn();
    render(
      <RestoreLaunchDialog exportedAtLabel="t" onRestore={vi.fn()} onDecline={onDecline} />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(onDecline).toHaveBeenCalled());
  });
});

describe('takeSnapshot with empty roster writes nothing', () => {
  it('no characters ⇒ snapshot store stays empty', async () => {
    const store = await freshStore();
    await takeSnapshot(store);
    const list = await store.listSnapshots();
    expect(list.ok && list.value.length).toBe(0);
  });
});
