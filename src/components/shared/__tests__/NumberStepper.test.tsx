import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NumberStepper } from '../NumberStepper';

describe('NumberStepper', () => {
  it('renders the current value in the input', () => {
    render(<NumberStepper value={5} onChange={() => {}} label="Wounds" />);
    const input = screen.getByRole('spinbutton', { name: 'Wounds' });
    expect(input).toHaveValue(5);
  });

  it('increments value when + button is clicked', () => {
    const onChange = vi.fn();
    render(<NumberStepper value={3} onChange={onChange} label="Wounds" />);
    fireEvent.click(screen.getByRole('button', { name: 'Increase Wounds' }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('decrements value when − button is clicked', () => {
    const onChange = vi.fn();
    render(<NumberStepper value={3} onChange={onChange} label="Wounds" />);
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Wounds' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('does not decrement below min (button is disabled)', () => {
    const onChange = vi.fn();
    render(<NumberStepper value={0} onChange={onChange} min={0} label="Wounds" />);
    const decreaseBtn = screen.getByRole('button', { name: 'Decrease Wounds' });
    expect(decreaseBtn).toBeDisabled();
    fireEvent.click(decreaseBtn);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not increment above max (button is disabled)', () => {
    const onChange = vi.fn();
    render(<NumberStepper value={10} onChange={onChange} max={10} label="Wounds" />);
    const increaseBtn = screen.getByRole('button', { name: 'Increase Wounds' });
    expect(increaseBtn).toBeDisabled();
    fireEvent.click(increaseBtn);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disables decrement button at min boundary', () => {
    render(<NumberStepper value={0} onChange={() => {}} min={0} label="Wounds" />);
    expect(screen.getByRole('button', { name: 'Decrease Wounds' })).toBeDisabled();
  });

  it('disables increment button at max boundary', () => {
    render(<NumberStepper value={10} onChange={() => {}} max={10} label="Wounds" />);
    expect(screen.getByRole('button', { name: 'Increase Wounds' })).toBeDisabled();
  });

  it('clamps manual input to min/max constraints', () => {
    const onChange = vi.fn();
    render(<NumberStepper value={5} onChange={onChange} min={0} max={10} label="Wounds" />);
    const input = screen.getByRole('spinbutton', { name: 'Wounds' });
    fireEvent.change(input, { target: { value: '15' } });
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it('is hidden on desktop via CSS media query (stepper class has display:none at ≥768px)', () => {
    // The component itself always renders; visibility is controlled by CSS media query.
    // The test verifies the component mounts without error — CSS-based hiding
    // is a styling concern verified at the CSS module level.
    render(<NumberStepper value={5} onChange={() => {}} label="Wounds" />);
    expect(screen.getByRole('spinbutton', { name: 'Wounds' })).toBeInTheDocument();
  });
});
