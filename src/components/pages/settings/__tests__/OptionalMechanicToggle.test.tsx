import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OptionalMechanicToggle } from '../OptionalMechanicToggle';
import type { OptionalMechanic } from '../optionalMechanics';

const sampleEntry: OptionalMechanic = {
  key: 'useEnterprises',
  label: 'Sample Label',
  description: 'Sample description',
  location: 'Somewhere → Some tab',
  category: 'Downtime & Activities',
};

describe('OptionalMechanicToggle', () => {
  it('renders label and description', () => {
    render(<OptionalMechanicToggle entry={sampleEntry} value={false} onToggle={() => {}} />);
    expect(screen.getByText('Sample Label')).toBeInTheDocument();
    expect(screen.getByText('Sample description')).toBeInTheDocument();
  });

  it('shows OFF with muted description and no location row when value is false', () => {
    render(<OptionalMechanicToggle entry={sampleEntry} value={false} onToggle={() => {}} />);
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('OFF');
    expect(button).toHaveAttribute('type', 'button');
    expect(screen.getByText('Sample description').style.color).toBe('var(--text-muted)');
    expect(screen.queryByText('Find it on: Somewhere → Some tab')).not.toBeInTheDocument();
  });

  it('shows ON with un-muted description and the location row when value is true', () => {
    render(<OptionalMechanicToggle entry={sampleEntry} value={true} onToggle={() => {}} />);
    expect(screen.getByRole('button')).toHaveTextContent('ON');
    expect(screen.getByText('Sample description').style.color).not.toBe('var(--text-muted)');
    expect(screen.getByText('Find it on: Somewhere → Some tab')).toBeInTheDocument();
  });

  it('calls onToggle when the button is clicked', () => {
    const onToggle = vi.fn();
    render(<OptionalMechanicToggle entry={sampleEntry} value={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
