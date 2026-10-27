import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DiseasePanel } from '../DiseasePanel';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';
import type { ActiveDisease } from '../../../logic/diseases';

function makeChar(diseases: ActiveDisease[]): Character {
  const base = structuredClone(BLANK_CHARACTER);
  return {
    ...base,
    chars: {
      ...base.chars,
      T: { i: 35, a: 5, b: 0 }, // Endurance target off T total 40
      WP: { i: 30, a: 0, b: 0 },
    },
    diseases,
  };
}

function renderPanel(diseases: ActiveDisease[]) {
  const character = makeChar(diseases);
  const updateCharacter = vi.fn();
  render(<DiseasePanel character={character} updateCharacter={updateCharacter} onRoll={vi.fn()} />);
  return { character, updateCharacter };
}

function expandRow(name: string) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`Toggle ${name} details`, 'i') }));
}

function openGuide(name: string) {
  expandRow(name);
  fireEvent.click(screen.getByTestId('guided-disease-trigger'));
}

function guideDialog() {
  return screen.getByRole('dialog', { name: 'Guide me through this disease' });
}

const ratteFever: ActiveDisease = { id: 1, diseaseName: 'Ratte Fever', contracted: 1000, notes: '' };
const gallopingTrots: ActiveDisease = { id: 2, diseaseName: 'Galloping Trots', contracted: 1000, notes: '' };

describe('GuidedDiseasePanel — opt-in default off (AC-1 / Finding 9)', () => {
  it('renders no overlay and no trigger until a row is expanded', () => {
    renderPanel([ratteFever]);
    expect(screen.queryByRole('dialog', { name: 'Guide me through this disease' })).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('guided-disease-trigger')).toHaveLength(0);
  });

  it('each expanded active-disease row renders exactly one trigger (count equals rendered rows)', () => {
    renderPanel([ratteFever, gallopingTrots]);
    // Rows expand one at a time; each expanded row shows exactly one trigger.
    expandRow('Ratte Fever');
    expect(screen.getAllByTestId('guided-disease-trigger')).toHaveLength(1);
    expandRow('Galloping Trots');
    expect(screen.getAllByTestId('guided-disease-trigger')).toHaveLength(1);
  });
});

describe('GuidedDiseasePanel — open / bind / step order (AC-2 / AC-5)', () => {
  it('opens bound to the disease at Step 1 Overview', () => {
    renderPanel([ratteFever]);
    openGuide('Ratte Fever');
    const dialog = guideDialog();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const heading = within(dialog).getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent(/Step 1 of 3: Disease overview/);
  });

  it('presents exactly, in order: Overview -> Symptoms -> Duration', () => {
    renderPanel([ratteFever]);
    openGuide('Ratte Fever');
    const heading = () => within(guideDialog()).getByRole('heading', { level: 2 });
    expect(heading()).toHaveTextContent(/Step 1 of 3: Disease overview/);
    fireEvent.click(screen.getByTestId('guided-disease-next'));
    expect(heading()).toHaveTextContent(/Step 2 of 3: Resolve the symptoms/);
    fireEvent.click(screen.getByTestId('guided-disease-next'));
    expect(heading()).toHaveTextContent(/Step 3 of 3: Duration & outcome/);
  });

  it('Overview cites Core p.186 and shows the disease timings', () => {
    renderPanel([ratteFever]);
    openGuide('Ratte Fever');
    const dialog = guideDialog();
    expect(within(dialog).getByText(/Core p\.186/)).toBeInTheDocument();
    // Ratte Fever: Incubation 3d10+5 days, Duration 3d10+10 days (Core p.186).
    expect(within(dialog).getByText('3d10+5 days')).toBeInTheDocument();
    expect(within(dialog).getByText('3d10+10 days')).toBeInTheDocument();
  });
});

describe('GuidedDiseasePanel — reset/rebind on a different disease (AC-2)', () => {
  it('opening the guide for a different disease rebinds to Step 1', () => {
    renderPanel([ratteFever, gallopingTrots]);
    openGuide('Ratte Fever');
    // advance to Step 2
    fireEvent.click(screen.getByTestId('guided-disease-next'));
    expect(within(guideDialog()).getByRole('heading', { level: 2 })).toHaveTextContent(/Step 2 of 3/);
    // close via backdrop, then open the other disease
    fireEvent.click(screen.getByTestId('guided-disease-backdrop'));
    openGuide('Galloping Trots');
    expect(within(guideDialog()).getByRole('heading', { level: 2 })).toHaveTextContent(/Step 1 of 3/);
  });
});
