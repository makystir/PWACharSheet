import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToggleSwitch } from '../ToggleSwitch';

describe('ToggleSwitch', () => {
  it('renders with role="switch" and aria-checked=false when off', () => {
    render(<ToggleSwitch checked={false} onChange={() => {}} label="Test toggle" />);
    const button = screen.getByRole('switch');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-checked', 'false');
  });

  it('renders with aria-checked=true when on', () => {
    render(<ToggleSwitch checked={true} onChange={() => {}} label="Test toggle" />);
    const button = screen.getByRole('switch');
    expect(button).toHaveAttribute('aria-checked', 'true');
  });

  it('has correct aria-label', () => {
    render(<ToggleSwitch checked={false} onChange={() => {}} label="Enable feature" />);
    const button = screen.getByRole('switch');
    expect(button).toHaveAttribute('aria-label', 'Enable feature');
  });

  it('calls onChange with true when clicked while off', () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} label="Test toggle" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange with false when clicked while on', () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={true} onChange={onChange} label="Test toggle" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('activates on Space key press', () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} label="Test toggle" />);
    fireEvent.keyDown(screen.getByRole('switch'), { key: ' ' });
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('activates on Enter key press', () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={true} onChange={onChange} label="Test toggle" />);
    fireEvent.keyDown(screen.getByRole('switch'), { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('does not call onChange when disabled and clicked', () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} label="Test toggle" disabled />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not call onChange when disabled and Space pressed', () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} label="Test toggle" disabled />);
    fireEvent.keyDown(screen.getByRole('switch'), { key: ' ' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('has disabled attribute when disabled prop is true', () => {
    render(<ToggleSwitch checked={false} onChange={() => {}} label="Test toggle" disabled />);
    expect(screen.getByRole('switch')).toBeDisabled();
  });
});
