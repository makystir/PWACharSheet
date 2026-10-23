import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Character, CharacteristicKey, CharacteristicValue } from '../../../types/character';
import { BLANK_CHARACTER } from '../../../types/character';
import { encodeSharePayload } from '../../../logic/share-codec';
import { deriveSheetTotals } from '../../../logic/sheet-totals';
import * as eventLog from '../../../logic/event-log';

// Spies are created via vi.hoisted so they exist before the hoisted vi.mock
// factories run. importFromJSONWithPortrait is replaced while importFromJSON
// (used by the real validate pipeline) is kept intact.
const { importSpy, savePortraitSpy } = vi.hoisted(() => ({
  importSpy: vi.fn(async () => ({ success: true, character: undefined as unknown })),
  savePortraitSpy: vi.fn(async () => {}),
}));

vi.mock('../../../storage/export-import', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../storage/export-import')>();
  return { ...actual, importFromJSONWithPortrait: importSpy };
});

vi.mock('../../../storage/portrait-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../storage/portrait-store')>();
  return {
    ...actual,
    getPortraitStore: () => ({
      ...actual.getPortraitStore(),
      savePortrait: savePortraitSpy,
    }),
  };
});

import { SharedCharacterViewer } from '../SharedCharacterViewer';

const CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

function charsFrom(values: Partial<Record<CharacteristicKey, number>>): Record<CharacteristicKey, CharacteristicValue> {
  return Object.fromEntries(
    CHAR_KEYS.map(k => [k, { i: values[k] ?? 0, a: 0, b: 0 }]),
  ) as Record<CharacteristicKey, CharacteristicValue>;
}

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    ...structuredClone(BLANK_CHARACTER),
    name: 'Fixture',
    species: 'Human / Reiklander',
    chars: charsFrom({ WS: 42, S: 35, T: 38, WP: 32 }),
    move: { m: 4, w: 8, r: 16 },
    bSkills: [{ n: 'Melee (Basic)', c: 'WS', a: 10 }],
    weapons: [
      { name: 'Sword', group: 'Basic', enc: '1', damage: 'SB+4', qualities: 'Fast', rangeReach: 'Average' } as Character['weapons'][number],
    ],
    ...overrides,
  };
}

async function encodeCharacter(character: Character): Promise<string> {
  return encodeSharePayload(JSON.stringify(character));
}

async function renderSheet(character: Character) {
  const encoded = await encodeCharacter(character);
  const utils = render(<SharedCharacterViewer encoded={encoded} />);
  // Wait for the async decode/validate to resolve to the sheet.
  await screen.findByText('Characteristics');
  return utils;
}

describe('SharedCharacterViewer — environment prerequisites', () => {
  it('exposes CompressionStream for encoding fixtures', () => {
    expect(typeof CompressionStream).toBe('function');
    expect(typeof DecompressionStream).toBe('function');
  });
});

describe('SharedCharacterViewer — totals equal deriveSheetTotals', () => {
  beforeEach(() => {
    importSpy.mockClear();
    savePortraitSpy.mockClear();
  });

  it('renders the wounds total from deriveSheetTotals', async () => {
    const character = makeCharacter();
    const totals = deriveSheetTotals(character);
    await renderSheet(character);
    expect(screen.getByLabelText(`Wounds ${totals.wounds.total}. Show breakdown.`)).toHaveTextContent(
      String(totals.wounds.total),
    );
  });

  it('renders worn-only armour points equal to deriveSheetTotals (unworn ignored)', async () => {
    const character = makeCharacter({
      armour: [
        { name: 'Helm', locations: 'Head', enc: '0', ap: 1, qualities: '', worn: true } as Character['armour'][number],
        { name: 'Mail Shirt', locations: 'Body', enc: '1', ap: 2, qualities: '', worn: false } as Character['armour'][number],
      ],
    });
    const totals = deriveSheetTotals(character);
    await renderSheet(character);
    expect(screen.getByLabelText(`Head armour points ${totals.armourPoints.head}. Show breakdown.`)).toBeInTheDocument();
    // Unworn body armour does not contribute.
    expect(screen.getByLabelText(`Body armour points ${totals.armourPoints.body}. Show breakdown.`)).toHaveTextContent(
      String(totals.armourPoints.body),
    );
    expect(totals.armourPoints.body).toBe(0);
  });

  it('renders weapon damage equal to deriveSheetTotals under a non-default house rule', async () => {
    const character = makeCharacter({
      houseRules: { ...BLANK_CHARACTER.houseRules, rangedDamageSBMode: 'halfSB' },
      weapons: [
        { name: 'Bow', group: 'Bow', enc: '1', damage: 'SB+3', qualities: '', maxR: '100' } as Character['weapons'][number],
      ],
    });
    await renderSheet(character);
    const totals = deriveSheetTotals(character);
    // halfSB of S=35 -> SB=3 -> half=1, +3 => 4
    expect(totals.SB).toBe(3);
    expect(screen.getByLabelText('Bow damage 4. Show breakdown.')).toHaveTextContent('4');
  });
});

