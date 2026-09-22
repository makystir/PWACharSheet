import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AriaLiveAnnouncer } from '../AriaLiveAnnouncer';

describe('AriaLiveAnnouncer', () => {
  it('renders a div with aria-live="assertive" and role="status"', () => {
    render(<AriaLiveAnnouncer message="Sword moved to position 3 of 5" />);
    const region = screen.getByRole('status');
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute('aria-live', 'assertive');
  });

  it('contains the message text', () => {
    render(<AriaLiveAnnouncer message="Item moved to position 2 of 4" />);
    expect(screen.getByText('Item moved to position 2 of 4')).toBeInTheDocument();
  });

  it('is visually hidden', () => {
    render(<AriaLiveAnnouncer message="Test message" />);
    const region = screen.getByRole('status');
    const style = region.style;
    expect(style.position).toBe('absolute');
    expect(style.width).toBe('1px');
    expect(style.height).toBe('1px');
    expect(style.overflow).toBe('hidden');
  });
});
