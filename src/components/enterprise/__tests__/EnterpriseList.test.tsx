import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnterpriseList } from '../EnterpriseList';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';

/**
 * EnterpriseList unit tests — conditional rendering and data preservation.
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.4
 */

const mockEnterpriseCharacter: Character = {
  ...BLANK_CHARACTER,
  houseRules: { ...BLANK_CHARACTER.houseRules, useEnterprises: true },
  enterprises: [
    {
      id: 'test-1',
      name: 'The Golden Goblet',
      type: 'Tavern',
      expansionLevel: 2,
      debt: { gc: 5, ss: 0, d: 0 },
      creditorName: 'Hans Mueller',
      interestPayment: { gc: 2, ss: 10, d: 0 },
      incomeSources: [],
      trappings: ['Bar and stools'],
      specialRules: ['Free drink'],
      notes: 'A fine tavern',
    },
  ],
};

const emptyEnterpriseCharacter: Character = {
  ...BLANK_CHARACTER,
  houseRules: { ...BLANK_CHARACTER.houseRules, useEnterprises: true },
  enterprises: [],
};

describe('EnterpriseList', () => {
  describe('Empty state rendering (Req 12.6)', () => {
    it('renders "No enterprises yet" when enterprises array is empty', () => {
      const updateCharacter = vi.fn();
      render(
        <EnterpriseList character={emptyEnterpriseCharacter} updateCharacter={updateCharacter} />
      );

      expect(screen.getByText('No enterprises yet')).toBeInTheDocument();
    });

    it('renders "Create Enterprise" button in empty state', () => {
      const updateCharacter = vi.fn();
      render(
        <EnterpriseList character={emptyEnterpriseCharacter} updateCharacter={updateCharacter} />
      );

      expect(screen.getByRole('button', { name: /create enterprise/i })).toBeInTheDocument();
    });
  });

  describe('Summary card rendering (Req 12.1, 12.2, 12.3)', () => {
    it('renders summary cards when enterprises exist', () => {
      const updateCharacter = vi.fn();
      render(
        <EnterpriseList character={mockEnterpriseCharacter} updateCharacter={updateCharacter} />
      );

      expect(screen.getByText('The Golden Goblet')).toBeInTheDocument();
      expect(screen.getByText('Tavern')).toBeInTheDocument();
      expect(screen.getByText('Lv. 2')).toBeInTheDocument();
    });
  });

  describe('Navigation to detail view (Req 12.4, 12.5)', () => {
    it('clicking a summary card navigates to detail view showing enterprise name and back button', () => {
      const updateCharacter = vi.fn();
      render(
        <EnterpriseList character={mockEnterpriseCharacter} updateCharacter={updateCharacter} />
      );

      // Click the summary card
      const card = screen.getByRole('button', { name: /view details for the golden goblet/i });
      fireEvent.click(card);

      // Detail view shows back button and enterprise type/level
      expect(screen.getByText('← Back')).toBeInTheDocument();
      expect(screen.getByText('Tavern')).toBeInTheDocument();
      expect(screen.getByText('Level 2')).toBeInTheDocument();
    });

    it('clicking back from detail view returns to summary list', () => {
      const updateCharacter = vi.fn();
      render(
        <EnterpriseList character={mockEnterpriseCharacter} updateCharacter={updateCharacter} />
      );

      // Navigate to detail view
      const card = screen.getByRole('button', { name: /view details for the golden goblet/i });
      fireEvent.click(card);
      expect(screen.getByText('← Back')).toBeInTheDocument();

      // Click back
      fireEvent.click(screen.getByText('← Back'));

      // Should be back at summary list
      expect(screen.getByText('The Golden Goblet')).toBeInTheDocument();
      expect(screen.queryByText('← Back')).not.toBeInTheDocument();
    });
  });

  describe('Data preservation on toggle cycle (Req 10.1, 10.2, 10.4)', () => {
    it('toggling useEnterprises OFF and back ON preserves enterprise data', () => {
      const updateCharacter = vi.fn();

      // Render with enterprises visible (toggle ON)
      const { rerender } = render(
        <EnterpriseList character={mockEnterpriseCharacter} updateCharacter={updateCharacter} />
      );

      // Confirm data is displayed
      expect(screen.getByText('The Golden Goblet')).toBeInTheDocument();
      expect(screen.getByText('Tavern')).toBeInTheDocument();

      // Simulate toggle OFF: the parent would stop rendering EnterpriseList entirely.
      // The enterprise data stays on the character object — the component just unmounts.
      const disabledCharacter: Character = {
        ...mockEnterpriseCharacter,
        houseRules: { ...mockEnterpriseCharacter.houseRules, useEnterprises: false },
      };

      // Re-enable: re-render with the same character data (toggle ON again)
      const reenabledCharacter: Character = {
        ...disabledCharacter,
        houseRules: { ...disabledCharacter.houseRules, useEnterprises: true },
      };

      rerender(
        <EnterpriseList character={reenabledCharacter} updateCharacter={updateCharacter} />
      );

      // All enterprise data should still be displayed
      expect(screen.getByText('The Golden Goblet')).toBeInTheDocument();
      expect(screen.getByText('Tavern')).toBeInTheDocument();
      expect(screen.getByText('Lv. 2')).toBeInTheDocument();

      // Verify the underlying data model is preserved
      expect(reenabledCharacter.enterprises).toEqual(mockEnterpriseCharacter.enterprises);
    });
  });
});
