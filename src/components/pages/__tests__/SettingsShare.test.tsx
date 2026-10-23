import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SettingsPage } from '../SettingsPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints } from '../../../types/character';
import { importFromJSON } from '../../../storage/export-import';
import { trimForLink, SHARE_SOFT_LIMIT, SHARE_HARD_LIMIT } from '../../../logic/share-portrait';
import { encodeSharePayload } from '../../../logic/share-codec';
import { formatViewHref, parseViewRoute } from '../../../logic/view-route';
import { buildCombatStatBlock } from '../../../logic/combat-stat-block';

/**
 * FEAT-003 — Settings "Share with GM" card. Exercises the new snapshot /
 * stat-block / share-link controls, the privacy note, and the soft/hard length
 * warnings. Does NOT touch the existing Settings test files.
 */

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    ...structuredClone(BLANK_CHARACTER),
    name: 'Shared Hero',
    species: 'Human',
    ...overrides,
  };
}

function renderSettings(character: Character) {
  return render(
    <SettingsPage
      character={character}
      characterId="share-test-char"
      update={vi.fn()}
      updateCharacter={vi.fn()}
      totalWounds={10}
      armourPoints={defaultAP}
      maxEncumbrance={5}
      coinWeight={0}
    />,
  );
}

// High-entropy filler so gzip cannot shrink the payload much, letting us grow
// the encoded href predictably to cross the soft/hard thresholds.
function entropyString(length: number): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  // A simple xorshift-ish LCG keeps the string deterministic but incompressible.
  let seed = 0x9e3779b9 ^ length;
  for (let i = 0; i < length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    out += alphabet[seed & 63];
  }
  return out;
}

// Build a character whose link href lands in the requested bucket by growing a
// trapping's name (trappings survive trimForLink) until the measured full href
// length matches. Returns the character plus the pre-measured href length.
async function characterForBucket(bucket: 'below-soft' | 'soft' | 'hard'): Promise<{ character: Character; hrefLen: number }> {
  async function hrefLenFor(padding: number): Promise<number> {
    const character = makeCharacter({
      trappings: padding > 0 ? [{ name: entropyString(padding), enc: '0', quantity: 1 }] : [],
    });
    const json = JSON.stringify(trimForLink(character));
    const encoded = await encodeSharePayload(json);
    return formatViewHref(location.origin, location.pathname, encoded).length;
  }

  if (bucket === 'below-soft') {
    // Empty character is comfortably below SOFT.
    const len = await hrefLenFor(0);
    expect(len).toBeLessThan(SHARE_SOFT_LIMIT);
    return { character: makeCharacter(), hrefLen: len };
  }

  const target = bucket === 'soft' ? SHARE_SOFT_LIMIT : SHARE_HARD_LIMIT;
  const ceiling = bucket === 'soft' ? SHARE_HARD_LIMIT : Number.POSITIVE_INFINITY;
  // Grow until we are at/above target but, for 'soft', still below HARD.
  let padding = 1000;
  for (let i = 0; i < 60; i++) {
    const len = await hrefLenFor(padding);
    if (len >= target && len < ceiling) {
      const character = makeCharacter({ trappings: [{ name: entropyString(padding), enc: '0', quantity: 1 }] });
      return { character, hrefLen: len };
    }
    if (len < target) {
      padding = Math.ceil(padding * 1.5) + 500;
    } else {
      // Overshot the ceiling (soft bucket only): step back down.
      padding = Math.floor(padding * 0.9);
    }
  }
  throw new Error(`could not build character for bucket ${bucket}`);
}

