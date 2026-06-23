import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CombatDashboard } from '../CombatDashboard';
import { BLANK_CHARACTER } from '../../../types/character';
import type { CombatState } from '../../../types/character';

/**
 * Group Advantage display and toggle tests
 * Validates: Requirements 2.1, 3.1, 3.2
 */

const defaultCombatState: CombatState = {
  inCombat: true,
  initiative: 5,
  currentRound: 1,
  engaged: false,
  surprised: false,
};

function getDefaultProps() {
  return {
    wCur: 10,
    totalWounds: 12,
    advantage: 1,
    combatState: defaultCombatState,
    conditions: [],
    fortune: 2,
    fate: 3,
    resolve: 1,
    resilience: 2,
    inCombat: true,
    onUpdateWounds: vi.fn(),
    onUpdateAdvantage: vi.fn(),
    onUpdateRound: vi.fn(),
    onToggleEngaged: vi.fn(),
    onRemoveCondition: vi.fn(),
    onSpendFortune: vi.fn(),
    onSpendResolve: vi.fn(),
    onOpenConditionPicker: vi.fn(),
  };
}

describe('CombatDashboard Group Advantage display', () => {
  describe('Requirement 3.1: Shows "Advantage" when useGroupAdvantage is false', () => {
    it('displays "Advantage" label when useGroupAdvantage is false', () => {
      render(<CombatDashboard {...getDefaultProps()} useGroupAdvantage={false} />);

      expect(screen.getByText('Advantage')).toBeInTheDocument();
      expect(screen.queryByText('Group Advantage')).not.toBeInTheDocument();
    });

    it('displays "Advantage" label when useGroupAdvantage is undefined', () => {
      render(<CombatDashboard {...getDefaultProps()} />);

      expect(screen.getByText('Advantage')).toBeInTheDocument();
      expect(screen.queryByText('Group Advantage')).not.toBeInTheDocument();
    });
  });

  describe('Requirement 3.2: Shows "Group Advantage" when useGroupAdvantage is true', () => {
    it('displays "Group Advantage" label when useGroupAdvantage is true', () => {
      render(<CombatDashboard {...getDefaultProps()} useGroupAdvantage={true} />);

      expect(screen.getByText('Group Advantage')).toBeInTheDocument();
      expect(screen.queryByText(/^Advantage$/)).not.toBeInTheDocument();
    });
  });
});

describe('BLANK_CHARACTER Group Advantage default', () => {
  describe('Requirement 2.1: useGroupAdvantage defaults to false', () => {
    it('BLANK_CHARACTER.houseRules.useGroupAdvantage is false', () => {
      expect(BLANK_CHARACTER.houseRules.useGroupAdvantage).toBe(false);
    });
  });
});
