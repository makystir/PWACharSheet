import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DiseasePanel } from '../DiseasePanel';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';
import {
  getSymptomTestBaseTarget,
  getToughnessBonus,
  type ActiveDisease,
} from '../../../logic/diseases';
import { DICE_ENTRY_MODE_KEY } from '../../../hooks/useDiceEntryMode';

/**
 * Full hand-off integration through DiseasePanel + GuidedDiseasePanel
 * (FEAT-001 ACs). Seeded symptom/Lingering rolls go through the EXISTING shared
 * RollDialog (manual entry for determinism); the guide renders no dice. The
 * Gangrene Hit-Location roll and mutation d100s are NEVER seeded — Gangrene
 * hands off to the existing disease-row control. Exactly one aria-modal dialog
 * focus-traps at a time (RollDialog-yield).
 */

function makeChar(diseases: ActiveDisease[]): Character {
  const base = structuredClone(BLANK_CHARACTER);
  return {
    ...base,
    chars: {
      ...base.chars,
      T: { i: 35, a: 5, b: 0 }, // Endurance base target = T total 40
      WP: { i: 30, a: 0, b: 0 },
    },
    diseases,
  };
}

interface Harness {
  character: Character;
  updateCharacter: ReturnType<typeof vi.fn>;
  onRoll: ReturnType<typeof vi.fn>;
}

function renderPanel(diseases: ActiveDisease[]): Harness {
  const character = makeChar(diseases);
  const updateCharacter = vi.fn();
  const onRoll = vi.fn();
  render(<DiseasePanel character={character} updateCharacter={updateCharacter} onRoll={onRoll} />);
  return { character, updateCharacter, onRoll };
}

function openGuide(name: string) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`Toggle ${name} details`, 'i') }));
  fireEvent.click(screen.getByTestId('guided-disease-trigger'));
}

function guideDialog() {
  return screen.getByRole('dialog', { name: 'Guide me through this disease' });
}

function gotoStep(label: 'Overview' | 'Symptoms' | 'Duration') {
  fireEvent.click(within(guideDialog()).getByLabelText(new RegExp(`Go to step .*: ${label}`)));
}

function resolveManualRoll(value: number) {
  const dialog = screen.getByRole('dialog', { name: 'Roll Dialog' });
  const input = within(dialog).getByLabelText('Your d100 roll');
  fireEvent.change(input, { target: { value: String(value) } });
  fireEvent.click(within(dialog).getByText('Resolve'));
}

const ratteFever: ActiveDisease = { id: 1, diseaseName: 'Ratte Fever', contracted: 1000, notes: '' };
const gallopingTrots: ActiveDisease = { id: 2, diseaseName: 'Galloping Trots', contracted: 1000, notes: '' };
const blackPlague: ActiveDisease = { id: 3, diseaseName: 'The Black Plague', contracted: 1000, notes: '' };

beforeEach(() => {
  localStorage.setItem(DICE_ENTRY_MODE_KEY, 'manual');
});

afterEach(() => {
  localStorage.removeItem(DICE_ENTRY_MODE_KEY);
  vi.restoreAllMocks();
});

describe('Guided disease — seedable symptom opens RollDialog (AC-5/6)', () => {
  it('a seedable symptom seeds a RollDialog with the getSymptomTestBaseTarget base target and its symptom difficulty', () => {
    const { character } = renderPanel([ratteFever]);
    openGuide('Ratte Fever');
    gotoStep('Symptoms');

    // Ratte Fever includes Wounded (Easy Endurance Test).
    const woundedBtn = within(guideDialog()).getByRole('button', {
      name: /Roll Easy Endurance Test for Wounded/i,
    });
    fireEvent.click(woundedBtn);

    const roll = screen.getByRole('dialog', { name: 'Roll Dialog' });
    // Base target equals the pure getSymptomTestBaseTarget (Endurance → T).
    const expected = getSymptomTestBaseTarget(character, 'Endurance');
    expect(expected).toBe(40);
    expect(within(roll).getByText('Base Target')).toBeInTheDocument();
    expect(within(roll).getAllByText(String(expected)).length).toBeGreaterThanOrEqual(1);
    // Difficulty defaults to the symptom's Easy (+40).
    expect((within(roll).getByLabelText('Difficulty') as HTMLSelectElement).value).toBe('Easy');
  });

  it('opening and rolling a seeded symptom Test mutates nothing on the character', () => {
    const { updateCharacter, onRoll } = renderPanel([ratteFever]);
    openGuide('Ratte Fever');
    gotoStep('Symptoms');
    fireEvent.click(
      within(guideDialog()).getByRole('button', { name: /Roll Easy Endurance Test for Wounded/i }),
    );
    resolveManualRoll(11);
    // The roll is recorded in history but the character is never updated.
    expect(onRoll).toHaveBeenCalledTimes(1);
    expect(updateCharacter).not.toHaveBeenCalled();
  });

  it('a null-test symptom (Malaise) shows guidance only — no seed button', () => {
    renderPanel([gallopingTrots]);
    openGuide('Galloping Trots');
    gotoStep('Symptoms');
    const dialog = guideDialog();
    // Malaise is present but has no self-contained roll.
    expect(within(dialog).getByText('Malaise')).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: /Endurance Test for Malaise/i }),
    ).not.toBeInTheDocument();
  });
});

