import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AssistantTrigger } from '../AssistantTrigger';

describe('AssistantTrigger', () => {
  it('renders a visible, usable trigger with no count when count is 0', () => {
    const open = vi.fn();
    render(<AssistantTrigger count={0} open={open} variant="desktop" buttonClassName="x" />);

    const button = screen.getByRole('button', { name: 'Assistant' });
    expect(button).toBeInTheDocument();
    // No number badge rendered at 0.
    expect(button).not.toHaveTextContent('0');

    fireEvent.click(button);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('announces the count in the accessible name and renders the number aria-hidden when > 0', () => {
    const open = vi.fn();
    render(<AssistantTrigger count={3} open={open} variant="desktop" buttonClassName="x" />);

    // Accessible name carries the count.
    const button = screen.getByRole('button', { name: 'Assistant, 3 suggestions' });
    expect(button).toBeInTheDocument();

    // The visible number is present but aria-hidden (not double-announced).
    const badge = screen.getByText('3');
    expect(badge).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows a visible label on desktop and hides it (icon-only) when collapsed', () => {
    const open = vi.fn();
    const { rerender } = render(
      <AssistantTrigger count={0} open={open} variant="desktop" buttonClassName="x" />,
    );
    expect(screen.getByText('Assistant')).toBeInTheDocument();

    rerender(<AssistantTrigger count={0} open={open} variant="collapsed" buttonClassName="x" />);
    // Collapsed: no text label, but still reachable via aria-label + title.
    const button = screen.getByRole('button', { name: 'Assistant' });
    expect(button).toHaveAttribute('title', 'Assistant');
    expect(button).not.toHaveTextContent('Assistant');
  });

  it('opens on touch end and suppresses the synthesized click on mobile', () => {
    const open = vi.fn();
    render(<AssistantTrigger count={2} open={open} variant="mobile" buttonClassName="x" />);

    const button = screen.getByRole('button', { name: 'Assistant, 2 suggestions' });
    const touchEnd = fireEvent.touchEnd(button);

    // preventDefault was called (fireEvent returns false when defaultPrevented).
    expect(touchEnd).toBe(false);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('never carries a navigation/page-change concern — only calls open()', () => {
    const open = vi.fn();
    render(<AssistantTrigger count={1} open={open} variant="desktop" buttonClassName="x" />);

    fireEvent.click(screen.getByRole('button', { name: 'Assistant, 1 suggestions' }));
    expect(open).toHaveBeenCalledTimes(1);
  });
});
