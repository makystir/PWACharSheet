import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DropIndicator } from '../DropIndicator';
import { AriaLiveAnnouncer } from '../AriaLiveAnnouncer';

describe('DropIndicator', () => {
  it('renders a div with the indicator class when visible={true}', () => {
    const { container } = render(<DropIndicator visible={true} />);
    const indicator = container.firstChild as HTMLElement;
    expect(indicator).toBeInTheDocument();
    expect(indicator.tagName).toBe('DIV');
    expect(indicator.className).toMatch(/indicator/);
  });

  it('renders a hidden div when visible={false}', () => {
    const { container } = render(<DropIndicator visible={false} />);
    const el = container.firstChild as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el.tagName).toBe('DIV');
    expect(el.className).toMatch(/indicatorHidden/);
  });
});

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