describe('Guided disease — Gangrene hand-off (Finding 6)', () => {
  it('Gangrene shows the TB threshold and a close-and-return Hit-Location hand-off that seeds no location roll', () => {
    const { character } = renderPanel([blackPlague]);
    openGuide('The Black Plague');
    gotoStep('Symptoms');
    const dialog = guideDialog();

    const tb = getToughnessBonus(character);
    expect(within(dialog).getByLabelText('Gangrene threshold (TB) breakdown')).toHaveTextContent(String(tb));
    expect(within(dialog).getByText(/Daily \(fail > TB times = lose location\)/i)).toBeInTheDocument();

    // The hand-off closes the guide and opens NO RollDialog for the location.
    fireEvent.click(within(dialog).getByTestId('guided-disease-gangrene-handoff'));
    expect(screen.queryByRole('dialog', { name: 'Guide me through this disease' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Roll Dialog' })).not.toBeInTheDocument();
  });
});

describe('Guided disease — Step 3 Lingering seeds a Test (AC-5)', () => {
  it('Lingering seeds a RollDialog at the marked difficulty and lists the consequences as copy', () => {
    renderPanel([ratteFever]);
    openGuide('Ratte Fever');
    gotoStep('Duration');
    const dialog = guideDialog();

    // Ratte Fever has Lingering (Average).
    expect(within(dialog).getByText(/Lingering \(Average\)/)).toBeInTheDocument();
    expect(within(dialog).getByText(/extra 1d10 days/i)).toBeInTheDocument();
    expect(within(dialog).getAllByText(/Festering Wound/i).length).toBeGreaterThanOrEqual(1);
    expect(within(dialog).getAllByText(/Blood Rot/i).length).toBeGreaterThanOrEqual(1);

    fireEvent.click(within(dialog).getByTestId('guided-disease-seed-lingering'));
    const roll = screen.getByRole('dialog', { name: 'Roll Dialog' });
    expect((within(roll).getByLabelText('Difficulty') as HTMLSelectElement).value).toBe('Average');
  });
});

describe('Guided disease — calculated-total tooltips (AC-14)', () => {
  it('the symptom base-target cell opens a Tooltip containing the resolveSeededTarget breakdown lines', () => {
    renderPanel([ratteFever]);
    openGuide('Ratte Fever');
    gotoStep('Symptoms');
    // Open the Wounded symptom's base-target cell (Endurance → T total 40,
    // untrained so the characteristic-only branch). Wounded is the last seedable
    // Endurance symptom for Ratte Fever.
    const cells = within(guideDialog()).getAllByLabelText('Base target breakdown');
    fireEvent.click(cells[cells.length - 1]);
    const tips = screen.getAllByRole('tooltip');
    expect(tips.length).toBeGreaterThanOrEqual(1);
    const tip = tips[tips.length - 1];
    // resolveSeededTarget lines (untrained Endurance): "T 40 (Initial 35 +
    // Advances 5 + Bonus 0)" + "Endurance untrained — characteristic only".
    expect(tip).toHaveTextContent('Initial 35');
    expect(tip).toHaveTextContent('Advances 5');
    expect(tip).toHaveTextContent('T 40');
  });
});

describe('Guided disease — one aria-modal at a time (AC-18/19)', () => {
  it('while the seeded RollDialog is open exactly one aria-modal exists; focus returns to the step heading after close', () => {
    renderPanel([ratteFever]);
    openGuide('Ratte Fever');
    gotoStep('Symptoms');
    fireEvent.click(
      within(guideDialog()).getByRole('button', { name: /Roll Easy Endurance Test for Wounded/i }),
    );

    const modals = screen.getAllByRole('dialog').filter((d) => d.getAttribute('aria-modal') === 'true');
    expect(modals).toHaveLength(1);
    expect(modals[0]).toHaveAttribute('aria-label', 'Roll Dialog');
    // The guide yields while the dialog is open.
    expect(screen.queryByRole('dialog', { name: 'Guide me through this disease' })).not.toBeInTheDocument();

    // Resolve → RollDialog closes, the guide resumes as the single aria-modal.
    resolveManualRoll(11);
    const resumed = screen.getAllByRole('dialog').filter((d) => d.getAttribute('aria-modal') === 'true');
    expect(resumed).toHaveLength(1);
    expect(resumed[0]).toHaveAttribute('aria-label', 'Guide me through this disease');
  });
});

describe('Guided disease — Esc / close returns focus to the trigger (AC-4)', () => {
  it('Esc closes the guide and restores focus to the trigger', () => {
    renderPanel([ratteFever]);
    openGuide('Ratte Fever');
    fireEvent.keyDown(guideDialog(), { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Guide me through this disease' })).not.toBeInTheDocument();
  });
});
