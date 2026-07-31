import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnterpriseEventRoller } from '../EnterpriseEventRoller';
import type { EnterpriseType } from '../../../types/character';
import type { EnterpriseEventResult } from '../../../data/enterprise-events';

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

const lastResult: EnterpriseEventResult = {
  roll: 73,
  title: 'Desperate Customer',
  description: 'A customer has urgent need...',
};

describe('EnterpriseEventRoller', () => {
  const onRoll = vi.fn();
  const onDismiss = vi.fn();

  beforeEach(() => {
    onRoll.mockClear();
    onDismiss.mockClear();
  });

  it('renders "Roll Event" button when no last result', () => {
    render(
      <EnterpriseEventRoller
        enterprise={mockEnterprise}
        onRoll={onRoll}
        lastResult={null}
        onDismiss={onDismiss}
      />
    );
    expect(screen.getByText('Roll Event')).toBeInTheDocument();
    // No result card visible
    expect(screen.queryByText('Desperate Customer')).not.toBeInTheDocument();
  });

  it('when lastResult is provided, displays roll number, title, and description', () => {
    render(
      <EnterpriseEventRoller
        enterprise={mockEnterprise}
        onRoll={onRoll}
        lastResult={lastResult}
        onDismiss={onDismiss}
      />
    );
    expect(screen.getByText('Roll: 73')).toBeInTheDocument();
    expect(screen.getByText('Desperate Customer')).toBeInTheDocument();
    expect(screen.getByText('A customer has urgent need...')).toBeInTheDocument();
  });

  it('clicking "Dismiss" calls onDismiss', () => {
    render(
      <EnterpriseEventRoller
        enterprise={mockEnterprise}
        onRoll={onRoll}
        lastResult={lastResult}
        onDismiss={onDismiss}
      />
    );
    fireEvent.click(screen.getByLabelText('Dismiss event result'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('clicking "Roll Event" calls onRoll with a valid result', () => {
    render(
      <EnterpriseEventRoller
        enterprise={mockEnterprise}
        onRoll={onRoll}
        lastResult={null}
        onDismiss={onDismiss}
      />
    );
    fireEvent.click(screen.getByText('Roll Event'));
    expect(onRoll).toHaveBeenCalledTimes(1);
    const result = onRoll.mock.calls[0][0] as EnterpriseEventResult;
    expect(result.roll).toBeGreaterThanOrEqual(1);
    expect(result.roll).toBeLessThanOrEqual(100);
    expect(result.title).toBeTruthy();
    expect(result.description).toBeTruthy();
  });
});
