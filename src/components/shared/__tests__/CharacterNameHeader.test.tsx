import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { CharacterNameHeader } from '../CharacterNameHeader';

// Mock CSS modules to expose class names for assertions
vi.mock('../CharacterNameHeader.module.css', () => ({
  default: {
    header: 'header',
    name: 'name',
    chevron: 'chevron',
  },
}));

describe('CharacterNameHeader', () => {
  const defaultProps = {
    characterName: 'Brünhilde the Bold',
    onOpen: vi.fn(),
  };

  // **Validates: Requirements 1.1**
  it('renders the character name text', () => {
    render(<CharacterNameHeader {...defaultProps} />);

    expect(screen.getByText('Brünhilde the Bold')).toBeInTheDocument();
  });

  // **Validates: Requirements 1.1**
  it('applies the truncation CSS module class to the name span', () => {
    render(<CharacterNameHeader {...defaultProps} />);

    const nameSpan = screen.getByText('Brünhilde the Bold');
    expect(nameSpan).toHaveClass('name');
    expect(nameSpan.tagName).toBe('SPAN');
  });

  // **Validates: Requirements 1.4**
  it('renders a ChevronDown icon (svg element)', () => {
    render(<CharacterNameHeader {...defaultProps} />);

    const button = screen.getByRole('button');
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  // **Validates: Requirements 1.3**
  it('calls onOpen callback when the button is clicked', async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();

    render(<CharacterNameHeader characterName="Test" onOpen={onOpen} />);

    await user.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  // **Validates: Requirements 1.6**
  it('has aria-label="Character management" on the button', () => {
    render(<CharacterNameHeader {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Character management');
  });

  // **Validates: Requirements 1.6**
  it('the button has role="button"', () => {
    render(<CharacterNameHeader {...defaultProps} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  // **Validates: Requirements 1.5**
  it('applies the header CSS module class (which includes the desktop-hiding media query)', () => {
    render(<CharacterNameHeader {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('header');
  });
});
