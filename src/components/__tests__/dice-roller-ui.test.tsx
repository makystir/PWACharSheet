import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { RollDialog } from '../shared/RollDialog';
import { RollResultDisplay } from '../shared/RollResultDisplay';
import { RollHistoryPanel } from '../shared/RollHistoryPanel';
import type { RollResult } from '../../logic/dice-roller';
import type { RollHistoryEntry } from '../../hooks/useRollHistory';

/** Build a mock RollResult with sensible defaults, overridable via partial. */
function mockRollResult(overrides: Partial<RollResult> = {}): RollResult {
  return {
    roll: 32,
    targetNumber: 45,
    baseTarget: 45,
    difficulty: 'Challenging',
    passed: true,
    sl: 1,
    isCritical: false,
    isFumble: false,
    isAutoSuccess: false,
    isAutoFailure: false,
    outcome: 'Marginal Success',
    skillOrCharName: 'Melee (Basic)',
    timestamp: Date.now(),
    ...overrides,
  };
}

// ─── 11.1 RollDialog renders with skill name, target, and difficulty defaulting to Challenging ───

describe('RollDialog — renders with skill name, target, and difficulty defaulting to Challenging', () => {
  it('displays the skill name as the dialog title', () => {
    render(
      <RollDialog
        skillOrCharName="Melee (Basic)"
        baseTarget={45}
        onRoll={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Melee (Basic)')).toBeInTheDocument();
  });

  it('displays the base target number', () => {
    render(
      <RollDialog
        skillOrCharName="Melee (Basic)"
        baseTarget={45}
        onRoll={vi.fn()}
        onClose={vi.fn()}
      />
    );
    // Both base target and modified target show "45" (Challenging = +0),
    // so verify at least one instance is present
    const matches = screen.getAllByText('45');
    expect(matches.length).toBeGreaterThanOrEqual(1);
    // Verify the "Base Target" label is present alongside the value
    expect(screen.getByText('Base Target')).toBeInTheDocument();
  });

  it('defaults the difficulty selector to "Challenging"', () => {
    render(
      <RollDialog
        skillOrCharName="Melee (Basic)"
        baseTarget={45}
        onRoll={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const select = screen.getByRole('combobox', { name: /difficulty/i });
    expect(select).toHaveValue('Challenging');
  });
});


// ─── 11.2 RollDialog difficulty selector contains all 7 difficulty levels ────

describe('RollDialog — difficulty selector contains all 7 difficulty levels', () => {
  it('contains all 7 WFRP 4e difficulty options', () => {
    render(
      <RollDialog
        skillOrCharName="Melee (Basic)"
        baseTarget={45}
        onRoll={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const select = screen.getByRole('combobox', { name: /difficulty/i });
    const options = Array.from(select.querySelectorAll('option'));

    expect(options).toHaveLength(7);

    const optionTexts = options.map((o) => o.textContent);
    expect(optionTexts).toContain('Very Easy (+60)');
    expect(optionTexts).toContain('Easy (+40)');
    expect(optionTexts).toContain('Average (+20)');
    expect(optionTexts).toContain('Challenging (+0)');
    expect(optionTexts).toContain('Difficult (-10)');
    expect(optionTexts).toContain('Hard (-20)');
    expect(optionTexts).toContain('Very Hard (-30)');
  });
});

// ─── 11.3 RollResultDisplay shows roll value, target, SL, and outcome description ───

describe('RollResultDisplay — shows roll value, target, SL, and outcome description', () => {
  const result = mockRollResult({
    roll: 32,
    targetNumber: 45,
    sl: 1,
    passed: true,
    outcome: 'Marginal Success',
    skillOrCharName: 'Dodge',
  });

  it('displays the d100 roll value', () => {
    render(<RollResultDisplay result={result} onClose={vi.fn()} />);
    expect(screen.getByText('32')).toBeInTheDocument();
  });

  it('displays the target number', () => {
    render(<RollResultDisplay result={result} onClose={vi.fn()} />);
    expect(screen.getByText(/Target:\s*45/)).toBeInTheDocument();
  });

  it('displays the SL with + prefix for positive values', () => {
    render(<RollResultDisplay result={result} onClose={vi.fn()} />);
    expect(screen.getByText(/SL \+1/)).toBeInTheDocument();
  });

  it('displays the outcome description', () => {
    render(<RollResultDisplay result={result} onClose={vi.fn()} />);
    expect(screen.getByText('Marginal Success')).toBeInTheDocument();
  });

  it('displays SL with - prefix for negative values', () => {
    const failResult = mockRollResult({
      roll: 78,
      targetNumber: 45,
      sl: -3,
      passed: false,
      outcome: 'Failure',
    });
    render(<RollResultDisplay result={failResult} onClose={vi.fn()} />);
    expect(screen.getByText(/SL -3/)).toBeInTheDocument();
  });
});

// ─── 11.4 RollResultDisplay shows Critical indicator when isCritical is true ───

describe('RollResultDisplay — Critical indicator', () => {
  it('shows "Critical" text when result.isCritical is true', () => {
    const critResult = mockRollResult({
      roll: 11,
      targetNumber: 45,
      sl: 3,
      passed: true,
      isCritical: true,
      outcome: 'Astounding Success',
    });
    render(<RollResultDisplay result={critResult} onClose={vi.fn()} />);
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('does not show "Critical" text when result.isCritical is false', () => {
    const normalResult = mockRollResult({ isCritical: false });
    render(<RollResultDisplay result={normalResult} onClose={vi.fn()} />);
    expect(screen.queryByText('Critical')).not.toBeInTheDocument();
  });
});

// ─── 11.5 RollResultDisplay shows Fumble indicator when isFumble is true ───

describe('RollResultDisplay — Fumble indicator', () => {
  it('shows "Fumble" text when result.isFumble is true', () => {
    const fumbleResult = mockRollResult({
      roll: 88,
      targetNumber: 45,
      sl: -4,
      passed: false,
      isFumble: true,
      outcome: 'Astounding Failure',
    });
    render(<RollResultDisplay result={fumbleResult} onClose={vi.fn()} />);
    expect(screen.getByText('Fumble')).toBeInTheDocument();
  });

  it('does not show "Fumble" text when result.isFumble is false', () => {
    const normalResult = mockRollResult({ isFumble: false });
    render(<RollResultDisplay result={normalResult} onClose={vi.fn()} />);
    expect(screen.queryByText('Fumble')).not.toBeInTheDocument();
  });
});


// ─── 11.6 RollResultDisplay opposed SL input calculates and displays net SL ───

describe('RollResultDisplay — opposed SL input calculates and displays net SL', () => {
  it('calculates and displays net SL and winner when opponent SL is entered', async () => {
    const result = mockRollResult({
      sl: 3,
      passed: true,
    });
    render(<RollResultDisplay result={result} onClose={vi.fn()} />);

    const input = screen.getByRole('spinbutton', { name: /opponent sl/i });
    await userEvent.clear(input);
    await userEvent.type(input, '1');

    // Net SL = 3 - 1 = +2
    expect(screen.getByText(/Net SL:\s*\+2/)).toBeInTheDocument();
    expect(screen.getByText('You win!')).toBeInTheDocument();
  });

  it('shows opponent wins when net SL is negative', async () => {
    const result = mockRollResult({
      sl: 1,
      passed: true,
    });
    render(<RollResultDisplay result={result} onClose={vi.fn()} />);

    const input = screen.getByRole('spinbutton', { name: /opponent sl/i });
    await userEvent.clear(input);
    await userEvent.type(input, '4');

    // Net SL = 1 - 4 = -3
    expect(screen.getByText(/Net SL:\s*-3/)).toBeInTheDocument();
    expect(screen.getByText('Opponent wins!')).toBeInTheDocument();
  });

  it('shows tie when net SL is zero', async () => {
    const result = mockRollResult({
      sl: 2,
      passed: true,
    });
    render(<RollResultDisplay result={result} onClose={vi.fn()} />);

    const input = screen.getByRole('spinbutton', { name: /opponent sl/i });
    await userEvent.clear(input);
    await userEvent.type(input, '2');

    // Net SL = 2 - 2 = 0
    expect(screen.getByText(/Net SL:\s*\+0/)).toBeInTheDocument();
    expect(screen.getByText('Tie!')).toBeInTheDocument();
  });
});

// ─── 11.7 RollHistoryPanel displays entries in order and clear button works ───

describe('RollHistoryPanel — displays entries and clear button works', () => {
  const entries: RollHistoryEntry[] = [
    {
      id: 3,
      result: mockRollResult({ skillOrCharName: 'Cool', roll: 88, targetNumber: 40, sl: -5, passed: false }),
    },
    {
      id: 2,
      result: mockRollResult({ skillOrCharName: 'Athletics', roll: 55, targetNumber: 60, sl: 1, passed: true }),
    },
    {
      id: 1,
      result: mockRollResult({ skillOrCharName: 'Dodge', roll: 10, targetNumber: 50, sl: 4, passed: true }),
    },
  ];

  it('displays entries in the order provided (reverse chronological) after expanding', () => {
    render(<RollHistoryPanel history={entries} onClear={vi.fn()} />);

    // Click the header to expand
    fireEvent.click(screen.getByRole('button', { name: /roll history/i }));

    const skillNames = screen.getAllByText(/Cool|Athletics|Dodge/);
    expect(skillNames[0]).toHaveTextContent('Cool');
    expect(skillNames[1]).toHaveTextContent('Athletics');
    expect(skillNames[2]).toHaveTextContent('Dodge');
  });

  it('shows "Clear History" button when entries exist and calls onClear when clicked', () => {
    const onClear = vi.fn();
    render(<RollHistoryPanel history={entries} onClear={onClear} />);

    // Expand the panel
    fireEvent.click(screen.getByRole('button', { name: /roll history/i }));

    const clearBtn = screen.getByRole('button', { name: /clear history/i });
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('shows entry count in the header', () => {
    render(<RollHistoryPanel history={entries} onClear={vi.fn()} />);
    expect(screen.getByText(/Roll History \(3\)/)).toBeInTheDocument();
  });

  it('shows "No rolls yet" when history is empty', () => {
    render(<RollHistoryPanel history={[]} onClear={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /roll history/i }));
    expect(screen.getByText('No rolls yet')).toBeInTheDocument();
  });
});
