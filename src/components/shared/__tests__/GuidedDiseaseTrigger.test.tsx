import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GuidedDiseaseTrigger } from '../GuidedDiseaseTrigger';

/**
 * The opt-in "Guide me through this disease" trigger, mirroring
 * GuidedCastTrigger.test.tsx: renders a native button with the right a11y
 * affordances, calls onOpen with its diseaseId, and stopPropagation keeps the
 * click from toggling the parent disease row.
 */
describe('GuidedDiseaseTrigger', () => {
  it('renders an opt-in button with the correct a11y affordances', () => {
    const onOpen = vi.fn();
    render(<GuidedDiseaseTrigger diseaseId={3} onOpen={onOpen} />);
    const btn = screen.getByTestId('guided-disease-trigger');
    expect(btn).toHaveAttribute('aria-label', 'Guide me through this disease');
  });

  it('onClick calls onOpen with the bound diseaseId', () => {
    const onOpen = vi.fn();
    render(<GuidedDiseaseTrigger diseaseId={7} onOpen={onOpen} />);
    fireEvent.click(screen.getByTestId('guided-disease-trigger'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(7);
  });

  it('stopPropagation prevents the parent row handler from firing', () => {
    const onOpen = vi.fn();
    const onParentClick = vi.fn();
    render(
      <div onClick={onParentClick}>
        <GuidedDiseaseTrigger diseaseId={1} onOpen={onOpen} />
      </div>,
    );
    fireEvent.click(screen.getByTestId('guided-disease-trigger'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onParentClick).not.toHaveBeenCalled();
  });
});
