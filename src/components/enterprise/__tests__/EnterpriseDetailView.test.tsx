import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnterpriseDetailView } from '../EnterpriseDetailView';
import type { EnterpriseType } from '../../../types/character';

const mockEnterprise = {
  id: 'test-1',
  name: 'The Golden Goblet',
  type: 'Tavern' as EnterpriseType,
  expansionLevel: 2,
  debt: { gc: 5, ss: 0, d: 0 },
  creditorName: 'Hans Mueller',
  interestPayment: { gc: 2, ss: 10, d: 0 },
  incomeSources: [],
  trappings: ['Bar and stools'],
  specialRules: ['Free drink'],
  notes: 'A fine tavern',
};

describe('EnterpriseDetailView', () => {
  const updateCharacter = vi.fn();
  const onBack = vi.fn();

  function renderDetail() {
    return render(
      <EnterpriseDetailView
        enterprise={mockEnterprise}
        enterpriseIndex={0}
        updateCharacter={updateCharacter}
        onBack={onBack}
      />
    );
  }

  beforeEach(() => {
    updateCharacter.mockClear();
    onBack.mockClear();
  });

  it('renders the enterprise name, type badge, and expansion level', () => {
    renderDetail();
    // Name field should show the enterprise name
    const nameInput = screen.getByDisplayValue('The Golden Goblet');
    expect(nameInput).toBeInTheDocument();
    // Type badge
    expect(screen.getByText('Tavern')).toBeInTheDocument();
    // Expansion level badge
    expect(screen.getByText('Level 2')).toBeInTheDocument();
  });

  it('editing the name field and blurring calls updateCharacter with the new name', () => {
    renderDetail();
    const nameInput = screen.getByDisplayValue('The Golden Goblet');
    fireEvent.change(nameInput, { target: { value: 'The Silver Stein' } });
    fireEvent.blur(nameInput);
    expect(updateCharacter).toHaveBeenCalledTimes(1);
    // Verify the mutator produces the expected change
    const mutator = updateCharacter.mock.calls[0][0];
    const fakeChar = {
      enterprises: [{ ...mockEnterprise }],
    };
    const result = mutator(fakeChar);
    expect(result.enterprises[0].name).toBe('The Silver Stein');
  });

  it('editing debt GC field with non-numeric value sanitizes to 0', () => {
    renderDetail();
    const debtGcInput = screen.getByLabelText('Debt gold crowns');
    fireEvent.change(debtGcInput, { target: { value: 'abc' } });
    fireEvent.blur(debtGcInput);
    expect(updateCharacter).toHaveBeenCalled();
    const mutator = updateCharacter.mock.calls[0][0];
    const fakeChar = {
      enterprises: [{ ...mockEnterprise }],
    };
    const result = mutator(fakeChar);
    expect(result.enterprises[0].debt.gc).toBe(0);
  });

  it('editing debt field and blurring persists the new value via updateCharacter', () => {
    renderDetail();
    const debtGcInput = screen.getByLabelText('Debt gold crowns');
    fireEvent.change(debtGcInput, { target: { value: '42' } });
    fireEvent.blur(debtGcInput);
    expect(updateCharacter).toHaveBeenCalled();
    const mutator = updateCharacter.mock.calls[0][0];
    const fakeChar = {
      enterprises: [{ ...mockEnterprise }],
    };
    const result = mutator(fakeChar);
    expect(result.enterprises[0].debt.gc).toBe(42);
  });

  it('shows "Level {N}" in the header area', () => {
    renderDetail();
    expect(screen.getByText('Level 2')).toBeInTheDocument();
  });
});
