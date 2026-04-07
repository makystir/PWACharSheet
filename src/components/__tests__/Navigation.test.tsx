import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Navigation } from '../layout/Navigation';
import type { PageSection } from '../layout/Navigation';

// Property 1: Navigation section switching
// **Validates: Requirements 2.2, 2.3**
describe('Property 1: Navigation section switching', () => {
  const sections: PageSection[] = ['character', 'combat', 'estate', 'advancement', 'settings'];

  it('renders all five navigation sections', () => {
    const onPageChange = vi.fn();
    render(<Navigation activePage="character" onPageChange={onPageChange} />);

    expect(screen.getByText('Character')).toBeInTheDocument();
    expect(screen.getByText('Combat')).toBeInTheDocument();
    expect(screen.getByText('Estate')).toBeInTheDocument();
    expect(screen.getByText('Advancement')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it.each(sections)('clicking %s section calls onPageChange with correct id', (section) => {
    const onPageChange = vi.fn();
    render(<Navigation activePage="character" onPageChange={onPageChange} />);

    const label = section.charAt(0).toUpperCase() + section.slice(1);
    fireEvent.click(screen.getByText(label));
    expect(onPageChange).toHaveBeenCalledWith(section);
  });

  it.each(sections)('marks %s as active when it is the activePage', (section) => {
    const onPageChange = vi.fn();
    render(<Navigation activePage={section} onPageChange={onPageChange} />);

    const button = screen.getByRole('button', {
      name: new RegExp(section, 'i'),
    });
    expect(button).toHaveAttribute('aria-current', 'page');
  });

  it('only one section is marked active at a time', () => {
    const onPageChange = vi.fn();
    render(<Navigation activePage="combat" onPageChange={onPageChange} />);

    const buttons = screen.getAllByRole('button');
    const activeButtons = buttons.filter(
      (btn) => btn.getAttribute('aria-current') === 'page'
    );
    expect(activeButtons).toHaveLength(1);
    expect(activeButtons[0]).toHaveAttribute('data-section', 'combat');
  });

  it('displays character name when provided', () => {
    const onPageChange = vi.fn();
    render(
      <Navigation
        activePage="character"
        onPageChange={onPageChange}
        characterName="Brunhilde the Bold"
      />
    );

    expect(screen.getByText('Brunhilde the Bold')).toBeInTheDocument();
  });
});

// Property 2: Keyboard navigation switches sections
// **Validates: Requirements 2.6**
describe('Property 2: Keyboard navigation', () => {
  const shortcutMap: Array<{ key: string; section: PageSection }> = [
    { key: '1', section: 'character' },
    { key: '2', section: 'combat' },
    { key: '3', section: 'estate' },
    { key: '4', section: 'advancement' },
    { key: '5', section: 'settings' },
  ];

  it.each(shortcutMap)(
    'pressing "$key" switches to $section section',
    ({ key, section }) => {
      const onPageChange = vi.fn();
      render(<Navigation activePage="character" onPageChange={onPageChange} />);

      fireEvent.keyDown(window, { key });
      expect(onPageChange).toHaveBeenCalledWith(section);
    }
  );

  it('keyboard shortcut produces same result as clicking', () => {
    const onClickChange = vi.fn();
    const onKeyChange = vi.fn();

    const { unmount } = render(
      <Navigation activePage="character" onPageChange={onClickChange} />
    );
    fireEvent.click(screen.getByText('Combat'));
    unmount();

    render(<Navigation activePage="character" onPageChange={onKeyChange} />);
    fireEvent.keyDown(window, { key: '2' });

    expect(onClickChange).toHaveBeenCalledWith('combat');
    expect(onKeyChange).toHaveBeenCalledWith('combat');
  });

  it('does not trigger shortcuts when typing in an input', () => {
    const onPageChange = vi.fn();
    render(
      <div>
        <Navigation activePage="character" onPageChange={onPageChange} />
        <input data-testid="text-input" />
      </div>
    );

    const input = screen.getByTestId('text-input');
    fireEvent.keyDown(input, { key: '2' });
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('ignores non-shortcut keys', () => {
    const onPageChange = vi.fn();
    render(<Navigation activePage="character" onPageChange={onPageChange} />);

    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: '0' });
    fireEvent.keyDown(window, { key: '6' });
    expect(onPageChange).not.toHaveBeenCalled();
  });
});
