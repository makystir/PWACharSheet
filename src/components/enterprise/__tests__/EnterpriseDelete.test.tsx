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

describe('EnterpriseDelete', () => {
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

  it('renders "Delete Enterprise" button in detail view', () => {
    renderDetail();
    expect(screen.getByText('Delete Enterprise')).toBeInTheDocument();
  });

  it('clicking "Delete Enterprise" shows confirmation with enterprise name', () => {
    renderDetail();
    fireEvent.click(screen.getByText('Delete Enterprise'));
    // Confirmation prompt should mention the enterprise name
    expect(screen.getByText(/The Golden Goblet/)).toBeInTheDocument();
    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('clicking "Confirm Delete" calls updateCharacter to remove the enterprise and calls onBack', () => {
    renderDetail();
    fireEvent.click(screen.getByText('Delete Enterprise'));
    fireEvent.click(screen.getByText('Confirm Delete'));

    expect(updateCharacter).toHaveBeenCalledTimes(1);
    // Verify the mutator removes the enterprise
    const mutator = updateCharacter.mock.calls[0][0];
    const fakeChar = {
      enterprises: [mockEnterprise, { ...mockEnterprise, id: 'other-enterprise', name: 'Other' }],
    };
    const result = mutator(fakeChar);
    expect(result.enterprises).toHaveLength(1);
    expect(result.enterprises[0].id).toBe('other-enterprise');

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('clicking "Cancel" in confirmation hides the confirmation prompt', () => {
    renderDetail();
    fireEvent.click(screen.getByText('Delete Enterprise'));
    // Confirmation is visible
    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    // Confirmation should be hidden, delete button should be back
    expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
    expect(screen.getByText('Delete Enterprise')).toBeInTheDocument();
  });
});
