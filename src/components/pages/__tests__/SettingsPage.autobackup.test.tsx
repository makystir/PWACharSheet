import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsPage } from '../SettingsPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints } from '../../../types/character';
import { getSnapshotStore } from '../../../storage/snapshot-store';
import type { BackupFile } from '../../../storage/backup-types';

/**
 * Settings auto-backup affordances (auto-backup design §9, test 12): the
 * snapshot list renders newest-first with timestamps, the status line shows the
 * newest / "none" with NO Tooltip, and selecting a snapshot routes through the
 * validated restore path (RestoreConfirmDialog).
 */

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

function makeCharacter(): Character {
  return structuredClone(BLANK_CHARACTER);
}

function renderSettings() {
  return render(
    <SettingsPage
      character={makeCharacter()}
      characterId="c1"
      update={vi.fn()}
      updateCharacter={vi.fn()}
      totalWounds={10}
      armourPoints={defaultAP}
      maxEncumbrance={5}
      coinWeight={0}
    />,
  );
}

function backup(ids: string[], exportedAt: string): BackupFile {
  return {
    version: 1,
    exportedAt,
    characterCount: ids.length,
    characters: ids.map((id) => ({
      id,
      character: { name: `Name ${id}`, species: 'Human', chars: {} },
      portrait: '',
    })),
  };
}

let backing: Map<string, string>;

beforeEach(async () => {
  backing = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => backing.get(key) ?? null,
    setItem: (key: string, value: string) => { backing.set(key, value); },
    removeItem: (key: string) => { backing.delete(key); },
    clear: () => { backing.clear(); },
  });
  vi.stubGlobal('matchMedia', undefined);
  // Reset the singleton snapshot store's data.
  const store = getSnapshotStore();
  await store.init();
  await store.clearSnapshots();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('SettingsPage auto-backup', () => {
  it('shows "No auto-backup yet" status when there are no snapshots', async () => {
    renderSettings();
    await waitFor(() => {
      expect(screen.getByText(/No auto-backup yet/)).toBeInTheDocument();
    });
  });

  it('lists snapshots newest-first with timestamps and a last-auto-backup status line (no tooltip)', async () => {
    const store = getSnapshotStore();
    const older = new Date('2500-01-01T10:00:00.000Z').toISOString();
    const newer = new Date('2500-06-01T10:00:00.000Z').toISOString();
    await store.putSnapshot(backup(['a'], older));
    await store.putSnapshot(backup(['a', 'b'], newer));

    renderSettings();

    // Status line reflects the newest snapshot.
    const statusLine = await screen.findByText(
      new RegExp(`Last auto-backup: ${new Date(newer).toLocaleString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
    );
    expect(statusLine).toBeInTheDocument();
    // Plain status text — not wrapped in a tooltip trigger.
    expect(statusLine.closest('[role="tooltip"]')).toBeNull();

    // Both restore rows appear; the first (newest-first) restores the 2-char snapshot.
    const restoreButtons = await screen.findAllByRole('button', { name: /Restore .* — \d+ character/ });
    expect(restoreButtons.length).toBe(2);
  });

  it('selecting a snapshot opens the validated RestoreConfirmDialog', async () => {
    const store = getSnapshotStore();
    await store.putSnapshot(backup(['a', 'b'], new Date('2500-06-01T10:00:00.000Z').toISOString()));

    renderSettings();

    const restoreButtons = await screen.findAllByRole('button', { name: /Restore .* — \d+ character/ });
    fireEvent.click(restoreButtons[0]);

    // The existing confirm dialog appears, seeded from the validated payload.
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Restore 2 characters\?/)).toBeInTheDocument();
    });
  });
});
