import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WhatsNewPanel, shouldShowWhatsNew } from '../WhatsNewPanel';

const entries = [
  { title: 'New Combat UI', description: 'Redesigned combat flow with step indicators.' },
  { title: 'Theme Updates', description: 'Improved contrast in all themes.' },
];

describe('WhatsNewPanel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the panel with version and entries', () => {
    render(<WhatsNewPanel version="2.1.0" entries={entries} onDismiss={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'What\'s New' })).toBeInTheDocument();
    expect(screen.getByText('v2.1.0')).toBeInTheDocument();
    expect(screen.getByText('New Combat UI')).toBeInTheDocument();
    expect(screen.getByText('Theme Updates')).toBeInTheDocument();
  });

  it('calls onDismiss and stores version in localStorage when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(<WhatsNewPanel version="2.1.0" entries={entries} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('ack-version')).toBe('2.1.0');
  });

  it('calls onDismiss when overlay background is clicked', () => {
    const onDismiss = vi.fn();
    render(<WhatsNewPanel version="2.1.0" entries={entries} onDismiss={onDismiss} />);
    // Click the overlay div directly (role="dialog" is on the overlay)
    fireEvent.click(screen.getByRole('dialog', { name: 'What\'s New' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('shouldShowWhatsNew', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns true when no version is stored', () => {
    expect(shouldShowWhatsNew('1.0.0')).toBe(true);
  });

  it('returns false when stored version matches current', () => {
    localStorage.setItem('ack-version', '1.0.0');
    expect(shouldShowWhatsNew('1.0.0')).toBe(false);
  });

  it('returns true when stored version does not match current', () => {
    localStorage.setItem('ack-version', '1.0.0');
    expect(shouldShowWhatsNew('2.0.0')).toBe(true);
  });

  it('returns true when localStorage throws (private browsing)', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(shouldShowWhatsNew('1.0.0')).toBe(true);
    spy.mockRestore();
  });

  it('handles localStorage.setItem error gracefully on dismiss', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const onDismiss = vi.fn();
    render(<WhatsNewPanel version="2.1.0" entries={entries} onDismiss={onDismiss} />);
    // Should not throw
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