describe('SettingsPage — Share with GM card', () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeText = vi.fn(async () => {});
    Object.assign(navigator, { clipboard: { writeText } });
    // jsdom has no object-URL support.
    if (!('createObjectURL' in URL)) {
      Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() });
    } else {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the snapshot, stat-block and share-link controls', () => {
    renderSettings(makeCharacter());
    expect(screen.getByRole('button', { name: /Download snapshot/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy snapshot/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy Combat Stat Block/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy Share Link/i })).toBeInTheDocument();
  });

  it('shows the privacy note contrasting link-embeds-data with local-only snapshot', () => {
    renderSettings(makeCharacter());
    expect(screen.getByText(/embeds the character data in the link/i)).toBeInTheDocument();
    expect(screen.getByText(/stays/i)).toBeInTheDocument();
    expect(screen.getByText(/local to this device/i)).toBeInTheDocument();
  });

  it('Copy Combat Stat Block writes the plain-text block to the clipboard', async () => {
    const character = makeCharacter({
      chars: { ...structuredClone(BLANK_CHARACTER.chars), WS: { i: 40, a: 5, b: 0 } },
    });
    renderSettings(character);
    fireEvent.click(screen.getByRole('button', { name: /Copy Combat Stat Block/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const written = writeText.mock.calls[0][0] as string;
    // Plain text (not JSON) and matches the shared generator exactly.
    expect(written).toBe(buildCombatStatBlock(character));
    expect(() => JSON.parse(written)).toThrow();
    expect(written).toContain('Shared Hero');
  });

  it('Download snapshot produces a payload that parses with importFromJSON', async () => {
    const character = makeCharacter();
    renderSettings(character);
    const blobSpy = vi.spyOn(globalThis, 'Blob');
    fireEvent.click(screen.getByRole('button', { name: /Download snapshot/i }));
    await waitFor(() => expect(blobSpy).toHaveBeenCalled());
    const parts = blobSpy.mock.calls[0][0] as string[];
    const json = parts[0];
    const result = importFromJSON(json);
    expect(result.success).toBe(true);
    expect(result.character?.name).toBe('Shared Hero');
  });

  it('Copy Share Link writes a #view/... URL whose hash decodes to the viewer payload', async () => {
    const character = makeCharacter();
    renderSettings(character);
    fireEvent.click(screen.getByRole('button', { name: /Copy Share Link/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const href = writeText.mock.calls[0][0] as string;
    expect(href).toContain('#view/');
    const hash = href.slice(href.indexOf('#'));
    expect(parseViewRoute(hash)).not.toBeNull();
  });

  describe('length warnings (measured on the full href, >=)', () => {
    it('shows neither warning just below SHARE_SOFT_LIMIT, link primary', async () => {
      const { character, hrefLen } = await characterForBucket('below-soft');
      expect(hrefLen).toBeLessThan(SHARE_SOFT_LIMIT);
      renderSettings(character);
      fireEvent.click(screen.getByRole('button', { name: /Copy Share Link/i }));
      await waitFor(() => expect(writeText).toHaveBeenCalled());

      expect(screen.queryByText(/getting long/i)).not.toBeInTheDocument();
      expect(screen.queryByTestId('share-hard-warning')).not.toBeInTheDocument();

      // Link stays primary: it precedes Download snapshot in the DOM.
      const buttons = screen.getAllByRole('button');
      const linkIdx = buttons.findIndex(b => /Copy Share Link/i.test(b.textContent || ''));
      const dlIdx = buttons.findIndex(b => /Download snapshot/i.test(b.textContent || ''));
      expect(linkIdx).toBeLessThan(dlIdx);
    });

    it('shows the soft caution at/above SHARE_SOFT_LIMIT with the link still primary', async () => {
      const { character, hrefLen } = await characterForBucket('soft');
      expect(hrefLen).toBeGreaterThanOrEqual(SHARE_SOFT_LIMIT);
      expect(hrefLen).toBeLessThan(SHARE_HARD_LIMIT);
      renderSettings(character);
      fireEvent.click(screen.getByRole('button', { name: /Copy Share Link/i }));
      await waitFor(() => expect(screen.getByText(/getting long/i)).toBeInTheDocument());

      expect(screen.queryByTestId('share-hard-warning')).not.toBeInTheDocument();

      const buttons = screen.getAllByRole('button');
      const linkIdx = buttons.findIndex(b => /Copy Share Link/i.test(b.textContent || ''));
      const dlIdx = buttons.findIndex(b => /Download snapshot/i.test(b.textContent || ''));
      expect(linkIdx).toBeLessThan(dlIdx);
    });

    it('renders the hard warning at/above SHARE_HARD_LIMIT and demotes the link below Download snapshot', async () => {
      const { character, hrefLen } = await characterForBucket('hard');
      expect(hrefLen).toBeGreaterThanOrEqual(SHARE_HARD_LIMIT);
      renderSettings(character);
      fireEvent.click(screen.getByRole('button', { name: /Copy Share Link/i }));
      await waitFor(() => expect(screen.getByTestId('share-hard-warning')).toBeInTheDocument());

      // Download snapshot becomes primary: it precedes Copy Share Link now.
      const buttons = screen.getAllByRole('button');
      const linkIdx = buttons.findIndex(b => /Copy Share Link/i.test(b.textContent || ''));
      const dlIdx = buttons.findIndex(b => /Download snapshot/i.test(b.textContent || ''));
      expect(dlIdx).toBeLessThan(linkIdx);
    });
  });
});