describe('SharedCharacterViewer — breakdown tooltips', () => {
  beforeEach(() => {
    importSpy.mockClear();
  });

  it('opens a wounds breakdown tooltip from the wounds TooltipTriggerCell', async () => {
    const character = makeCharacter();
    const totals = deriveSheetTotals(character);
    await renderSheet(character);
    const cell = screen.getByLabelText(`Wounds ${totals.wounds.total}. Show breakdown.`);
    expect(cell).toHaveAttribute('role', 'button');
    fireEvent.click(cell);
    const tooltip = await screen.findByRole('tooltip');
    expect(within(tooltip).getByText('Wounds Breakdown')).toBeInTheDocument();
    expect(within(tooltip).getByText('TB×2:')).toBeInTheDocument();
  });

  it('shows only one tooltip at a time', async () => {
    const character = makeCharacter();
    await renderSheet(character);
    fireEvent.click(screen.getByLabelText('Movement 4, Walk 8, Run 16. Show breakdown.'));
    await screen.findByRole('tooltip');
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
    // Open a different total — still exactly one tooltip.
    fireEvent.click(screen.getByLabelText(/^Weapon Skill total/));
    await waitFor(() => {
      expect(screen.getAllByRole('tooltip')).toHaveLength(1);
    });
  });

  it('movement tooltip uses conditional 2×M / 4×M labels when standard', async () => {
    const character = makeCharacter({ move: { m: 4, w: 8, r: 16 } });
    await renderSheet(character);
    fireEvent.click(screen.getByLabelText('Movement 4, Walk 8, Run 16. Show breakdown.'));
    const tooltip = await screen.findByRole('tooltip');
    expect(within(tooltip).getByText('Walk = 2×M (8)')).toBeInTheDocument();
    expect(within(tooltip).getByText('Run = 4×M (16)')).toBeInTheDocument();
  });

  it('movement tooltip source-states non-standard values', async () => {
    const character = makeCharacter({ move: { m: 4, w: 5, r: 16 } });
    await renderSheet(character);
    fireEvent.click(screen.getByLabelText('Movement 4, Walk 5, Run 16. Show breakdown.'));
    const tooltip = await screen.findByRole('tooltip');
    expect(within(tooltip).getByText('Walk (5)')).toBeInTheDocument();
    expect(within(tooltip).getAllByText('as recorded on the sheet').length).toBeGreaterThan(0);
    // Run is still standard here.
    expect(within(tooltip).getByText('Run = 4×M (16)')).toBeInTheDocument();
  });
});

describe('SharedCharacterViewer — read-only guarantees', () => {
  beforeEach(() => {
    importSpy.mockClear();
    savePortraitSpy.mockClear();
  });

  it('renders no editable inputs and performs no writes on render or tooltip interaction', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const appendSpy = vi.spyOn(eventLog, 'appendEvent');
    const character = makeCharacter();
    const { container } = await renderSheet(character);

    // No editable controls in the sheet.
    expect(container.querySelectorAll('input, textarea, select')).toHaveLength(0);

    // Interact with a tooltip — still no writes.
    fireEvent.click(screen.getByLabelText(/^Weapon Skill total/));
    await screen.findByRole('tooltip');

    expect(setItemSpy).not.toHaveBeenCalled();
    expect(savePortraitSpy).not.toHaveBeenCalled();
    expect(appendSpy).not.toHaveBeenCalled();
    expect(importSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });
});

describe('SharedCharacterViewer — graceful error states', () => {
  it('renders a mapped message for a malformed payload without throwing', async () => {
    render(<SharedCharacterViewer encoded="!!!not-base64url!!!" />);
    expect(await screen.findByText('Can’t open this shared character')).toBeInTheDocument();
    expect(screen.getByText(/incomplete or corrupted/)).toBeInTheDocument();
    expect(screen.getByText('Back to my characters')).toBeInTheDocument();
  });

  it('renders a version message for a newer-than-current payload without throwing', async () => {
    const future = { ...structuredClone(BLANK_CHARACTER), _v: 999 } as unknown as Character;
    const encoded = await encodeCharacter(future);
    render(<SharedCharacterViewer encoded={encoded} />);
    expect(await screen.findByText('Can’t open this shared character')).toBeInTheDocument();
    expect(screen.getByText(/Unsupported version/)).toBeInTheDocument();
  });

  it('rejects an oversized pasted payload without throwing', async () => {
    render(<SharedCharacterViewer encoded="" />);
    const textarea = await screen.findByLabelText('Shared character data');
    // 3,000,001 chars exceeds MAX_JSON_CHARS.
    fireEvent.change(textarea, { target: { value: 'x'.repeat(3_000_001) } });
    fireEvent.click(screen.getByText('Open pasted data'));
    expect(await screen.findByText('This character data is too large to open.')).toBeInTheDocument();
  });
});

describe('SharedCharacterViewer — import into my characters', () => {
  beforeEach(() => {
    importSpy.mockClear();
  });

  it('imports only after explicit confirm and calls importFromJSONWithPortrait once', async () => {
    const character = makeCharacter();
    await renderSheet(character);

    // Mere viewing performs no import.
    expect(importSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Import into my characters'));
    // Dialog shown; not yet imported.
    expect(importSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    await waitFor(() => {
      expect(importSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('does not import when the confirm dialog is cancelled', async () => {
    const character = makeCharacter();
    await renderSheet(character);
    fireEvent.click(screen.getByText('Import into my characters'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(importSpy).not.toHaveBeenCalled();
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
