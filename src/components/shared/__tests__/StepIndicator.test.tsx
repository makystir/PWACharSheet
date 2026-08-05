import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StepIndicator } from '../../combat/StepIndicator';

const steps = ['Weapon', 'Roll', 'Damage', 'Result'];

describe('StepIndicator', () => {
  it('renders all step labels', () => {
    render(<StepIndicator steps={steps} currentStep={0} />);
    for (const step of steps) {
      expect(screen.getByText(step)).toBeInTheDocument();
    }
  });

  it('marks the current step with aria-current="step"', () => {
    render(<StepIndicator steps={steps} currentStep={1} />);
    const currentDots = screen.getAllByRole('group')[0]
      .querySelectorAll('[aria-current="step"]');
    expect(currentDots).toHaveLength(1);
  });

  it('renders with role="group" and step progress label', () => {
    render(<StepIndicator steps={steps} currentStep={2} />);
    expect(screen.getByRole('group', { name: 'Step progress' })).toBeInTheDocument();
  });

  it('renders completed steps before current step', () => {
    const { container } = render(<StepIndicator steps={steps} currentStep={2} />);
    // Steps 0 and 1 should be completed (no aria-current), step 2 current
    const allDots = container.querySelectorAll('[aria-current="step"]');
    expect(allDots).toHaveLength(1);
  });

  it('renders all steps when currentStep is 0 (first step is current)', () => {
    const { container } = render(<StepIndicator steps={steps} currentStep={0} />);
    const currentDots = container.querySelectorAll('[aria-current="step"]');
    expect(currentDots).toHaveLength(1);
  });

  it('renders with last step as current', () => {
    const { container } = render(<StepIndicator steps={steps} currentStep={3} />);
    const currentDots = container.querySelectorAll('[aria-current="step"]');
    expect(currentDots).toHaveLength(1);
    // All labels should still render
    expect(screen.getByText('Result')).toBeInTheDocument();
  });
});
