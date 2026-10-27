import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GuidedCorruptionTrigger } from '../GuidedCorruptionTrigger';

/**
 * The opt-in "Guide me through corruption" trigger, mirroring
 * GuidedCastTrigger.test.tsx / GuidedDiseaseTrigger.test.tsx: renders a native
 * button with the right a11y affordances, calls onOpen, and stopPropagation
 * keeps the click from reaching a parent handler.
 */
describe('GuidedCorruptionTrigger', () => {
  it('renders an opt-in button with the correct a11y affordances', () => {
    const onOpen = vi.fn();
    render(<GuidedCorruptionTrigger onOpen={onOpen} />);
    const btn = screen.getByTestId('guided-corruption-trigger');
    expect(btn).toHaveAttribute('aria-label', 'Guide me through corruption');
  });

  it('onClick calls onOpen', () => {
    const onOpen = vi.fn();
    render(<GuidedCorruptionTrigger onOpen={onOpen} />);
    fireEvent.click(screen.getByTestId('guided-corruption-trigger'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('stopPropagation prevents a parent handler from firing', () => {
    const onOpen = vi.fn();
    const onParentClick = vi.fn();
    render(
      <div onClick={onParentClick}>
        <GuidedCorruptionTrigger onOpen={onOpen} />
      </div>,
    );
    fireEvent.click(screen.getByTestId('guided-corruption-trigger'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onParentClick).not.toHaveBeenCalled();
  });
});
