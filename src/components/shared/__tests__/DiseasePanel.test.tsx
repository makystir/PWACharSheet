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

    // Verify disease details are shown
    expect(screen.getByText('Contraction:')).toBeInTheDocument();
    expect(screen.getByText('Infected Wound')).toBeInTheDocument();
    expect(screen.getByText('Incubation:')).toBeInTheDocument();
    expect(screen.getByText('Duration:')).toBeInTheDocument();
    // Both incubation and duration are "1d10 days" for Blood Rot
    expect(screen.getAllByText('1d10 days')).toHaveLength(2);
    expect(screen.getByText('Symptoms')).toBeInTheDocument();
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
});
