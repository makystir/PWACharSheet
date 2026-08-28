import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DiseasePanel } from '../DiseasePanel';
import { BLANK_CHARACTER } from '../../../types/character';
import type { ActiveDisease } from '../../../logic/diseases';
import { DISEASE_REGISTRY } from '../../../data/diseases';

function makeCharacterWithDiseases(diseases: ActiveDisease[] = []) {
  return { ...BLANK_CHARACTER, diseases };
}

describe('DiseasePanel', () => {
  // **Validates: Requirements 6.2**
  it('renders empty state when no diseases are present', () => {
    const updateCharacter = vi.fn();
    render(
      <DiseasePanel character={makeCharacterWithDiseases([])} updateCharacter={updateCharacter} />
    );

    expect(screen.getByText('No Diseases')).toBeInTheDocument();
  });

  // **Validates: Requirements 6.3**
  it('opens picker with 9 diseases when Add Disease button is clicked', async () => {
    const user = userEvent.setup();
    const updateCharacter = vi.fn();
    render(
      <DiseasePanel character={makeCharacterWithDiseases([])} updateCharacter={updateCharacter} />
    );

    await user.click(screen.getByRole('button', { name: /Add Disease/i }));

    // Picker dialog should be visible
    expect(screen.getByRole('dialog', { name: 'Add Disease' })).toBeInTheDocument();

    // All 9 diseases should appear as selectable buttons
    for (const entry of DISEASE_REGISTRY) {
      expect(screen.getByRole('button', { name: entry.name })).toBeInTheDocument();
    }
    // Verify exactly 9
    expect(DISEASE_REGISTRY).toHaveLength(9);
  });

  // **Validates: Requirements 6.3**
  it('selecting a disease from picker calls updateCharacter with a mutator that adds the disease', async () => {
    const user = userEvent.setup();
    const updateCharacter = vi.fn();
    render(
      <DiseasePanel character={makeCharacterWithDiseases([])} updateCharacter={updateCharacter} />
    );

    await user.click(screen.getByRole('button', { name: /Add Disease/i }));
    await user.click(screen.getByRole('button', { name: 'Blood Rot' }));

    expect(updateCharacter).toHaveBeenCalledTimes(1);

    // Extract the mutator and test it
    const mutator = updateCharacter.mock.calls[0][0];
    const baseCharacter = makeCharacterWithDiseases([]);
    const result = mutator(baseCharacter);

    expect(result.diseases).toHaveLength(1);
    expect(result.diseases[0].diseaseName).toBe('Blood Rot');
    expect(result.diseases[0].id).toBe(1);
    expect(result.diseases[0].notes).toBe('');
  });

  // **Validates: Requirements 6.4**
  it('tapping a disease entry expands its detail view', async () => {
    const user = userEvent.setup();
    const updateCharacter = vi.fn();
    const diseases: ActiveDisease[] = [
      { id: 1, diseaseName: 'Blood Rot', contracted: 1000, notes: '' },
    ];
    render(
      <DiseasePanel character={makeCharacterWithDiseases(diseases)} updateCharacter={updateCharacter} />
    );

    // Click the disease header to expand
    await user.click(screen.getByRole('button', { name: /Toggle Blood Rot details/i }));

    // Verify disease details are shown (Blood Rot, Core p.185)
    expect(screen.getByText('Contraction:')).toBeInTheDocument();
    expect(screen.getByText('Incubation:')).toBeInTheDocument();
    expect(screen.getByText('Instant')).toBeInTheDocument();
    expect(screen.getByText('Duration:')).toBeInTheDocument();
    expect(screen.getByText('1d10 days')).toBeInTheDocument();
    expect(screen.getByText('Symptoms')).toBeInTheDocument();
    // Severity tag is shown on the symptom display name
    expect(screen.getByText('Fever (Severe)')).toBeInTheDocument();
  });

  // **Validates: Requirements 6.5**
  it('remove button calls updateCharacter with a mutator that removes the disease', async () => {
    const user = userEvent.setup();
    const updateCharacter = vi.fn();
    const diseases: ActiveDisease[] = [
      { id: 1, diseaseName: 'Blood Rot', contracted: 1000, notes: '' },
    ];
    render(
      <DiseasePanel character={makeCharacterWithDiseases(diseases)} updateCharacter={updateCharacter} />
    );

    await user.click(screen.getByRole('button', { name: /Remove Blood Rot/i }));

    expect(updateCharacter).toHaveBeenCalledTimes(1);

    // Extract the mutator and test it
    const mutator = updateCharacter.mock.calls[0][0];
    const charWithDisease = makeCharacterWithDiseases(diseases);
    const result = mutator(charWithDisease);

    expect(result.diseases).toHaveLength(0);
  });

  // **Validates: Requirements 6.6, 8.2**
  it('notes textarea is editable and persists changes via updateCharacter', async () => {
    const user = userEvent.setup();
    const updateCharacter = vi.fn();
    const diseases: ActiveDisease[] = [
      { id: 1, diseaseName: 'Blood Rot', contracted: 1000, notes: '' },
    ];
    render(
      <DiseasePanel character={makeCharacterWithDiseases(diseases)} updateCharacter={updateCharacter} />
    );

    // Expand the disease to reveal notes textarea
    await user.click(screen.getByRole('button', { name: /Toggle Blood Rot details/i }));

    const notesTextarea = screen.getByLabelText('Notes');
    await user.type(notesTextarea, 'Caught from a rat');

    // updateCharacter should have been called for each character typed
    expect(updateCharacter).toHaveBeenCalled();

    // Check the last call's mutator updates notes correctly
    const lastCall = updateCharacter.mock.calls[updateCharacter.mock.calls.length - 1];
    const mutator = lastCall[0];
    const charWithDisease = makeCharacterWithDiseases(diseases);
    const result = mutator(charWithDisease);

    expect(result.diseases[0].notes).toBe('t');
  });

  // ── Rolling: Incubation / Duration ──────────────────────────────────────────

  it('rolls a disease Duration and persists the result via updateCharacter', async () => {
    const user = userEvent.setup();
    const updateCharacter = vi.fn();
    const diseases: ActiveDisease[] = [
      // Galloping Trots: Incubation 1d10 hours, Duration 1d10 days
      { id: 1, diseaseName: 'Galloping Trots', contracted: 1000, notes: '' },
    ];
    // Force d10 = 7 (Math.random * 10 → 6.x → +1 = 7)
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.65);

    render(<DiseasePanel character={makeCharacterWithDiseases(diseases)} updateCharacter={updateCharacter} />);
    await user.click(screen.getByRole('button', { name: /Toggle Galloping Trots details/i }));

    // The Duration row has a Roll button
    await user.click(screen.getByRole('button', { name: 'Roll 1d10 days' }));

    // The mutator persists a rolledDuration of 7 days
    const mutator = updateCharacter.mock.calls[updateCharacter.mock.calls.length - 1][0];
    const result = mutator(makeCharacterWithDiseases(diseases));
    expect(result.diseases[0].rolledDuration).toMatchObject({ total: 7, unit: 'days' });

    randSpy.mockRestore();
  });

  it('shows the persisted rolled duration value when present', async () => {
    const user = userEvent.setup();
    const diseases: ActiveDisease[] = [
      {
        id: 1, diseaseName: 'Galloping Trots', contracted: 1000, notes: '',
        rolledDuration: { total: 9, unit: 'days', breakdown: '1d10 → [9] = 9 days' },
      },
    ];
    render(<DiseasePanel character={makeCharacterWithDiseases(diseases)} updateCharacter={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Toggle Galloping Trots details/i }));
    expect(screen.getByText('= 9 days')).toBeInTheDocument();
  });

  it('does not show a roll control for an "Instant" incubation (Blood Rot)', async () => {
    const user = userEvent.setup();
    const diseases: ActiveDisease[] = [
      { id: 1, diseaseName: 'Blood Rot', contracted: 1000, notes: '' },
    ];
    render(<DiseasePanel character={makeCharacterWithDiseases(diseases)} updateCharacter={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Toggle Blood Rot details/i }));
    // Blood Rot incubation is "Instant" — no Roll button for it.
    expect(screen.queryByRole('button', { name: /Roll Instant/i })).not.toBeInTheDocument();
    // But its Duration (1d10 days) IS rollable.
    expect(screen.getByRole('button', { name: 'Roll 1d10 days' })).toBeInTheDocument();
  });

  // ── Rolling: Symptom Tests ──────────────────────────────────────────────────

  it('rolling a symptom Test calls onRoll and shows the outcome', async () => {
    const user = userEvent.setup();
    const onRoll = vi.fn();
    const diseases: ActiveDisease[] = [
      // Ratte Fever has Wounded (Easy Endurance Test) among its symptoms
      { id: 1, diseaseName: 'Ratte Fever', contracted: 1000, notes: '' },
    ];
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.1); // roll ≈ 11

    render(<DiseasePanel character={makeCharacterWithDiseases(diseases)} updateCharacter={vi.fn()} onRoll={onRoll} />);
    await user.click(screen.getByRole('button', { name: /Toggle Ratte Fever details/i }));

    // Click the Wounded symptom's Endurance Test button
    await user.click(screen.getByRole('button', { name: /Easy Endurance Test for Wounded/i }));

    expect(onRoll).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('symptom-roll-result-1')).toHaveTextContent(/Rolled 11 vs/i);

    randSpy.mockRestore();
  });

  // ── Elapsed in-game time tracking ───────────────────────────────────────────

  it('adds an in-game day via the elapsed stepper', async () => {
    const user = userEvent.setup();
    const updateCharacter = vi.fn();
    const diseases: ActiveDisease[] = [
      { id: 1, diseaseName: 'Galloping Trots', contracted: 1000, notes: '' },
    ];
    render(<DiseasePanel character={makeCharacterWithDiseases(diseases)} updateCharacter={updateCharacter} />);
    await user.click(screen.getByRole('button', { name: /Toggle Galloping Trots details/i }));

    await user.click(screen.getByRole('button', { name: /Add a day to Galloping Trots/i }));

    const mutator = updateCharacter.mock.calls[updateCharacter.mock.calls.length - 1][0];
    const result = mutator(makeCharacterWithDiseases(diseases));
    expect(result.diseases[0].elapsedDays).toBe(1);
  });

  it('shows elapsed vs rolled duration and a "Duration reached" indicator', async () => {
    const user = userEvent.setup();
    const diseases: ActiveDisease[] = [
      {
        id: 1, diseaseName: 'Galloping Trots', contracted: 1000, notes: '',
        elapsedDays: 5,
        rolledDuration: { total: 5, unit: 'days', breakdown: '1d10 → [5] = 5 days' },
      },
    ];
    render(<DiseasePanel character={makeCharacterWithDiseases(diseases)} updateCharacter={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Toggle Galloping Trots details/i }));

    expect(screen.getByTestId('disease-elapsed-1')).toHaveTextContent('5 / 5 days');
    expect(screen.getByTestId('duration-reached-1')).toBeInTheDocument();
  });

  it('disables the minus stepper at 0 elapsed days', async () => {
    const user = userEvent.setup();
    const diseases: ActiveDisease[] = [
      { id: 1, diseaseName: 'Galloping Trots', contracted: 1000, notes: '' },
    ];
    render(<DiseasePanel character={makeCharacterWithDiseases(diseases)} updateCharacter={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Toggle Galloping Trots details/i }));
    expect(screen.getByRole('button', { name: /Subtract a day from Galloping Trots/i })).toBeDisabled();
  });

  it('Gangrene offers a Roll Location button that reports a hit location', async () => {
    const user = userEvent.setup();
    const diseases: ActiveDisease[] = [
      // The Black Plague includes Gangrene
      { id: 1, diseaseName: 'The Black Plague', contracted: 1000, notes: '' },
    ];
    // roll 1 → reversed 10 → Left Arm (per WFRP reversed-digit hit location table)
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    render(<DiseasePanel character={makeCharacterWithDiseases(diseases)} updateCharacter={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Toggle The Black Plague details/i }));

    await user.click(screen.getByRole('button', { name: /Roll Hit Location for Gangrene/i }));
    expect(screen.getByTestId('symptom-roll-result-1')).toHaveTextContent(/Left Arm \(fingers\)/i);

    randSpy.mockRestore();
  });
});
