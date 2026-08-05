import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SectionGroup } from '../SectionGroup';

describe('SectionGroup', () => {
  it('renders children inside a section element', () => {
    render(
      <SectionGroup>
        <p>Child content</p>
      </SectionGroup>
    );
    const section = screen.getByText('Child content').closest('section');
    expect(section).toBeInTheDocument();
  });

  it('applies the sectionGroup CSS module class', () => {
    const { container } = render(
      <SectionGroup>
        <span>Test</span>
      </SectionGroup>
    );
    const section = container.querySelector('section');
    expect(section).toBeInTheDocument();
    // CSS modules add a hash, but the class should contain the base name
    expect(section!.className).toContain('sectionGroup');
  });

  it('appends optional className prop', () => {
    const { container } = render(
      <SectionGroup className="custom-class">
        <span>Test</span>
      </SectionGroup>
    );
    const section = container.querySelector('section');
    expect(section!.className).toContain('custom-class');
  });

  it('renders multiple children', () => {
    render(
      <SectionGroup>
        <p>First</p>
        <p>Second</p>
        <p>Third</p>
      </SectionGroup>
    );
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
  });
});
