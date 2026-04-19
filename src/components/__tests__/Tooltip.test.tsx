import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Tooltip } from '../shared/Tooltip';

let anchor: HTMLElement;

beforeEach(() => {
  anchor = document.createElement('button');
  anchor.textContent = 'Trigger';
  // Position the anchor in the middle of the viewport for positioning tests
  anchor.getBoundingClientRect = () => ({
    top: 200,
    bottom: 230,
    left: 300,
    right: 400,
    width: 100,
    height: 30,
    x: 300,
    y: 200,
    toJSON: () => ({}),
  });
  document.body.appendChild(anchor);
});

afterEach(() => {
  anchor.remove();
});

const defaultProps = {
  anchorEl: null as unknown as HTMLElement,
  title: 'Athletics',
  children: <p>A test description</p>,
  onClose: vi.fn(),
  id: 'tooltip-athletics',
};

function renderTooltip(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, anchorEl: anchor, ...overrides };
  return render(<Tooltip {...props} />);
}

describe('Tooltip ARIA and rendering', () => {
  it('renders with role="tooltip" and the correct id', () => {
    renderTooltip();
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveAttribute('id', 'tooltip-athletics');
  });

  it('displays the title text', () => {
    renderTooltip({ title: 'Melee (Basic)' });
    expect(screen.getByText('Melee (Basic)')).toBeInTheDocument();
  });

  it('displays children content', () => {
    renderTooltip({ children: <span>Skill description here</span> });
    expect(screen.getByText('Skill description here')).toBeInTheDocument();
  });

  it('has tabIndex={-1} for programmatic focus', () => {
    renderTooltip();
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveAttribute('tabindex', '-1');
  });

  it('receives focus on mount', () => {
    renderTooltip();
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveFocus();
  });
});

describe('Tooltip dismiss behavior', () => {
  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    renderTooltip({ onClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when mousedown occurs outside the tooltip', () => {
    const onClose = vi.fn();
    renderTooltip({ onClose });
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose when mousedown occurs inside the tooltip', () => {
    const onClose = vi.fn();
    renderTooltip({ onClose });
    const tooltip = screen.getByRole('tooltip');
    fireEvent.mouseDown(tooltip);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('Tooltip positioning', () => {
  it('positions below the anchor by default', () => {
    // Anchor bottom is 230, gap is 6, so top should be 236
    renderTooltip();
    const tooltip = screen.getByRole('tooltip');
    const top = parseFloat(tooltip.style.top);
    expect(top).toBeGreaterThan(230);
  });
});
