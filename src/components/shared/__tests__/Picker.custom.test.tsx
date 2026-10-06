import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Picker } from '../Picker';

/**
 * The optional custom entry: with `onCustom`, text typed into the search box can
 * be used as-is when it names no item (e.g. a homebrew specialisation).
 */

const WINDS = ['Aqshy', 'Azyr'];

function renderPicker(onCustom?: (text: string) => void) {
  render(<Picker items={WINDS} getLabel={(w) => w} onSelect={vi.fn()} onCustom={onCustom} onClose={vi.fn()} title="Choose" />);
  return screen.getByPlaceholderText('Search...');
}

describe('Picker custom entry', () => {
  it('offers no custom row without onCustom', () => {
    const search = renderPicker();
    fireEvent.change(search, { target: { value: 'Homebrew Wind' } });
    expect(screen.queryByRole('button', { name: /^Use / })).toBeNull();
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('offers the typed text when it names no item and passes it trimmed', () => {
    const onCustom = vi.fn();
    const search = renderPicker(onCustom);
    fireEvent.change(search, { target: { value: '  Homebrew Wind ' } });
    expect(screen.queryByText('No items found')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Use “Homebrew Wind”' }));
    expect(onCustom).toHaveBeenCalledWith('Homebrew Wind');
  });

  it('shows the custom row beside partial matches', () => {
    const search = renderPicker(vi.fn());
    fireEvent.change(search, { target: { value: 'Az' } });
    expect(screen.getByRole('button', { name: 'Use “Az”' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Azyr' })).toBeInTheDocument();
  });

  it('hides the custom row while the search is empty or names an item', () => {
    const search = renderPicker(vi.fn());
    expect(screen.queryByRole('button', { name: /^Use / })).toBeNull();
    fireEvent.change(search, { target: { value: 'aqshy' } });
    expect(screen.queryByRole('button', { name: /^Use / })).toBeNull();
    expect(screen.getByRole('button', { name: 'Aqshy' })).toBeInTheDocument();
  });
});
